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
 * Agora roda o Faro AI de verdade, em modo `stories`: a passagem extra lê só o
 * que **expira**. A passagem completa continua sendo a diária das 11h.
 */
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { coletarSeDevido } from "@/lib/faro-watch";

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
     * A porta única decide: plano do dono, cadência (72h no Cão, 24h no
     * Detetive) e franquia de coletas. Antes o runner lia o intervalo gravado
     * no job quando o perfil entrou — e ele nunca mudava com o plano: quem
     * caía para o grátis continuava sendo coletado.
     */
    let ok = true;
    let novidades = 0;
    let proxima = new Date(Date.now() + 24 * 60 * 60_000);
    let pulado = false;
    try {
      const c = await coletarSeDevido(job.profileId);
      novidades = c.news ?? 0;
      proxima = c.proxima;
      // Pular por cadência, franquia ou plano não é falha: é a regra.
      pulado = !c.ok && (c.pulo === "cedo" || c.pulo === "franquia" || c.pulo === "sem_plano");
      ok = c.ok || pulado;
    } catch (e) {
      log.error("passagem falhou", { profileId: job.profileId, error: (e as Error).message });
      ok = false;
    }

    const consecutiveFailures = ok ? 0 : job.consecutiveFailures + 1;
    const shouldPause = consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;

    // Back off after a failure; otherwise the gate said when to come back.
    const nextRunAt = ok ? proxima : new Date(Date.now() + FAILURE_BACKOFF_MINUTES * 60_000);

    await prisma.monitoringJob.update({
      where: { id: job.id },
      data: {
        lastRunAt: now,
        lastRunStatus: pulado ? "skipped" : ok ? "success" : "failed",
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
