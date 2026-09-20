/**
 * Slows down guessing at a protected door (the admin login).
 *
 * - 5 failures from the same place in 15 minutes → that place waits.
 * - 30 failures overall in 15 minutes → the door closes for everyone for a
 *   while, which stops guessing spread across many addresses.
 *
 * "The same place" is a keyed hash of the request's IP (HMAC with APP_SECRET):
 * enough to count attempts, useless for tracking anyone. Rows older than a day
 * are cleared as new failures come in.
 */
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const WINDOW_MS = 15 * 60 * 1000;
const PER_PLACE = 5;
const OVERALL = 30;

function placeKey(req: Request): string {
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return createHmac("sha256", env.APP_SECRET).update(`place:${ip}`).digest("hex").slice(0, 32);
}

export async function isLocked(scope: string, req: Request): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [mine, all] = await Promise.all([
    prisma.authFailure.count({ where: { scope, key: placeKey(req), createdAt: { gt: since } } }),
    prisma.authFailure.count({ where: { scope, createdAt: { gt: since } } }),
  ]);
  return mine >= PER_PLACE || all >= OVERALL;
}

export async function recordFailure(scope: string, req: Request): Promise<void> {
  await prisma.authFailure.create({ data: { scope, key: placeKey(req) } });
  await prisma.authFailure
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
    .catch(() => {});
}

/** A successful login wipes that place's slate. */
export async function clearFailures(scope: string, req: Request): Promise<void> {
  await prisma.authFailure.deleteMany({ where: { scope, key: placeKey(req) } }).catch(() => {});
}
