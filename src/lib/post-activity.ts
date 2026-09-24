/**
 * Post-level activity for a tracked profile: who liked / un-liked and who
 * commented / deleted a comment on its most recent posts.
 *
 * Instagram has no "what did user X like" feed, so this works per POST: we read
 * the likers and commenters of the profile's latest posts and diff each against
 * the previous reading. Costs ~2 provider requests per post, so it is PRO-only
 * and capped to the newest few posts.
 */
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getProvider } from "@/lib/providers";
import { getRecentMediaCached } from "@/lib/media-cache";
import { guardarRostos } from "@/lib/img-store";
import type { FollowerEntry } from "@/lib/providers/types";

const log = logger.scope("post-activity");

// Os nomes moram em `pista-kinds`, que a tela importa sem arrastar o servidor.
export { LIKES_KIND, COMMENTS_KIND } from "@/lib/pista-kinds";
import { LIKES_KIND, COMMENTS_KIND } from "@/lib/pista-kinds";
/** Newest posts to watch. Each one costs ~2 requests per check — keep it low. */
export const WATCHED_POSTS = 1;

export interface ActivityItem {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  detectedAt: string;
}

export interface PostActivity {
  liked: ActivityItem[];
  unliked: ActivityItem[];
  commented: ActivityItem[];
  deletedComment: ActivityItem[];
}

const EMPTY: PostActivity = { liked: [], unliked: [], commented: [], deletedComment: [] };

/** Read one post's audience, diff against last time, and store the result. */
async function syncOne(profileId: string, mediaId: string, kind: string, current: FollowerEntry[]) {
  const previous = await prisma.followerSnapshot.findFirst({
    where: { profileId, kind, mediaId, status: "SUCCESS" },
    orderBy: { startedAt: "desc" },
    include: { followers: true },
  });

  const snapshot = await prisma.followerSnapshot.create({
    data: {
      profileId,
      kind,
      mediaId,
      status: "SUCCESS",
      mode: "full",
      capturedCount: current.length,
      completedAt: new Date(),
    },
  });

  if (current.length > 0) {
    await prisma.follower.createMany({
      data: current.map((u, i) => ({
        profileId,
        snapshotId: snapshot.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        isVerified: u.isVerified,
        position: i,
      })),
    });
  }

  if (!previous) return; // first reading is the baseline

  const currSet = new Set(current.map((u) => u.username));
  const prevSet = new Set(previous.followers.map((r) => r.username));
  const added = current.filter((u) => !prevSet.has(u.username));
  const removed = previous.followers.filter((r) => !currSet.has(r.username));

  const rows = [
    ...added.map((u) => ({
      profileId,
      snapshotId: snapshot.id,
      kind,
      mediaId,
      followerUsername: u.username,
      type: "FOLLOW" as const,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      isVerified: u.isVerified,
    })),
    ...removed.map((r) => ({
      profileId,
      snapshotId: snapshot.id,
      kind,
      mediaId,
      followerUsername: r.username,
      type: "UNFOLLOW" as const,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      isVerified: r.isVerified,
    })),
  ];
  if (rows.length) {
    await prisma.followerChange.createMany({ data: rows });
    // A foto de quem curtiu ou comentou, guardada enquanto o endereço do CDN
    // ainda vale — ver `guardarRostos`.
    await guardarRostos(rows.map((r) => r.avatarUrl));
  }
}

/** Fetch + diff the newest posts. Returns nothing; read with getPostActivity. */
export async function syncPostActivity(profileId: string, username: string): Promise<void> {
  const provider = getProvider();
  if (!provider.getRecentMedia || !provider.getMediaLikers || !provider.getMediaCommenters) return;

  const posts = (await getRecentMediaCached(username)).filter((p) => p.id).slice(0, WATCHED_POSTS);
  for (const post of posts) {
    try {
      const [likers, commenters] = await Promise.all([
        provider.getMediaLikers(post.id),
        provider.getMediaCommenters(post.id),
      ]);
      await syncOne(profileId, post.id, LIKES_KIND, likers);
      await syncOne(profileId, post.id, COMMENTS_KIND, commenters);
    } catch (e) {
      log.warn("post sync failed", { mediaId: post.id, error: (e as Error).message });
    }
  }
  log.info("post activity synced", { username, posts: posts.length });
}

/** Latest N of each activity type. */
export async function getPostActivity(profileId: string, limit = 5): Promise<PostActivity> {
  // Verified/brand accounts are out of scope for this product — only the real
  // people a profile interacts with are shown.
  const pick = (kind: string, type: "FOLLOW" | "UNFOLLOW") =>
    prisma.followerChange.findMany({
      where: { profileId, kind, type, isVerified: false },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });

  const [liked, unliked, commented, deleted] = await Promise.all([
    pick(LIKES_KIND, "FOLLOW"),
    pick(LIKES_KIND, "UNFOLLOW"),
    pick(COMMENTS_KIND, "FOLLOW"),
    pick(COMMENTS_KIND, "UNFOLLOW"),
  ]);

  const map = (rows: Awaited<ReturnType<typeof pick>>): ActivityItem[] =>
    rows.map((r) => ({
      username: r.followerUsername,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      isVerified: r.isVerified,
      detectedAt: r.detectedAt.toISOString(),
    }));

  return {
    liked: map(liked),
    unliked: map(unliked),
    commented: map(commented),
    deletedComment: map(deleted),
  };
}

export { EMPTY as EMPTY_ACTIVITY };
