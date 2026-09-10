import { notFound, redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard/dashboard";
import { getCurrentFollowers, getGrowthSeries, getSummary } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProfileDashboardPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.trackedProfile.findFirst({
    where: { id: params.id, userId: user.id },
    include: { job: true },
  });
  if (!profile) notFound();

  const period = "7d" as const;
  const [summary, series, changes] = await Promise.all([
    getSummary(profile.id),
    getGrowthSeries(profile.id, period),
    // Default view = current followers, so the dashboard shows real people
    // immediately (new-follower events accumulate over time).
    getCurrentFollowers(profile.id, 100),
  ]);

  const initial = {
    locked: user.plan === "FREE",
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
  };

  return <Dashboard initial={initial} />;
}
