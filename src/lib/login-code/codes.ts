/**
 * One-time sign-in codes: request one, then trade it for a session.
 *
 * - 6 random digits, valid for 10 minutes, one use.
 * - Only an HMAC of (target + code) is stored, keyed with APP_SECRET — a
 *   database leak doesn't reveal live codes.
 * - 5 wrong guesses kill the code; a new one can be asked for after 60 s, at
 *   most 5 per hour per destination; WhatsApp also has a daily cap (it costs
 *   money per message).
 * - Answers never reveal whether an account exists.
 */
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { deliverCode } from "./senders";
import type { Channel } from "./targets";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

function hash(target: string, code: string): string {
  return createHmac("sha256", env.APP_SECRET).update(`${target}:${code}`).digest("hex");
}

export type RequestResult =
  | { ok: true; devCode: string | null }
  | { ok: false; reason: "cooldown"; retryInSec: number }
  | { ok: false; reason: "too_many" | "daily_cap" | "delivery" };

export async function requestCode(channel: Channel, target: string): Promise<RequestResult> {
  const now = Date.now();
  const recent = await prisma.loginCode.findMany({
    where: { target, createdAt: { gt: new Date(now - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent[0] && now - recent[0].createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const wait = RESEND_COOLDOWN_MS - (now - recent[0].createdAt.getTime());
    return { ok: false, reason: "cooldown", retryInSec: Math.ceil(wait / 1000) };
  }
  if (recent.length >= MAX_PER_HOUR) return { ok: false, reason: "too_many" };

  if (channel === "whatsapp") {
    const today = await prisma.loginCode.count({
      where: { channel, createdAt: { gt: new Date(now - 24 * 60 * 60 * 1000) } },
    });
    if (today >= env.WHATSAPP_DAILY_CAP) return { ok: false, reason: "daily_cap" };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // A new code replaces any earlier one for this destination.
  await prisma.loginCode.updateMany({
    where: { target, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  const row = await prisma.loginCode.create({
    data: { channel, target, codeHash: hash(target, code), expiresAt: new Date(now + CODE_TTL_MS) },
  });

  try {
    const devCode = await deliverCode(channel, target, code);
    return { ok: true, devCode };
  } catch {
    // Not delivered: don't let it count against the person's hourly limit.
    await prisma.loginCode.delete({ where: { id: row.id } }).catch(() => {});
    return { ok: false, reason: "delivery" };
  }
}

export type VerifyResult = { ok: true } | { ok: false; reason: "invalid" | "expired" | "locked" };

export async function verifyCode(target: string, code: string): Promise<VerifyResult> {
  const row = await prisma.loginCode.findFirst({
    where: { target, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return { ok: false, reason: "expired" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "locked" };

  const expected = Buffer.from(row.codeHash, "hex");
  const given = Buffer.from(hash(target, code.replace(/\D/g, "")), "hex");
  const match = expected.length === given.length && timingSafeEqual(expected, given);

  if (!match) {
    const attempts = row.attempts + 1;
    await prisma.loginCode.update({ where: { id: row.id }, data: { attempts } });
    return { ok: false, reason: attempts >= MAX_ATTEMPTS ? "locked" : "invalid" };
  }

  // Single use — the update is conditional so two parallel requests can't both win.
  const used = await prisma.loginCode.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return used.count === 1 ? { ok: true } : { ok: false, reason: "expired" };
}
