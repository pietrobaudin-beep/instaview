import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EMPTY_ACTIVITY, getPostActivity, syncPostActivity } from "@/lib/post-activity";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { logger } from "@/lib/logger";

const log = logger.scope("api:post-activity");

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Re-reading every post costs ~2 requests each, so only re-sync occasionally.
const lastSync = new Map<string, number>();
const SYNC_EVERY = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Likes/unlikes and comments/deletions on the profile's newest posts.
 * PRO only — free users get `locked` and we never spend provider credits.
 */
export async function GET(req: Request) {
  const username = normalizeUsername(new URL(req.url).searchParams.get("username") || "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = await getCurrentUser();
  if (!user || user.plan === "FREE") {
    return NextResponse.json({ locked: true, activity: EMPTY_ACTIVITY });
  }

  const profile = await prisma.trackedProfile.findUnique({
    where: { userId_username: { userId: user.id, username } },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ locked: false, activity: EMPTY_ACTIVITY });

  const key = `${user.id}:${username}`;
  const due = (lastSync.get(key) ?? 0) + SYNC_EVERY < Date.now();
  if (due) {
    lastSync.set(key, Date.now());
    try {
      await syncPostActivity(profile.id, username);
    } catch (e) {
      log.warn("sync failed", { username, error: (e as Error).message });
    }
  }

  const raw = await getPostActivity(profile.id, 20);
  const real = <T extends { isVerified: boolean }>(xs: T[]) => xs.filter((x) => !x.isVerified).slice(0, 5);
  const activity = {
    liked: real(raw.liked),
    unliked: real(raw.unliked),
    commented: real(raw.commented),
    deletedComment: real(raw.deletedComment),
  };
  return NextResponse.json({ locked: false, activity });
}
