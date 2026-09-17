import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProvider } from "@/lib/providers";
import { rankInteractions, type Interaction } from "@/lib/interactions";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { logger } from "@/lib/logger";

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
  if (!user || user.plan === "FREE") return NextResponse.json({ locked: true, items: [] });

  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json({ locked: false, items: hit.items });
  }

  const provider = getProvider();
  if (!provider.getRecentMedia) return NextResponse.json({ locked: false, items: [] });

  try {
    const posts = await provider.getRecentMedia(username);
    const items = rankInteractions(posts, username, 5).filter((i) => !i.isVerified);
    cache.set(username, { at: Date.now(), items });
    return NextResponse.json({ locked: false, items });
  } catch (e) {
    log.warn("interactions failed", { username, error: (e as Error).message });
    return NextResponse.json({ locked: false, items: [] });
  }
}
