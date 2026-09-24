import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProvider } from "@/lib/providers";
import { guessGender } from "@/lib/gender";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { FollowerEntry } from "@/lib/providers/types";
import { accessFor } from "@/lib/access";
import { direitosDe } from "@/lib/direitos";

const log = logger.scope("api:first-follows");

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The accounts a profile followed FIRST (the tail of the following list, which
 * Instagram returns newest-first). Reaching the tail means paginating the whole
 * list, so this is PRO-only, capped, and cached for a day.
 */
const cache = new Map<string, { at: number; items: (FollowerEntry & { gender: string })[] }>();
const TTL = 24 * 60 * 60 * 1000;
const MAX_PAGES = 4; // ~200 accounts; keeps the cost per profile small

export async function GET(req: Request) {
  const username = normalizeUsername(new URL(req.url).searchParams.get("username") || "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = await getCurrentUser();
  /*
   * Varre até 4 páginas da lista (≈ 5 leituras) — fora do pacote de 6 da
   * análise. Na estrutura de 24/09 nenhum plano novo inclui isto; fica para
   * os planos antigos, que já tinham, e para o Admin.
   */
  const d = direitosDe(user);
  if (!user || !(d.admin || d.config.legado)) return NextResponse.json({ locked: true, items: [] });
  if ((await accessFor(user, username)) === "free") return NextResponse.json({ locked: true, items: [] });

  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json({ locked: false, items: hit.items });
  }

  try {
    const result = await getProvider().getFollowing(username, { maxPages: MAX_PAGES, pageSize: 50 });
    // Keep real people only, then take the oldest (end of the list).
    const people = result.followers.filter((u) => !u.isVerified);
    const items = people
      .slice(-10)
      .reverse()
      .map((u) => ({ ...u, gender: guessGender(u.displayName, u.username) }));
    cache.set(username, { at: Date.now(), items });
    return NextResponse.json({ locked: false, items, partial: result.truncated });
  } catch (e) {
    log.warn("first-follows failed", { username, error: (e as Error).message });
    return NextResponse.json({ locked: false, items: [] });
  }
}
