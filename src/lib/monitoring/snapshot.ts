/**
 * The collector: performs ONE collection for a tracked profile.
 *   1. Ask the provider for the profile + the head of the follower list.
 *   2. Persist a FollowerSnapshot (+ Follower rows).
 *   3. Diff against the previous snapshot -> FollowerChange rows.
 *   4. Update cached profile metadata + enqueue alerts.
 *
 * This is the only place the provider is invoked for follower data. It is
 * called by the job runner (cron) and by the manual "Refresh now" endpoint.
 */
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { enqueueAlertsForChanges } from "@/lib/alerts/dispatcher";
import { getProvider } from "@/lib/providers";
import { ProviderError } from "@/lib/providers/types";
import { canTrustUnfollows, computeDiff } from "./diff";

const log = logger.scope("collector");

export interface CollectionSummary {
  snapshotId: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  newFollowers: number;
  lostFollowers: number;
  capturedCount: number;
  followersCount: number;
  error?: string;
}

export async function collectProfile(profileId: string): Promise<CollectionSummary> {
  const profile = await prisma.trackedProfile.findUnique({ where: { id: profileId } });
  if (!profile) throw new Error(`TrackedProfile ${profileId} not found`);

  const provider = getProvider();
  const snapshot = await prisma.followerSnapshot.create({
    data: { profileId, status: "PENDING" },
  });

  log.info("collection started", { profileId, username: profile.username, snapshotId: snapshot.id });

  try {
    // 1. Fetch profile + follower head.
    const [profileData, followersResult] = await Promise.all([
      provider.getProfile(profile.username),
      provider.getFollowers(profile.username, {
        maxPages: env.PROVIDER_FOLLOWER_PAGES,
        pageSize: env.PROVIDER_PAGE_SIZE,
      }),
    ]);

    const current = followersResult.followers;

    // 2. Find the previous completed snapshot to diff against.
    const previous = await prisma.followerSnapshot.findFirst({
      where: { profileId, status: { in: ["SUCCESS", "PARTIAL"] }, id: { not: snapshot.id } },
      orderBy: { startedAt: "desc" },
      include: { followers: { select: { username: true } } },
    });

    const isBaseline = !previous;
    const prevUsernames = previous ? previous.followers.map((f) => f.username) : [];
    const { added, removed } = computeDiff(prevUsernames, current);

    // 3. Persist Follower rows for this snapshot.
    if (current.length > 0) {
      await prisma.follower.createMany({
        data: current.map((f, i) => ({
          profileId,
          snapshotId: snapshot.id,
          username: f.username,
          displayName: f.displayName,
          avatarUrl: f.avatarUrl,
          isVerified: f.isVerified,
          position: i,
        })),
      });
    }

    // 4. Record changes — but never on the baseline (first ever snapshot).
    const trustUnfollows =
      !isBaseline && canTrustUnfollows(previous!.mode as "head" | "full", followersResult.mode);

    let newFollowerCount = 0;
    let lostFollowerCount = 0;

    if (!isBaseline) {
      if (added.length > 0) {
        await prisma.followerChange.createMany({
          data: added.map((f) => ({
            profileId,
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

      if (trustUnfollows && removed.length > 0) {
        await prisma.followerChange.createMany({
          data: removed.map((username) => ({
            profileId,
            snapshotId: snapshot.id,
            followerUsername: username,
            type: "UNFOLLOW" as const,
          })),
        });
        lostFollowerCount = removed.length;
      }
    }

    const status = followersResult.truncated ? "PARTIAL" : "SUCCESS";

    await prisma.$transaction([
      prisma.followerSnapshot.update({
        where: { id: snapshot.id },
        data: {
          status,
          mode: followersResult.mode,
          capturedCount: current.length,
          followersCount: profileData.followersCount,
          newFollowerCount,
          lostFollowerCount,
          completedAt: new Date(),
        },
      }),
      prisma.trackedProfile.update({
        where: { id: profileId },
        data: {
          displayName: profileData.displayName,
          avatarUrl: profileData.avatarUrl,
          bio: profileData.bio,
          isPrivate: profileData.isPrivate,
          isVerified: profileData.isVerified,
          followersCount: profileData.followersCount,
          followingCount: profileData.followingCount,
          postsCount: profileData.postsCount,
          lastCollectedAt: new Date(),
          lastError: null,
          status: "ACTIVE",
        },
      }),
    ]);

    // 5. Fire-and-forget alerts (never block/fascade a collection on delivery).
    if (!isBaseline && newFollowerCount > 0) {
      enqueueAlertsForChanges(profileId, added).catch((e) =>
        log.error("alert enqueue failed", { profileId, error: e }),
      );
    }

    log.info("collection finished", {
      profileId,
      snapshotId: snapshot.id,
      status,
      baseline: isBaseline,
      newFollowers: newFollowerCount,
      lostFollowers: lostFollowerCount,
      captured: current.length,
    });

    return {
      snapshotId: snapshot.id,
      status,
      newFollowers: newFollowerCount,
      lostFollowers: lostFollowerCount,
      capturedCount: current.length,
      followersCount: profileData.followersCount,
    };
  } catch (err) {
    const message =
      err instanceof ProviderError ? `[${err.code}] ${err.message}` : (err as Error).message;
    log.error("collection failed", { profileId, snapshotId: snapshot.id, error: message });

    await prisma.$transaction([
      prisma.followerSnapshot.update({
        where: { id: snapshot.id },
        data: { status: "FAILED", error: message, completedAt: new Date() },
      }),
      prisma.trackedProfile.update({
        where: { id: profileId },
        data: { lastError: message, status: "ERROR" },
      }),
    ]);

    return {
      snapshotId: snapshot.id,
      status: "FAILED",
      newFollowers: 0,
      lostFollowers: 0,
      capturedCount: 0,
      followersCount: profile.followersCount,
      error: message,
    };
  }
}
