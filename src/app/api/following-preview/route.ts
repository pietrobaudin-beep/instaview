import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProvider } from "@/lib/providers";
import { countGenders, guessGender } from "@/lib/gender";
import {
  FOLLOWING_KIND,
  getRecentFollowingChanges,
  recordFollowing,
  type RecentItem,
} from "@/lib/following-tracker";
import { prisma } from "@/lib/db";
import { peekProfileCached } from "@/lib/profile-cache";
import { checkAllowance, claimAnalysis, consultLimitFor, usageKey } from "@/lib/usage";
import { accessFor } from "@/lib/access";
import { mayRecordFor } from "@/lib/sandbox";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { ProviderError, type FollowerEntry } from "@/lib/providers/types";

const log = logger.scope("api:following-preview");

export const dynamic = "force-dynamic";

// Cache the REAL following per @ so repeated views don't re-charge the provider.
const cache = new Map<string, { at: number; users: FollowerEntry[]; brands: number }>();
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
  // Revealed for Pro, and for a one-off unlock of THIS profile ("uso único").
  const access = await accessFor(user, username);
  const paid = access !== "free";

  // Free plan: one profile only. Checked before any provider call, so an extra
  // analysis never costs credits.
  if (!paid) {
    const key = usageKey(user);
    const allowance = await checkAllowance(key, username, consultLimitFor(user));
    if (!allowance.allowed) {
      return NextResponse.json(
        { limited: true, used: allowance.used, limit: allowance.limit, spentOn: allowance.spentOn },
        { status: 402 },
      );
    }
    await claimAnalysis(key, username);
  }

  // Fetch (or reuse cached) real following — ONE page only (~1 provider request).
  let all: FollowerEntry[] = [];
  let brands = 0;
  let isPrivate = false;
  let fresh = false;
  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < TTL) {
    all = hit.users;
    brands = hit.brands;
  } else {
    try {
      const result = await getProvider().getFollowing(username, { maxPages: 1, pageSize: 50 });
      // Famous/brand accounts (verified) are noise for the list itself, but we
      // keep the count so the breakdown can show a "Marcas" slice.
      brands = result.followers.filter((u) => u.isVerified).length;
      all = result.followers.filter((u) => !u.isVerified);
      fresh = true;
      cache.set(username, { at: Date.now(), users: all, brands });
    } catch (e) {
      // Private accounts: Instagram only shows their following to approved
      // followers, so no provider can read it. Report it explicitly.
      if (e instanceof ProviderError && e.code === "PRIVATE") isPrivate = true;
      else log.warn("following fetch failed", { username, error: (e as Error).message });
      all = [];
    }
  }

  // History — only for profiles a Pro user put "no Faro". Viewing a profile is
  // a one-off look; it no longer creates a rastro on its own.
  //
  // A snapshot is written when the page was freshly fetched, or when the
  // profile was just pinned and has no baseline yet — in that case the cached
  // page is good enough, so the baseline costs no provider request.
  let recent: { started: RecentItem[]; stopped: RecentItem[] } = { started: [], stopped: [] };
  if (user && access === "pro" && !isPrivate && mayRecordFor(user.email)) {
    try {
      const tracked = await prisma.trackedProfile.findUnique({
        where: { userId_username: { userId: user.id, username } },
        select: { id: true },
      });
      if (tracked) {
        const hasBaseline =
          (await prisma.followerSnapshot.count({
            where: { profileId: tracked.id, kind: FOLLOWING_KIND },
          })) > 0;

        if ((fresh || !hasBaseline) && all.length > 0) {
          // Profile totals come from the preview lookup already cached — never
          // a new provider request — so the history chart and the "alterou a
          // bio" / "ficou privada" alerts have something to compare.
          const p = await peekProfileCached(username);
          await recordFollowing(
            user.id,
            {
              username,
              displayName: p?.displayName ?? null,
              avatarUrl: p?.avatarUrl ?? null,
              bio: p?.bio ?? null,
              followersCount: p?.followersCount,
              followingCount: p?.followingCount,
              isVerified: p?.isVerified,
              isPrivate: p?.isPrivate,
            },
            all,
          );
        }
        recent = await getRecentFollowingChanges(tracked.id, 5);
      }
    } catch (e) {
      log.warn("history failed", { username, error: (e as Error).message });
    }
  }

  // Aggregate gender estimate over everything we fetched (safe to show free —
  // it's a count, not an identity). Computed from the same single request.
  const g = countGenders(all.map((u) => ({ displayName: u.displayName, username: u.username })));
  // Share of the page we read, so the three bars add up to something honest.
  const total = all.length + brands;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const counts = {
    ...g,
    brands,
    total,
    percent: { girls: pct(g.girls), boys: pct(g.boys), brands: pct(brands) },
  };

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
    access,
    counts,
    following: out,
    recent: { started: maskRecent(recent.started), stopped: maskRecent(recent.stopped) },
    real: all.length > 0,
    private: isPrivate,
  });
}
