import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProvider } from "@/lib/providers";
import { countGenders, guessGender } from "@/lib/gender";
import { getRecentFollowingChanges, recordFollowing, type RecentItem } from "@/lib/following-tracker";
import { prisma } from "@/lib/db";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { ProviderError, type FollowerEntry } from "@/lib/providers/types";

const log = logger.scope("api:following-preview");

export const dynamic = "force-dynamic";

// Cache the REAL following per @ so repeated views don't re-charge the provider.
const cache = new Map<string, { at: number; users: FollowerEntry[] }>();
const TTL = 24 * 60 * 60 * 1000; // 24 hours — minimise repeat provider charges

/** Mask an identity so the free (blurred) tier doesn't leak names via DevTools. */
function mask(u: FollowerEntry): FollowerEntry {
  const keep = u.username.slice(0, 2);
  return {
    username: keep + "•".repeat(Math.max(3, Math.min(9, u.username.length - 2))),
    displayName: null,
    avatarUrl: u.avatarUrl, // real photo (shown blurred) — count/faces are real
    isVerified: u.isVerified,
  };
}

/**
 * Returns the accounts a profile recently followed — REAL data (HikerAPI).
 * - PAID (PRO/AGENCY): full, revealed.
 * - FREE / logged-out: same REAL results but masked + flagged locked, so the UI
 *   blurs them. One provider request per @ (cached 1h).
 */
export async function GET(req: Request) {
  const username = normalizeUsername(new URL(req.url).searchParams.get("username") || "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = await getCurrentUser();
  const paid = !!user && user.plan !== "FREE";

  // Fetch (or reuse cached) real following — ONE page only (~1 provider request).
  let all: FollowerEntry[] = [];
  let isPrivate = false;
  let fresh = false;
  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < TTL) {
    all = hit.users;
  } else {
    try {
      const result = await getProvider().getFollowing(username, { maxPages: 1, pageSize: 50 });
      // Famous/brand accounts (verified) are noise for this product — keep
      // only real people, for both the list and the gender counts.
      all = result.followers.filter((u) => !u.isVerified);
      fresh = true;
      cache.set(username, { at: Date.now(), users: all });
    } catch (e) {
      // Private accounts: Instagram only shows their following to approved
      // followers, so no provider can read it. Report it explicitly.
      if (e instanceof ProviderError && e.code === "PRIVATE") isPrivate = true;
      else log.warn("following fetch failed", { username, error: (e as Error).message });
      all = [];
    }
  }

  // History: record this snapshot for logged-in users so we can show who they
  // started / stopped following over time. Uses the page we already fetched.
  let recent: { started: RecentItem[]; stopped: RecentItem[] } = { started: [], stopped: [] };
  if (user && !isPrivate) {
    try {
      let profileId: string | null = null;
      if (fresh && all.length > 0) {
        profileId = await recordFollowing(user.id, { username }, all);
      } else {
        const p = await prisma.trackedProfile.findUnique({
          where: { userId_username: { userId: user.id, username } },
          select: { id: true },
        });
        profileId = p?.id ?? null;
      }
      if (profileId) recent = await getRecentFollowingChanges(profileId, 5);
    } catch (e) {
      log.warn("history failed", { username, error: (e as Error).message });
    }
  }

  // Aggregate gender estimate over everything we fetched (safe to show free —
  // it's a count, not an identity). Computed from the same single request.
  const counts = countGenders(all.map((u) => ({ displayName: u.displayName, username: u.username })));

  // Only the first rows are shown; masked for free so names don't leak — but we
  // always send the estimated gender so the teaser can label each row.
  const out = all.slice(0, 12).map((u) => ({
    ...(paid ? u : mask(u)),
    gender: guessGender(u.displayName, u.username),
  }));
  const maskRecent = (items: RecentItem[]) =>
    paid ? items : items.map((i) => ({ ...mask(i), detectedAt: i.detectedAt }));

  return NextResponse.json({
    locked: !paid,
    counts,
    following: out,
    recent: { started: maskRecent(recent.started), stopped: maskRecent(recent.stopped) },
    real: all.length > 0,
    private: isPrivate,
  });
}
