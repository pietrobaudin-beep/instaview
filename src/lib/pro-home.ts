/**
 * Data for the Pro home: what Faro found since yesterday across every profile
 * the user put in the Faro. Reads stored changes only — opening the home never
 * calls the data provider.
 */
import { prisma } from "@/lib/db";
import { FOLLOWING_KIND } from "@/lib/following-tracker";
import { COMMENTS_KIND, LIKES_KIND } from "@/lib/post-activity";
import { activityLevel, type ActivityLevel, type PistaKind } from "@/lib/voice";

const DAY = 24 * 60 * 60 * 1000;
const KINDS = [FOLLOWING_KIND, LIKES_KIND, COMMENTS_KIND];

export interface FaroProfile {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** Changes detected since yesterday. */
  novidades: number;
  level: ActivityLevel;
}

export interface RastroItem {
  id: string;
  kind: PistaKind;
  subject: string;
  subjectAvatarUrl: string | null;
  target: string;
  targetAvatarUrl: string | null;
  detectedAt: string;
}

export interface ProHome {
  pistasSinceYesterday: number;
  follows: number;
  unfollows: number;
  interactions: number;
  profiles: FaroProfile[];
  recent: RastroItem[];
}

function kindOf(kind: string, type: "FOLLOW" | "UNFOLLOW"): PistaKind {
  if (kind === FOLLOWING_KIND) return type === "FOLLOW" ? "follow" : "unfollow";
  return "interaction";
}

export async function getProHome(userId: string): Promise<ProHome | null> {
  const profiles = await prisma.trackedProfile.findMany({
    where: { userId },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
    orderBy: { updatedAt: "desc" },
  });
  if (profiles.length === 0) return null;

  const ids = profiles.map((p) => p.id);
  const since = new Date(Date.now() - DAY);
  const weekAgo = new Date(Date.now() - 7 * DAY);

  // Real people only — verified/brand accounts are out of scope everywhere.
  const base = { profileId: { in: ids }, kind: { in: KINDS }, isVerified: false };

  const [today, week, recentRows] = await Promise.all([
    prisma.followerChange.findMany({
      where: { ...base, detectedAt: { gte: since } },
      select: { profileId: true, kind: true, type: true },
    }),
    prisma.followerChange.groupBy({
      by: ["profileId"],
      where: { ...base, detectedAt: { gte: weekAgo } },
      _count: { _all: true },
    }),
    prisma.followerChange.findMany({
      where: base,
      orderBy: { detectedAt: "desc" },
      take: 12,
    }),
  ]);

  let follows = 0;
  let unfollows = 0;
  let interactions = 0;
  const todayBy = new Map<string, number>();
  for (const c of today) {
    const k = kindOf(c.kind, c.type);
    if (k === "follow") follows++;
    else if (k === "unfollow") unfollows++;
    else interactions++;
    todayBy.set(c.profileId, (todayBy.get(c.profileId) ?? 0) + 1);
  }
  const weekBy = new Map(week.map((w) => [w.profileId, w._count._all]));
  const byId = new Map(profiles.map((p) => [p.id, p]));

  return {
    pistasSinceYesterday: today.length,
    follows,
    unfollows,
    interactions,
    profiles: profiles
      .map((p) => ({
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        novidades: todayBy.get(p.id) ?? 0,
        level: activityLevel(weekBy.get(p.id) ?? 0),
      }))
      // Busiest first, so the profile with news is the first thing you see.
      .sort((a, b) => b.novidades - a.novidades),
    recent: recentRows.map((c) => {
      const p = byId.get(c.profileId);
      return {
        id: c.id,
        kind: kindOf(c.kind, c.type),
        subject: p?.username ?? "",
        subjectAvatarUrl: p?.avatarUrl ?? null,
        target: c.followerUsername,
        targetAvatarUrl: c.avatarUrl,
        detectedAt: c.detectedAt.toISOString(),
      };
    }),
  };
}

/** Current hour in Brazil — the server runs in UTC, the audience does not. */
export function brazilHour(): number {
  const h = new Date().toLocaleString("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  });
  return Number(h) % 24;
}
