import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRecentMediaCached } from "@/lib/media-cache";
import { rankInteractions, type Interaction } from "@/lib/interactions";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { accessFor } from "@/lib/access";

const log = logger.scope("api:interactions");

export const dynamic = "force-dynamic";

const cache = new Map<string, { at: number; items: Interaction[] }>();
const TTL = 24 * 60 * 60 * 1000;

/**
 * Top accounts a profile interacts with, from its recent posts.
 * Only fetched for PAID users — free visitors get `locked` with no provider
 * call, so they never cost credits.
 */
export async function GET(req: Request) {
  const username = normalizeUsername(new URL(req.url).searchParams.get("username") || "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = await getCurrentUser();
  if ((await accessFor(user, username)) === "free") {
    return NextResponse.json({ locked: true, items: [] });
  }

  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json({ locked: false, items: hit.items });
  }

  try {
    const posts = await getRecentMediaCached(username);
    // Filter famous accounts first, then take the top 5 — otherwise a
    // celebrity-heavy top 5 would leave nothing behind.
    const items = rankInteractions(posts, username, 60)
      .filter((i) => !i.isVerified)
      .slice(0, 5);
    cache.set(username, { at: Date.now(), items });
    return NextResponse.json({ locked: false, items });
  } catch (e) {
    log.warn("interactions failed", { username, error: (e as Error).message });
    return NextResponse.json({ locked: false, items: [] });
  }
}
