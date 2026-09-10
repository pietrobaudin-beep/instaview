/**
 * Read-side queries for the dashboard. All follower-growth numbers derive from
 * FollowerChange rows (type=FOLLOW), which the indexes are tuned for.
 */
import { prisma } from "@/lib/db";

export type Period = "24h" | "7d" | "30d" | "90d";

const PERIOD_MS: Record<Period, number> = {
  "24h": 24 * 3600_000,
  "7d": 7 * 24 * 3600_000,
  "30d": 30 * 24 * 3600_000,
  "90d": 90 * 24 * 3600_000,
};

function since(ms: number): Date {
  return new Date(Date.now() - ms);
}

async function countFollows(profileId: string, sinceDate: Date): Promise<number> {
  return prisma.followerChange.count({
    where: { profileId, type: "FOLLOW", detectedAt: { gte: sinceDate } },
  });
}

export interface DashboardSummary {
  today: number; // last 24h
  week: number; // last 7d
  month: number; // last 30d
  currentFollowers: number;
  followingCount: number;
  avgPerDay: number; // over last 30d
  growthRatePct: number; // last 30d gained / current followers * 100
  lostToday: number;
}

export async function getSummary(profileId: string): Promise<DashboardSummary> {
  const profile = await prisma.trackedProfile.findUniqueOrThrow({ where: { id: profileId } });
  const [today, week, month, lostToday] = await Promise.all([
    countFollows(profileId, since(PERIOD_MS["24h"])),
    countFollows(profileId, since(PERIOD_MS["7d"])),
    countFollows(profileId, since(PERIOD_MS["30d"])),
    prisma.followerChange.count({
      where: { profileId, type: "UNFOLLOW", detectedAt: { gte: since(PERIOD_MS["24h"]) } },
    }),
  ]);

  const avgPerDay = Math.round((month / 30) * 10) / 10;
  const growthRatePct =
    profile.followersCount > 0 ? Math.round((month / profile.followersCount) * 1000) / 10 : 0;

  return {
    today,
    week,
    month,
    currentFollowers: profile.followersCount,
    followingCount: profile.followingCount,
    avgPerDay,
    growthRatePct,
    lostToday,
  };
}

export interface SeriesPoint {
  label: string;
  ts: number;
  value: number;
}

/** Bucketed new-follower counts across the period, for the growth chart. */
export async function getGrowthSeries(profileId: string, period: Period): Promise<SeriesPoint[]> {
  const start = since(PERIOD_MS[period]);
  const changes = await prisma.followerChange.findMany({
    where: { profileId, type: "FOLLOW", detectedAt: { gte: start } },
    select: { detectedAt: true },
    orderBy: { detectedAt: "asc" },
  });

  const buckets = period === "24h" ? 24 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const bucketMs = PERIOD_MS[period] / buckets;
  const startMs = start.getTime();

  const points: SeriesPoint[] = Array.from({ length: buckets }, (_, i) => {
    const ts = startMs + i * bucketMs;
    return { ts, value: 0, label: labelFor(period, ts) };
  });

  for (const c of changes) {
    const idx = Math.min(buckets - 1, Math.floor((c.detectedAt.getTime() - startMs) / bucketMs));
    if (idx >= 0) points[idx].value++;
  }
  return points;
}

function labelFor(period: Period, ts: number): string {
  const d = new Date(ts);
  if (period === "24h") return `${d.getHours()}:00`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export interface ChangeItem {
  id: string;
  followerUsername: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  type: "FOLLOW" | "UNFOLLOW";
  detectedAt: string;
}

/**
 * The followers captured in the latest snapshot — i.e. the profile's existing
 * followers (the "head" of the list). Lets the dashboard show real followers
 * immediately, before any FOLLOW/UNFOLLOW events accumulate over time.
 */
export async function getCurrentFollowers(profileId: string, limit = 100): Promise<ChangeItem[]> {
  const snap = await prisma.followerSnapshot.findFirst({
    where: { profileId, status: { in: ["SUCCESS", "PARTIAL"] } },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  if (!snap) return [];

  const rows = await prisma.follower.findMany({
    where: { snapshotId: snap.id },
    orderBy: { position: "asc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    followerUsername: r.username,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    isVerified: r.isVerified,
    type: "FOLLOW" as const,
    detectedAt: r.observedAt.toISOString(),
  }));
}

export async function getRecentChanges(
  profileId: string,
  opts: { type?: "FOLLOW" | "UNFOLLOW"; period?: Period; limit?: number } = {},
): Promise<ChangeItem[]> {
  const rows = await prisma.followerChange.findMany({
    where: {
      profileId,
      type: opts.type,
      detectedAt: opts.period ? { gte: since(PERIOD_MS[opts.period]) } : undefined,
    },
    orderBy: { detectedAt: "desc" },
    take: opts.limit ?? 50,
  });
  return rows.map((r) => ({
    id: r.id,
    followerUsername: r.followerUsername,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    isVerified: r.isVerified,
    type: r.type,
    detectedAt: r.detectedAt.toISOString(),
  }));
}
