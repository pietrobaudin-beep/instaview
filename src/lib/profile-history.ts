/**
 * History for a tracked profile: the chart series, the activity timeline and
 * the plain-language alerts shown on the analysis page.
 *
 * Everything here reads from snapshots we already stored — it never calls the
 * data provider, so opening the history costs nothing.
 */
import { prisma } from "@/lib/db";
import { FOLLOWING_KIND } from "@/lib/following-tracker";
import type { EventData } from "@/lib/faro-watch";

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

/** Something new the daily Faro found (post, reel, story, tag). */
export interface NewsItem {
  kind: string;
  detectedAt: string;
  data: EventData;
}

export interface ProfileHistory {
  analyses: number;
  lastAnalyzedAt: string | null;
  series: SeriesPoint[];
  timeline: TimelineItem[];
  alerts: AlertItem[];
  news: NewsItem[];
}

export const EMPTY_HISTORY: ProfileHistory = {
  analyses: 0,
  lastAnalyzedAt: null,
  series: [],
  timeline: [],
  alerts: [],
  news: [],
};

export async function getProfileHistory(profileId: string): Promise<ProfileHistory> {
  const [snapshots, changes, events] = await Promise.all([
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
    // What the daily Faro found — never the baseline it started from.
    prisma.profileEvent.findMany({
      where: { profileId, baseline: false },
      orderBy: { detectedAt: "desc" },
      take: 30,
    }),
  ]);

  const news: NewsItem[] = events.map((e) => ({
    kind: e.kind,
    detectedAt: e.detectedAt.toISOString(),
    data: e.data as unknown as EventData,
  }));

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

  const today = followsToday.length + unfollowsToday.length;
  if (today >= 5) {
    alerts.push({
      tone: "accent",
      text: `🐾 O Faro esteve ocupado hoje. Encontramos ${today} mudanças.`,
    });
  }

  const fresh = (kind: string) => events.filter((e) => e.kind === kind && e.detectedAt.getTime() >= dayAgo).length;
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many.replace("#", String(n)));
  const [posts, reels, stories, tags] = [fresh("post"), fresh("reel"), fresh("story"), fresh("tagged")];
  if (posts) alerts.push({ tone: "accent", text: plural(posts, "📸 Postou algo novo.", "📸 # posts novos.") });
  if (reels) alerts.push({ tone: "accent", text: plural(reels, "🎬 Reel novo no ar.", "🎬 # reels novos.") });
  if (stories) alerts.push({ tone: "accent", text: plural(stories, "⏱️ Story novo nas últimas 24h.", "⏱️ # stories novos nas últimas 24h.") });
  if (tags) alerts.push({ tone: "success", text: plural(tags, "🏷️ Foi marcado(a) num post novo.", "🏷️ Foi marcado(a) em # posts novos.") });

  if (followsToday.length > 0) {
    alerts.push({
      tone: "success",
      text:
        followsToday.length === 1
          ? "🐶 Faro encontrou alguém novo nas últimas 24 horas."
          : `🐶 Faro encontrou ${followsToday.length} pessoas novas nas últimas 24 horas.`,
    });
  }
  if (unfollowsToday.length > 0) {
    alerts.push({
      tone: "danger",
      text:
        unfollowsToday.length === 1
          ? "👀 Um rastro sumiu nas últimas 24 horas."
          : `👀 ${unfollowsToday.length} rastros sumiram nas últimas 24 horas.`,
    });
  }

  if (previous && last) {
    if ((previous.bio ?? "") !== (last.bio ?? "") && (previous.bio || last.bio)) {
      alerts.push({ tone: "accent", text: "✏️ O perfil alterou a bio." });
    }
    if (!previous.isPrivate && last.isPrivate) {
      alerts.push({ tone: "danger", text: "🔒 A conta ficou privada." });
    }
    if (previous.isPrivate && !last.isPrivate) {
      alerts.push({ tone: "success", text: "🔓 A conta voltou a ser pública." });
    }
    const delta = last.followersCount - previous.followersCount;
    if (delta !== 0 && previous.followersCount > 0) {
      alerts.push({
        tone: delta > 0 ? "success" : "muted",
        text: `${delta > 0 ? "Ganhou" : "Perdeu"} ${Math.abs(delta).toLocaleString("pt-BR")} ${
          Math.abs(delta) === 1 ? "seguidor" : "seguidores"
        } desde a última análise.`,
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      tone: "muted",
      text:
        snapshots.length <= 1
          ? "🐾 Primeiro rastro salvo. As próximas análises vão comparar com este."
          : "😴 Faro pode descansar. Nenhuma mudança desde a última análise.",
    });
  }

  return {
    analyses: snapshots.length,
    lastAnalyzedAt: last ? last.startedAt.toISOString() : null,
    series,
    timeline,
    alerts,
    news,
  };
}
