import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProvider } from "@/lib/providers";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { logger } from "@/lib/logger";

const log = logger.scope("api:following-preview");

export const dynamic = "force-dynamic";

/**
 * Returns the ~10 most-recent accounts a profile followed.
 * - FREE / logged-out: locked (no provider call, no cost — the UI shows a
 *   blurred teaser instead).
 * - PAID (PRO/AGENCY): fetches only the first page of the following list and
 *   returns the first 10 (≈1 provider request).
 */
export async function GET(req: Request) {
  const username = normalizeUsername(new URL(req.url).searchParams.get("username") || "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = await getCurrentUser();
  const paid = !!user && user.plan !== "FREE";
  if (!paid) return NextResponse.json({ locked: true });

  try {
    const result = await getProvider().getFollowing(username, { maxPages: 1, pageSize: 12 });
    const following = result.followers.slice(0, 10);
    return NextResponse.json({ locked: false, following });
  } catch (e) {
    log.warn("following-preview failed", { username, error: (e as Error).message });
    // Don't leak provider errors to the client; treat as empty reveal.
    return NextResponse.json({ locked: false, following: [], error: "unavailable" });
  }
}
