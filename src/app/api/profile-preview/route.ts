import { NextResponse } from "next/server";
import { getProfileCached } from "@/lib/profile-cache";
import { ProviderError } from "@/lib/providers/types";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/auth";
import { checkAllowance, usageKey } from "@/lib/usage";
import { accessFor } from "@/lib/access";

const log = logger.scope("api:preview");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = normalizeUsername(url.searchParams.get("username") || "");
  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Free plan: do not look up profiles beyond the one analysis they get.
  // A one-off unlock of this profile bypasses the free allowance.
  const user = await getCurrentUser();
  if ((await accessFor(user, username)) === "free") {
    const allowance = await checkAllowance(usageKey(user), username);
    if (!allowance.allowed) {
      return NextResponse.json(
        { error: "limit_reached", spentOn: allowance.spentOn },
        { status: 402 },
      );
    }
  }

  try {
    // Shared 24h cache — repeat views of the same @ cost the provider nothing.
    const { profile: p, fetchedAt } = await getProfileCached(username);
    return NextResponse.json({
      username: p.username,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      bio: p.bio,
      externalUrl: p.externalUrl ?? null,
      isVerified: p.isVerified,
      isPrivate: p.isPrivate,
      followersCount: p.followersCount,
      followingCount: p.followingCount,
      postsCount: p.postsCount,
      analyzedAt: fetchedAt.toISOString(),
    });
  } catch (e) {
    const code = e instanceof ProviderError ? e.code : "UNKNOWN";
    if (code !== "NOT_FOUND") log.warn("preview failed", { username, code });
    if (code === "NOT_FOUND") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (code === "RATE_LIMIT") return NextResponse.json({ error: "quota" }, { status: 429 });
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
