/**
 * History for a tracked profile: the chart series, the activity timeline and
 * the plain-language alerts shown on the analysis page.
 *
 * Everything here reads from snapshots we already stored — it never calls the
 * data provider, so opening the history costs nothing.
 */
import { prisma } from "@/lib/db";
import { FOLLOWING_KIND } from "@/lib/following-tracker";

export interface SeriesPoint {
  at: string;
  followers: number;
  following: number;
}

export interface TimelineItem {
  type: "FOLLOW" | "UNFOLLOW";
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  detectedAt: string;
}

export type AlertTone = "accent" | "success" | "danger" | "muted";

export interface AlertItem {
  tone: AlertTone;
  text: string;
}

export interface ProfileHistory {
  analyses: number;
  lastAnalyzedAt: string | null;
  series: SeriesPoint[];
  timeline: TimelineItem[];
  alerts: AlertItem[];
}

export const EMPTY_HISTORY: ProfileHistory = {
  analyses: 0,
  lastAnalyzedAt: null,
  series: [],
  timeline: [],
  alerts: [],
};

export async function getProfileHistory(profileId: string): Promise<ProfileHistory> {
  const [snapshots, changes] = await Promise.all([
    prisma.followerSnapshot.findMany({
      where: { profileId, kind: FOLLOWING_KIND, status: "SUCCESS" },
      orderBy: { startedAt: "asc" },
      select: {
        startedAt: true,
        followersCount: true,
        followingCount: true,
        bio: true,
        isPrivate: true,
      },
      take: 60,
    }),
    // Real people only — this product is about who the person actually knows.
    prisma.followerChange.findMany({
      where: { profileId, kind: FOLLOWING_KIND, isVerified: false },
      orderBy: { detectedAt: "desc" },
      take: 20,
    }),
  ]);

  const series: SeriesPoint[] = snapshots
    .filter((s) => s.followersCount > 0 || s.followingCount > 0)
    .map((s) => ({
      at: s.startedAt.toISOString(),
      followers: s.followersCount,
      following: s.followingCount,
    }));

  const timeline: TimelineItem[] = changes.map((c) => ({
    type: c.type,
    username: c.followerUsername,
    displayName: c.displayName,
    avatarUrl: c.avatarUrl,
    detectedAt: c.detectedAt.toISOString(),
  }));

  const last = snapshots.at(-1) ?? null;
  const previous = snapshots.length > 1 ? snapshots.at(-2)! : null;

  const alerts: AlertItem[] = [];
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const followsToday = changes.filter(
    (c) => c.type === "FOLLOW" && c.detectedAt.getTime() >= dayAgo,
  );
  const unfollowsToday = changes.filter(
    (c) => c.type === "UNFOLLOW" && c.detectedAt.getTime() >= dayAgo,
  );

  if (followsToday.length > 0) {
    alerts.push({
      tone: "success",
      text:
        followsToday.length === 1
          ? "Seguiu 1 perfil novo nas últimas 24 horas."
          : `Seguiu ${followsToday.length} perfis novos nas últimas 24 horas.`,
    });
  }
  if (unfollowsToday.length > 0) {
    alerts.push({
      tone: "danger",
      text:
        unfollowsToday.length === 1
          ? "Deixou de seguir 1 perfil nas últimas 24 horas."
          : `Deixou de seguir ${unfollowsToday.length} perfis nas últimas 24 horas.`,
    });
  }

  if (previous && last) {
    if ((previous.bio ?? "") !== (last.bio ?? "") && (previous.bio || last.bio)) {
      alerts.push({ tone: "accent", text: "O perfil alterou a bio." });
    }
    if (!previous.isPrivate && last.isPrivate) {
      alerts.push({ tone: "danger", text: "A conta ficou privada." });
    }
    if (previous.isPrivate && !last.isPrivate) {
      alerts.push({ tone: "success", text: "A conta voltou a ser pública." });
    }
    const delta = last.followersCount - previous.followersCount;
    if (delta !== 0 && previous.followersCount > 0) {
      alerts.push({
        tone: delta > 0 ? "success" : "muted",
        text:
          delta > 0
            ? `Ganhou ${delta.toLocaleString("pt-BR")} seguidores desde a última análise.`
            : `Perdeu ${Math.abs(delta).toLocaleString("pt-BR")} seguidores desde a última análise.`,
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      tone: "muted",
      text:
        snapshots.length <= 1
          ? "Primeira análise salva. As próximas vão comparar com esta."
          : "Nenhuma mudança detectada desde a última análise.",
    });
  }

  return {
    analyses: snapshots.length,
    lastAnalyzedAt: last ? last.startedAt.toISOString() : null,
    series,
    timeline,
    alerts,
  };
}
