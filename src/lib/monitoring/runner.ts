/**
 * Job runner. Finds MonitoringJobs that are due and runs a collection for each.
 * Invoked by the cron endpoint (Vercel Cron / external scheduler / local tick).
 *
 * We never poll from the browser — collections always run here, server-side.
 */
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { collectProfile } from "./snapshot";

const log = logger.scope("runner");

const MAX_CONSECUTIVE_FAILURES = 5; // then pause the job to stop burning budget
const FAILURE_BACKOFF_MINUTES = 30;

export interface RunnerReport {
  claimed: number;
  succeeded: number;
  failed: number;
  results: Array<{ profileId: string; username: string; status: string; newFollowers: number }>;
}

export async function runDueJobs(limit = 25): Promise<RunnerReport> {
  const now = new Date();

  const dueJobs = await prisma.monitoringJob.findMany({
    where: { enabled: true, nextRunAt: { lte: now }, profile: { status: { not: "PAUSED" } } },
    orderBy: { nextRunAt: "asc" },
    take: limit,
    include: { profile: { select: { username: true } } },
  });

  log.info("runner tick", { due: dueJobs.length });

  const report: RunnerReport = { claimed: dueJobs.length, succeeded: 0, failed: 0, results: [] };

  for (const job of dueJobs) {
    const summary = await collectProfile(job.profileId);
    const ok = summary.status !== "FAILED";

    const consecutiveFailures = ok ? 0 : job.consecutiveFailures + 1;
    const shouldPause = consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;

    // Back off after a failure; otherwise schedule the next run normally.
    const delayMinutes = ok
      ? job.intervalMinutes
      : Math.min(job.intervalMinutes, FAILURE_BACKOFF_MINUTES);
    const nextRunAt = new Date(Date.now() + delayMinutes * 60_000);

    await prisma.monitoringJob.update({
      where: { id: job.id },
      data: {
        lastRunAt: now,
        lastRunStatus: summary.status.toLowerCase(),
        consecutiveFailures,
        runCount: { increment: 1 },
        nextRunAt,
        enabled: shouldPause ? false : true,
      },
    });

    if (shouldPause) {
      await prisma.trackedProfile.update({
        where: { id: job.profileId },
        data: { status: "ERROR", lastError: "Paused after repeated collection failures" },
      });
      log.warn("job paused after repeated failures", { profileId: job.profileId });
    }

    report.results.push({
      profileId: job.profileId,
      username: job.profile.username,
      status: summary.status,
      newFollowers: summary.newFollowers,
    });
    if (ok) report.succeeded++;
    else report.failed++;
  }

  return report;
}
