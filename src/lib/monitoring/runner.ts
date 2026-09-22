/**
 * Job runner. Finds MonitoringJobs that are due and runs a collection for each.
 * Invoked by the cron endpoint (Vercel Cron / external scheduler / local tick).
 *
 * We never poll from the browser — collections always run here, server-side.
 *
 * ## O que ele rodava antes, e por que mudou (22/09)
 *
 * Isto chamava `collectProfile`, que busca a **lista de seguidores**. Nenhuma
 * tela do produto lê esses dados: quem os consome é só o `/dashboard` legado.
 * Ou seja, a cadência que os planos vendem — e que o Faro Detetive paga quatro
 * vezes ao dia — estava sendo gasta coletando o que ninguém abre, enquanto o
 * dado que a pessoa vê (stories, posts, quem começou a seguir) era lido uma
 * vez por dia para todo mundo.
 *
 * Agora roda o Faro de verdade, em modo `stories`: a passagem extra lê só o
 * que **expira**. A passagem completa continua sendo a diária das 11h.
 */
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { watchProfile } from "@/lib/faro-watch";

const log = logger.scope("runner");

const MAX_CONSECUTIVE_FAILURES = 5; // then pause the job to stop burning budget
const FAILURE_BACKOFF_MINUTES = 30;

/**
 * Depois de quanto tempo uma passagem precisa ser completa de novo.
 *
 * Abaixo disso, a passagem lê só stories. Vinte horas casa com o cache de
 * posts e marcações: pedi-los antes disso seria pagar por uma resposta que
 * viria do cache de qualquer jeito.
 */
const COMPLETA_A_CADA_MS = 20 * 60 * 60 * 1000;

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
    include: { profile: { select: { username: true, userId: true, lastCollectedAt: true } } },
  });

  log.info("runner tick", { due: dueJobs.length });

  const report: RunnerReport = { claimed: dueJobs.length, succeeded: 0, failed: 0, results: [] };

  for (const job of dueJobs) {
    /*
     * Uma passagem completa por dia; as extras leem só stories.
     *
     * É aqui que a cadência dos planos vira dinheiro. Quem é lido de 6 em 6
     * horas (Faro Detetive) paga 4 requisições na passagem completa e 1 em
     * cada uma das outras três — 7 no dia, em vez das 16 que sairiam lendo
     * tudo quatro vezes. E não perde nada: o que muda de hora em hora é o
     * story, e ele continua sendo lido nas quatro.
     */
    const ultima = job.profile.lastCollectedAt?.getTime() ?? 0;
    const modo = Date.now() - ultima >= COMPLETA_A_CADA_MS ? "completo" : "stories";

    let ok = true;
    let novidades = 0;
    try {
      const r = await watchProfile(
        { id: job.profileId, username: job.profile.username, userId: job.profile.userId },
        modo,
      );
      novidades = r.news;
      ok = r.skipped !== "error";
    } catch (e) {
      log.error("passagem falhou", { profileId: job.profileId, error: (e as Error).message });
      ok = false;
    }

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
        lastRunStatus: ok ? "success" : "failed",
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
      status: ok ? "SUCCESS" : "FAILED",
      newFollowers: novidades,
    });
    if (ok) report.succeeded++;
    else report.failed++;
  }

  return report;
}
