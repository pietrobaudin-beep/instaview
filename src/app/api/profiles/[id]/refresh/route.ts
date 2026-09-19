import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { collectProfile } from "@/lib/monitoring/snapshot";

/** Manual "Refresh now" — runs a collection on demand for the owner. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await prisma.trackedProfile.findFirst({
    where: { id: params.id, userId: user.id },
    include: { job: true },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // A manual refresh is a real provider collection. Never let repeated taps
  // bypass the per-profile schedule and burn Hiker credits. The dashboard can
  // render this exact time as "Próximo farejo" without making another call.
  const now = new Date();
  if (profile.job?.nextRunAt && profile.job.nextRunAt > now) {
    return NextResponse.json(
      {
        error: "Este perfil já está atualizado. O próximo farejo está agendado.",
        code: "refresh_not_due",
        nextRunAt: profile.job.nextRunAt.toISOString(),
      },
      { status: 429 },
    );
  }

  const summary = await collectProfile(profile.id);
  const completedAt = new Date();

  // Reset the schedule after an on-demand collection too. Without this, a
  // cron job that was already due could collect the same profile immediately
  // again and pay twice for the same information.
  if (profile.job) {
    const failed = summary.status === "FAILED";
    await prisma.monitoringJob.update({
      where: { profileId: profile.id },
      data: {
        lastRunAt: completedAt,
        lastRunStatus: summary.status.toLowerCase(),
        consecutiveFailures: failed ? { increment: 1 } : 0,
        runCount: { increment: 1 },
        nextRunAt: new Date(completedAt.getTime() + profile.job.intervalMinutes * 60_000),
      },
    });
  }

  return NextResponse.json({ ...summary, nextRunAt: profile.job
    ? new Date(completedAt.getTime() + profile.job.intervalMinutes * 60_000).toISOString()
    : null });
}
