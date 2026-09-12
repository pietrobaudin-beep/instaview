import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProvider } from "@/lib/providers";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { FollowerEntry } from "@/lib/providers/types";

const log = logger.scope("api:following-preview");

export const dynamic = "force-dynamic";

// Cache the REAL following per @ so repeated views don't re-charge the provider.
const cache = new Map<string, { at: number; users: FollowerEntry[] }>();
const TTL = 60 * 60 * 1000; // 1 hour

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

  // Fetch (or reuse cached) real following.
  let users: FollowerEntry[] = [];
  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < TTL) {
    users = hit.users;
  } else {
    try {
      const result = await getProvider().getFollowing(username, { maxPages: 1, pageSize: 12 });
      users = result.followers.slice(0, 12);
      cache.set(username, { at: Date.now(), users });
    } catch (e) {
      log.warn("following fetch failed", { username, error: (e as Error).message });
      users = [];
    }
  }

  // When the active provider can't return following (e.g. mock/ensembledata),
  // `users` is empty; the client falls back to a blurred placeholder teaser.
  const out = paid ? users : users.map(mask);
  return NextResponse.json({ locked: !paid, following: out, real: users.length > 0 });
}
