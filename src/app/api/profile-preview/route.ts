import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { ProviderError } from "@/lib/providers/types";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { logger } from "@/lib/logger";

const log = logger.scope("api:preview");

export const dynamic = "force-dynamic";

// Small in-memory cache to avoid re-fetching (and re-charging the provider) the
// same handle repeatedly while someone types. Survives within a warm instance.
interface Cached {
  at: number;
  data: unknown;
}
const cache = new Map<string, Cached>();
const TTL = 60 * 60 * 1000; // 1 hour

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = normalizeUsername(url.searchParams.get("username") || "");
  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json(hit.data);
  }

  try {
    const p = await getProvider().getProfile(username);
    const data = {
      username: p.username,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      isVerified: p.isVerified,
      isPrivate: p.isPrivate,
      followersCount: p.followersCount,
    };
    cache.set(username, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch (e) {
    const code = e instanceof ProviderError ? e.code : "UNKNOWN";
    if (code !== "NOT_FOUND") log.warn("preview failed", { username, code });
    return NextResponse.json({ error: code === "NOT_FOUND" ? "not_found" : "unavailable" }, {
      status: code === "NOT_FOUND" ? 404 : 502,
    });
  }
}
