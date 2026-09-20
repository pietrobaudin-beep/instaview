/**
 * Profile service: the write operations behind the track/stop endpoints.
 * Centralizes plan-limit enforcement and job scheduling so both server actions
 * and API routes share one implementation.
 */
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { PLANS, clampInterval, planFor } from "@/lib/plans";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import type { TrackedProfile, User } from "@prisma/client";

const log = logger.scope("profiles");

export class PlanLimitError extends Error {
  constructor(message: string) {
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

  const plan = planFor(user.plan);
  const count = await prisma.trackedProfile.count({ where: { userId: user.id } });
  if (count >= plan.maxProfiles) {
    throw new PlanLimitError(
      plan.id === "AGENCY"
        ? `O Agency acompanha até ${plan.maxProfiles} perfis no Faro. Tire um da lista para colocar outro.`
        : `O ${plan.name} acompanha até ${plan.maxProfiles} perfis no Faro. Tire um da lista, ou passe para o Agency (até ${PLANS.AGENCY.maxProfiles}).`,
    );
  }

  const interval = clampInterval(user.plan, env.DEFAULT_COLLECTION_INTERVAL_MINUTES);

  const profile = await prisma.trackedProfile.create({
    data: {
      username,
      userId: user.id,
      status: "ACTIVE",
      job: {
        create: {
          enabled: true,
          intervalMinutes: interval,
          nextRunAt: new Date(Date.now() + interval * 60_000),
        },
      },
    },
  });

  log.info("profile tracked", { userId: user.id, username, profileId: profile.id, interval });

  // No provider call here. The baseline is taken from the "following" page the
  // analysis already fetched and cached (see /api/following-preview), so
  // putting a profile no Faro costs nothing. Collecting here used to fetch the
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
