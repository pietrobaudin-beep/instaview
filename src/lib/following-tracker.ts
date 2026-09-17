/**
 * Tracks a profile's FOLLOWING list over time for a given user.
 *
 * We only ever read the first page (most-recently-followed first), so:
 *  - "começou a seguir" = accounts that appear at the top since last check.
 *  - "deixou de seguir" = accounts that vanished from the window AND were not
 *    simply pushed out of it by new follows (the last N entries of the previous
 *    page, where N = number of new follows, are treated as shifted-out, not
 *    unfollowed). This avoids false "unfollows" from the sliding window.
 */
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { FollowerEntry } from "@/lib/providers/types";

const log = logger.scope("following-tracker");
export const FOLLOWING_KIND = "following";

export interface RecentItem {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  detectedAt: string;
}

export interface ProfileMeta {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  followersCount?: number;
  followingCount?: number;
  isVerified?: boolean;
  isPrivate?: boolean;
}

/** Store a fresh following snapshot and record the diff. No provider calls. */
export async function recordFollowing(
  userId: string,
  meta: ProfileMeta,
  current: FollowerEntry[],
): Promise<string> {
  const username = meta.username.toLowerCase();

  let profile = await prisma.trackedProfile.findUnique({
    where: { userId_username: { userId, username } },
  });
  if (!profile) {
    profile = await prisma.trackedProfile.create({
      data: { username, userId, status: "ACTIVE" },
    });
  }

  const previous = await prisma.followerSnapshot.findFirst({
    where: { profileId: profile.id, kind: FOLLOWING_KIND, status: "SUCCESS" },
    orderBy: { startedAt: "desc" },
    include: { followers: { orderBy: { position: "asc" } } },
  });

  const snapshot = await prisma.followerSnapshot.create({
    data: {
      profileId: profile.id,
      kind: FOLLOWING_KIND,
      status: "SUCCESS",
      mode: "head",
      capturedCount: current.length,
      followersCount: meta.followingCount ?? current.length,
      completedAt: new Date(),
    },
  });

  if (current.length > 0) {
    await prisma.follower.createMany({
      data: current.map((u, i) => ({
        profileId: profile!.id,
        snapshotId: snapshot.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        isVerified: u.isVerified,
        position: i,
      })),
    });
  }

  if (previous) {
    const prevRows = previous.followers;
    const currSet = new Set(current.map((u) => u.username));
    const prevSet = new Set(prevRows.map((r) => r.username));

    const added = current.filter((u) => !prevSet.has(u.username));
    const missing = prevRows.filter((r) => !currSet.has(r.username));
    // Entries pushed out of the window by the new follows — not unfollows.
    const shiftedOut = new Set(
      prevRows.slice(Math.max(0, prevRows.length - added.length)).map((r) => r.username),
    );
    const stopped = missing.filter((r) => !shiftedOut.has(r.username));

    if (added.length > 0) {
      await prisma.followerChange.createMany({
        data: added.map((u) => ({
          profileId: profile!.id,
          snapshotId: snapshot.id,
          kind: FOLLOWING_KIND,
          followerUsername: u.username,
          type: "FOLLOW" as const,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          isVerified: u.isVerified,
        })),
      });
    }
    if (stopped.length > 0) {
      await prisma.followerChange.createMany({
        data: stopped.map((r) => ({
          profileId: profile!.id,
          snapshotId: snapshot.id,
          kind: FOLLOWING_KIND,
          followerUsername: r.username,
          type: "UNFOLLOW" as const,
          displayName: r.displayName,
          avatarUrl: r.avatarUrl,
          isVerified: r.isVerified,
        })),
      });
    }

    await prisma.followerSnapshot.update({
      where: { id: snapshot.id },
      data: { newFollowerCount: added.length, lostFollowerCount: stopped.length },
    });
    log.info("following diff", { username, added: added.length, stopped: stopped.length });
  }

  await prisma.trackedProfile.update({
    where: { id: profile.id },
    data: {
      displayName: meta.displayName ?? profile.displayName,
      avatarUrl: meta.avatarUrl ?? profile.avatarUrl,
      followersCount: meta.followersCount ?? profile.followersCount,
      followingCount: meta.followingCount ?? profile.followingCount,
      isVerified: meta.isVerified ?? profile.isVerified,
      isPrivate: meta.isPrivate ?? profile.isPrivate,
      lastCollectedAt: new Date(),
    },
  });

  return profile.id;
}

/** The latest N accounts this profile started / stopped following. */
export async function getRecentFollowingChanges(profileId: string, limit = 5) {
  const pick = (t: "FOLLOW" | "UNFOLLOW") =>
    prisma.followerChange.findMany({
      where: { profileId, kind: FOLLOWING_KIND, type: t },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });

  const [started, stopped] = await Promise.all([pick("FOLLOW"), pick("UNFOLLOW")]);
  const map = (rows: Awaited<ReturnType<typeof pick>>): RecentItem[] =>
    rows.map((r) => ({
      username: r.followerUsername,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      isVerified: r.isVerified,
      detectedAt: r.detectedAt.toISOString(),
    }));

  return { started: map(started), stopped: map(stopped) };
}
