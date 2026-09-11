/**
 * Ingest a follower snapshot pushed from the browser bridge (bookmarklet).
 *
 * The bridge runs on instagram.com (the user's own session), reads their
 * following/followers, and posts them here. We store a snapshot and diff it
 * against the previous one to detect FOLLOW / UNFOLLOW — exactly like the
 * server-side collector, but for the user's OWN account, with no data provider
 * and no cost. Because the bridge sends the full follower list, UNFOLLOWs are
 * trustworthy.
 */
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { computeDiff } from "@/lib/monitoring/diff";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

const log = logger.scope("ingest");

export interface BridgeUser {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface BridgePayload {
  profile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isVerified: boolean;
    isPrivate: boolean;
  };
  followers: BridgeUser[];
  following: BridgeUser[];
  truncated?: boolean;
}

export interface IngestResult {
  profileId: string;
  followers: number;
  newFollowers: number;
  unfollowers: number;
  baseline: boolean;
}

export async function ingestSnapshot(userId: string, payload: BridgePayload): Promise<IngestResult> {
  const username = normalizeUsername(payload.profile.username || "");
  if (!isValidUsername(username)) throw new Error("Invalid Instagram username in payload");

  // Find or create the user's own tracked profile (no cron job — bridge-driven).
  let profile = await prisma.trackedProfile.findUnique({
    where: { userId_username: { userId, username } },
  });
  if (!profile) {
    profile = await prisma.trackedProfile.create({
      data: { username, userId, status: "ACTIVE", captureFull: true },
    });
  }

  const current = payload.followers.filter((f) => f.username);
  const mode = payload.truncated ? "head" : "full";

  const snapshot = await prisma.followerSnapshot.create({
    data: { profileId: profile.id, status: "PENDING" },
  });

  const previous = await prisma.followerSnapshot.findFirst({
    where: { profileId: profile.id, status: { in: ["SUCCESS", "PARTIAL"] }, id: { not: snapshot.id } },
    orderBy: { startedAt: "desc" },
    include: { followers: { select: { username: true } } },
  });

  const isBaseline = !previous;
  const prevUsernames = previous ? previous.followers.map((f) => f.username) : [];
  const { added, removed } = computeDiff(prevUsernames, current);

  if (current.length > 0) {
    await prisma.follower.createMany({
      data: current.map((f, i) => ({
        profileId: profile!.id,
        snapshotId: snapshot.id,
        username: f.username,
        displayName: f.displayName,
        avatarUrl: f.avatarUrl,
        isVerified: f.isVerified,
        position: i,
      })),
    });
  }

  let newFollowerCount = 0;
  let lostFollowerCount = 0;

  if (!isBaseline) {
    if (added.length > 0) {
      await prisma.followerChange.createMany({
        data: added.map((f) => ({
          profileId: profile!.id,
          snapshotId: snapshot.id,
          followerUsername: f.username,
          type: "FOLLOW" as const,
          displayName: f.displayName,
          avatarUrl: f.avatarUrl,
          isVerified: f.isVerified,
        })),
      });
      newFollowerCount = added.length;
    }
    // Bridge sends the full list, so removed followers are genuine unfollows.
    if (mode === "full" && removed.length > 0) {
      const removedUsers = previous!.followers.filter((f) => removed.includes(f.username));
      await prisma.followerChange.createMany({
        data: removedUsers.map((f) => ({
          profileId: profile!.id,
          snapshotId: snapshot.id,
          followerUsername: f.username,
          type: "UNFOLLOW" as const,
        })),
      });
      lostFollowerCount = removedUsers.length;
    }
  }

  await prisma.$transaction([
    prisma.followerSnapshot.update({
      where: { id: snapshot.id },
      data: {
        status: mode === "full" ? "SUCCESS" : "PARTIAL",
        mode,
        capturedCount: current.length,
        followersCount: payload.profile.followersCount || current.length,
        newFollowerCount,
        lostFollowerCount,
        completedAt: new Date(),
      },
    }),
    prisma.trackedProfile.update({
      where: { id: profile.id },
      data: {
        displayName: payload.profile.displayName,
        avatarUrl: payload.profile.avatarUrl,
        isPrivate: payload.profile.isPrivate,
        isVerified: payload.profile.isVerified,
        followersCount: payload.profile.followersCount || current.length,
        followingCount: payload.profile.followingCount || payload.following.length,
        postsCount: payload.profile.postsCount || 0,
        lastCollectedAt: new Date(),
        lastError: null,
        status: "ACTIVE",
      },
    }),
  ]);

  log.info("bridge snapshot ingested", {
    userId,
    username,
    baseline: isBaseline,
    followers: current.length,
    newFollowers: newFollowerCount,
    unfollowers: lostFollowerCount,
  });

  return {
    profileId: profile.id,
    followers: current.length,
    newFollowers: newFollowerCount,
    unfollowers: lostFollowerCount,
    baseline: isBaseline,
  };
}
