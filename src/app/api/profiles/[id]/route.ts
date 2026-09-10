import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getCurrentFollowers,
  getGrowthSeries,
  getRecentChanges,
  getSummary,
  type Period,
} from "@/lib/analytics";

const PERIODS: Period[] = ["24h", "7d", "30d", "90d"];

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await prisma.trackedProfile.findFirst({
    where: { id: params.id, userId: user.id },
    include: { job: true },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const periodParam = url.searchParams.get("period") as Period | null;
  const period: Period = periodParam && PERIODS.includes(periodParam) ? periodParam : "7d";
  const typeParam = url.searchParams.get("type");
  const view =
    typeParam === "UNFOLLOW" ? "UNFOLLOW" : typeParam === "CURRENT" ? "CURRENT" : "FOLLOW";

  const [summary, series, changes] = await Promise.all([
    getSummary(profile.id),
    getGrowthSeries(profile.id, period),
    view === "CURRENT"
      ? getCurrentFollowers(profile.id, 100)
      : getRecentChanges(profile.id, { type: view, period, limit: 100 }),
  ]);

  // Paywall: FREE users see the data blurred and must upgrade to reveal it.
  const locked = user.plan === "FREE";

  return NextResponse.json({
    locked,
    profile: {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      isVerified: profile.isVerified,
      isPrivate: profile.isPrivate,
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
      postsCount: profile.postsCount,
      status: profile.status,
      monitoringStartedAt: profile.monitoringStartedAt.toISOString(),
      lastCollectedAt: profile.lastCollectedAt?.toISOString() ?? null,
      lastError: profile.lastError,
      intervalMinutes: profile.job?.intervalMinutes ?? null,
      nextRunAt: profile.job?.nextRunAt?.toISOString() ?? null,
    },
    period,
    summary,
    series,
    changes,
  });
}
