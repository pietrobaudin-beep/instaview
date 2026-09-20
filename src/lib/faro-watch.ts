/**
 * The daily Faro: once a day, every profile a PRO user put "no Faro" is read
 * again and only what is NEW is kept as news — new posts, reels, stories and
 * places it was tagged, plus the follow changes the existing tracker finds.
 *
 * - The first reading of each kind becomes the baseline (stored, never shown),
 *   so the Faro reports only what appears from then on.
 * - Reads go through the Raio-X cache with a max age of ~20h, so a section
 *   someone opened today isn't paid for again, and yesterday's copy never
 *   hides today's posts.
 * - Cost per profile per day: one request per watched section + the following
 *   page (~7 in total with HikerAPI). Private profiles are skipped.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { recordFollowing } from "@/lib/following-tracker";
import { logger } from "@/lib/logger";
import { getSection, type Section } from "@/lib/raio-x";
import { TEST_EMAIL_DOMAIN, usingMockData } from "@/lib/sandbox";
import type { PostItem, StoryItem } from "@/lib/providers/types";

const log = logger.scope("faro-watch");

const WATCH: { section: Section; kind: string }[] = [
  { section: "posts", kind: "post" },
  { section: "reels", kind: "reel" },
  { section: "stories", kind: "story" },
  { section: "tagged", kind: "tagged" },
];

const FRESH_MS = 20 * 60 * 60 * 1000;

/** What the news card needs, frozen at detection time. */
export interface EventData {
  kind: string;
  takenAt: string | null;
  thumbnailUrl: string | null;
  code: string | null;
  caption: string | null;
  /** Owner (for tags) or mentioned accounts (for stories). */
  people: string[];
}

function summarize(kind: string, x: PostItem | StoryItem): EventData {
  const isStory = kind === "story";
  const post = x as PostItem;
  const story = x as StoryItem;
  return {
    kind,
    takenAt: x.takenAt,
    thumbnailUrl: x.thumbnailUrl,
    code: isStory ? null : post.code,
    caption: isStory ? null : (post.caption ?? "").slice(0, 120) || null,
    people: isStory
      ? story.mentions.map((m) => m.username)
      : kind === "tagged"
        ? [post.owner?.username].filter(Boolean) as string[]
        : post.tagged.map((u) => u.username),
  };
}

export interface WatchReport {
  username: string;
  news: number;
  skipped?: string;
}

/** Reads one profile and stores whatever is new since the last reading. */
export async function watchProfile(profile: { id: string; username: string; userId: string }): Promise<WatchReport> {
  const { id: profileId, username } = profile;
  let news = 0;

  for (const { section, kind } of WATCH) {
    const res = await getSection(username, section, FRESH_MS);
    if (res.status === "private") return { username, news, skipped: "private" };
    if (res.status !== "ok") continue;

    const d = res.data;
    const items: (PostItem | StoryItem)[] =
      d.section === "posts" ? [...d.pinned, ...d.items] : "items" in d ? (d.items as (PostItem | StoryItem)[]) : [];
    if (!items.length) continue;

    // No earlier reading of this kind → this one is the baseline, not news.
    const baseline = (await prisma.profileEvent.count({ where: { profileId, kind } })) === 0;
    const created = await prisma.profileEvent.createMany({
      data: items
        .filter((x) => x.id)
        .map((x) => ({
          profileId,
          kind,
          refId: x.id,
          baseline,
          data: summarize(kind, x) as unknown as Prisma.InputJsonValue,
        })),
      skipDuplicates: true,
    });
    if (!baseline) news += created.count;
  }

  // Follows: the same tracker the analysis page uses, one page of "following".
  try {
    const provider = getProvider();
    const [p, following] = await Promise.all([
      provider.getProfile(username),
      provider.getFollowing(username, { maxPages: 1, pageSize: 50 }),
    ]);
    await recordFollowing(
      profile.userId,
      {
        username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        bio: p.bio,
        followersCount: p.followersCount,
        followingCount: p.followingCount,
        isVerified: p.isVerified,
        isPrivate: p.isPrivate,
      },
      following.followers.filter((u) => !u.isVerified),
    );
  } catch (e) {
    log.warn("following read failed", { username, error: (e as Error).message });
  }

  await prisma.trackedProfile.update({ where: { id: profileId }, data: { lastCollectedAt: new Date(), lastError: null } });
  return { username, news };
}

/**
 * Every PRO profile in the Faro, least recently read first. `limit` keeps one
 * run inside the serverless time budget; profiles left over go first next day.
 */
export async function runFaroDaily(limit = 20): Promise<{ checked: number; news: number; reports: WatchReport[] }> {
  const profiles = await prisma.trackedProfile.findMany({
    where: {
      status: "ACTIVE",
      user: {
        plan: { not: "FREE" },
        // Fake data (localhost) only ever touches the test accounts.
        ...(usingMockData() ? { email: { endsWith: TEST_EMAIL_DOMAIN } } : {}),
      },
    },
    orderBy: [{ lastCollectedAt: { sort: "asc", nulls: "first" } }],
    take: limit,
    select: { id: true, username: true, userId: true },
  });

  const reports: WatchReport[] = [];
  // A few at a time: quick enough, gentle on the provider's rate limit.
  for (let i = 0; i < profiles.length; i += 3) {
    const batch = await Promise.all(
      profiles.slice(i, i + 3).map((p) =>
        watchProfile(p).catch((e) => {
          log.error("watch failed", { username: p.username, error: (e as Error).message });
          return { username: p.username, news: 0, skipped: "error" };
        }),
      ),
    );
    reports.push(...batch);
  }
  const news = reports.reduce((n, r) => n + r.news, 0);
  log.info("faro daily run", { checked: reports.length, news });
  return { checked: reports.length, news, reports };
}
