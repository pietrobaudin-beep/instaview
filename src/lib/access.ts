/**
 * What a person may see of ONE profile.
 *
 * - "pro"    — a Pro/Agency subscriber: everything, on every profile.
 * - "single" — bought "uso único" for this exact profile: the full, uncensored
 *              analysis of it, but none of the Pro-only features (no "Colocar
 *              no Faro AI", no history over time).
 * - "free"   — the blurred preview, within the free allowance.
 *
 * Every route that decides between blurred and revealed asks this, so the
 * rule lives in one place.
 */
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

export type Access = "free" | "single" | "pro";

export async function accessFor(user: User | null, username: string): Promise<Access> {
  if (!user) return "free";
  if (user.plan !== "FREE") return "pro";
  const unlock = await prisma.profileUnlock.findUnique({
    where: { userId_username: { userId: user.id, username } },
    select: { id: true },
  });
  return unlock ? "single" : "free";
}

/** Record a one-off unlock. Idempotent — a retried webhook never duplicates. */
export async function grantUnlock(
  userId: string,
  username: string,
  stripeSessionId: string | null,
): Promise<void> {
  await prisma.profileUnlock.upsert({
    where: { userId_username: { userId, username } },
    create: { userId, username, stripeSessionId },
    update: {},
  });
}
