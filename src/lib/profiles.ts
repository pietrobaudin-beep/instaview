/**
 * Profile service: the write operations behind the track/stop endpoints.
 * Centralizes plan-limit enforcement and job scheduling so both server actions
 * and API routes share one implementation.
 */
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { direitosDe, inicioDoCiclo } from "@/lib/direitos";
import { reservar, reservarBruto, usadosBruto } from "@/lib/franquia";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import type { TrackedProfile, User } from "@prisma/client";

const log = logger.scope("profiles");

export class PlanLimitError extends Error {
  constructor(
    message: string,
    /** `sem_faro` = o plano não acompanha (hora de oferecer); o resto é recado. */
    readonly code?: "sem_faro",
  ) {
    super(message);
    this.name = "PlanLimitError";
  }
}
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export async function trackProfile(user: User, rawUsername: string): Promise<TrackedProfile> {
  const username = normalizeUsername(rawUsername);
  if (!isValidUsername(username)) {
    throw new ValidationError("That doesn't look like a valid Instagram username.");
  }

  const existing = await prisma.trackedProfile.findUnique({
    where: { userId_username: { userId: user.id, username } },
  });
  if (existing) return existing;

  const { config: plan, admin } = direitosDe(user);
  if (!admin && plan.maxProfiles <= 0) {
    throw new PlanLimitError(`O ${plan.name} não acompanha perfis. O acompanhamento é do Faro de Cão e do Faro de Detetive.`, "sem_faro");
  }

  // Quantos estão no Faro AI agora.
  const count = await prisma.trackedProfile.count({ where: { userId: user.id } });
  if (count >= plan.maxProfiles) {
    throw new PlanLimitError(
      `Seu Faro AI está cheio. O ${plan.name} acompanha ${plan.maxProfiles} ` +
        `perfil${plan.maxProfiles === 1 ? "" : "s"} por vez.`,
    );
  }

  /*
   * E quantos ENTRARAM neste ciclo. Sem isto, tirar e pôr outro perfil
   * trocaria de pessoa quantas vezes quisesse no mês — cada troca com uma
   * primeira coleta paga. Remover não devolve a vaga do ciclo.
   *
   * Os planos antigos seguem a regra de antes (só o limite simultâneo).
   */
  if (!admin && !plan.legado) {
    // Voltar com o MESMO @ no mesmo ciclo não é troca: não gasta vaga nova.
    const ciclo = inicioDoCiclo(user);
    const jaEntrou = (await usadosBruto(user.id, `perfil:${username}`, ciclo)) > 0;
    const vaga = jaEntrou ? { ok: true } : await reservar(user, "perfil");
    if (vaga.ok && !jaEntrou) await reservarBruto(user.id, `perfil:${username}`, ciclo, 1);
    if (!vaga.ok) {
      throw new PlanLimitError(
        `O ${plan.name} acompanha ${plan.maxProfiles} perfil por ciclo, sem troca. ` +
          `Você poderá escolher outro quando o ciclo renovar.`,
      );
    }
  }

  const interval = plan.cadenciaHoras * 60;

  const profile = await prisma.trackedProfile.create({
    data: {
      username,
      userId: user.id,
      status: "ACTIVE",
      job: {
        create: {
          enabled: true,
          intervalMinutes: interval,
          /*
           * A primeira leitura é JÁ — na próxima volta do cron de hora em hora.
           *
           * Estava `agora + intervalo`: com o PRO lido de 24 em 24 horas, o
           * perfil recém-colocado no Faro AI só era lido no dia seguinte. Em
           * 24/09 isso escondeu 28 stories da @crespadai: a pessoa acabara de
           * vê-los na análise, colocou o perfil no Faro AI, e o painel dizia
           * "nenhum story guardado ainda". Story dura 24 horas — esperar um
           * intervalo inteiro antes de começar é perder justamente os que
           * trouxeram a pessoa até aqui.
           */
          nextRunAt: new Date(),
        },
      },
    },
  });

  log.info("profile tracked", { userId: user.id, username, profileId: profile.id, interval });

  // No provider call here. The baseline is taken from the "following" page the
  // analysis already fetched and cached (see /api/following-preview), so
  // putting a profile no Faro AI costs nothing. Collecting here used to fetch the
  // FOLLOWERS list — several paid requests for data this product never shows.
  return profile;
}

export async function setMonitoring(userId: string, profileId: string, enabled: boolean) {
  const profile = await prisma.trackedProfile.findFirst({ where: { id: profileId, userId } });
  if (!profile) throw new ValidationError("Profile not found");

  await prisma.$transaction([
    prisma.trackedProfile.update({
      where: { id: profileId },
      data: { status: enabled ? "ACTIVE" : "PAUSED" },
    }),
    prisma.monitoringJob.update({
      where: { profileId },
      data: { enabled },
    }),
  ]);
  log.info("monitoring toggled", { profileId, enabled });
}

export async function getUserProfiles(userId: string) {
  return prisma.trackedProfile.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { job: true },
  });
}
