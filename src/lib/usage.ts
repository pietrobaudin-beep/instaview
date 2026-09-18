/**
 * Free-plan allowance: a free identity may analyse ONE profile.
 *
 * Enforced on the server, not in the UI — otherwise it would both be trivially
 * bypassed and, worse, still spend provider credits on every extra analysis.
 *
 * Identity is the signed-in user when there is one, and otherwise an anonymous
 * visitor id kept in a signed httpOnly cookie. A cookie can be cleared, so this
 * is a conversion funnel rather than a security boundary — which is the right
 * trade-off, since the alternative (fingerprinting or storing IPs) collects
 * personal data to enforce a paywall.
 */
import { cookies } from "next/headers";
import { createHmac, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type { User } from "@prisma/client";

export const FREE_ANALYSIS_LIMIT = 1;

/**
 * The limit only applies on the live site. On localhost the owner tests freely
 * — and the local build uses the mock provider, so there are no credits to
 * protect there anyway.
 */
export const FREE_LIMIT_ENFORCED = process.env.NODE_ENV === "production";

const VISITOR_COOKIE = "farejo_v";

function sign(value: string): string {
  const mac = createHmac("sha256", env.APP_SECRET).update(value).digest("hex").slice(0, 32);
  return `${value}.${mac}`;
}

function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  return sign(value) === signed ? value : null;
}

/**
 * The key this request's allowance is counted against. Issues a visitor cookie
 * when there is no session, so it must be called from a route handler.
 */
export function usageKey(user: User | null): string {
  if (user) return `u:${user.id}`;

  const jar = cookies();
  const existing = unsign(jar.get(VISITOR_COOKIE)?.value);
  if (existing) return `v:${existing}`;

  const id = randomBytes(16).toString("hex");
  jar.set(VISITOR_COOKIE, sign(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return `v:${id}`;
}

/**
 * The allowance key without issuing a cookie — safe to call while rendering a
 * page. Returns null for a visitor who has not been given one yet, which means
 * they have used nothing.
 */
export function peekUsageKey(user: User | null): string | null {
  if (user) return `u:${user.id}`;
  const existing = unsign(cookies().get(VISITOR_COOKIE)?.value);
  return existing ? `v:${existing}` : null;
}

export interface Allowance {
  /** False when this profile would exceed the free plan. */
  allowed: boolean;
  /** Profiles already analysed on this identity. */
  used: number;
  limit: number;
  /** True when this exact profile was already analysed (always allowed). */
  claimed: boolean;
  /** The profile the allowance was spent on, to offer a way back to it. */
  spentOn: string | null;
}

/** Whether this identity may analyse `username`, without recording anything. */
export async function checkAllowance(key: string, username: string): Promise<Allowance> {
  if (!FREE_LIMIT_ENFORCED) {
    return { allowed: true, used: 0, limit: FREE_ANALYSIS_LIMIT, claimed: false, spentOn: null };
  }
  const rows = await prisma.analysisUsage.findMany({
    where: { key },
    orderBy: { createdAt: "asc" },
    select: { username: true },
    take: FREE_ANALYSIS_LIMIT + 1,
  });

  const claimed = rows.some((r) => r.username === username);
  return {
    allowed: claimed || rows.length < FREE_ANALYSIS_LIMIT,
    used: rows.length,
    limit: FREE_ANALYSIS_LIMIT,
    claimed,
    spentOn: rows[0]?.username ?? null,
  };
}

/** Record that this identity spent its allowance on `username`. Idempotent. */
export async function claimAnalysis(key: string, username: string): Promise<void> {
  await prisma.analysisUsage.upsert({
    where: { key_username: { key, username } },
    create: { key, username },
    update: {},
  });
}
