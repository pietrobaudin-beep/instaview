import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProvider } from "@/lib/providers";
import { guessGender } from "@/lib/gender";
import { quemSao } from "@/lib/classificacao-ia";
import {
  FOLLOWING_KIND,
  getRecentFollowingChanges,
  recordFollowing,
  type RecentItem,
} from "@/lib/following-tracker";
import { prisma } from "@/lib/db";
import { peekProfileCached } from "@/lib/profile-cache";
import { checarConsulta, respostaDeLimite } from "@/lib/consulta";
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

  // Esta é a rota que representa a análise, então é aqui que o gasto é
  // registrado (`marcar`). O teto vale para todos os planos; quem comprou
  // este perfil avulso passa direto. Conferido antes de qualquer chamada ao
  // provedor.
  const consulta = await checarConsulta(user, username, true);
  const access = consulta.access;
  const paid = access !== "free";
  if (!consulta.permitido) {
    return NextResponse.json(respostaDeLimite(consulta), { status: 402 });
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

  // History — only for profiles a Pro user put "no Faro AI". Viewing a profile is
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

  /*
   * Quem é cada um: a IA lê @, nome e bio; o palpite pelo primeiro nome fica
   * de reserva.
   *
   * A reserva não é decoração — ela entra sempre que a IA está desligada, não
   * respondeu a tempo ou não soube de alguém. A tela nunca fica sem resposta
   * por causa disto.
   *
   * O que a IA marca como **marca** sai da conta de mulheres e homens: até
   * hoje a única defesa contra loja era o selo de verificado, e loja de bairro
   * não tem selo — ela entrava na conta como se fosse gente.
   */
  // A lista de "seguindo" não traz bio — só @ e nome. É com isso que dá para
  // trabalhar aqui; ler a bio de cada um custaria uma requisição paga por
  // pessoa, que é exatamente o que não vale a pena.
  /*
   * A IA é perguntada só sobre quem a heurística NÃO resolve.
   *
   * Medido em 23/09 contra 40 pessoas reais: onde o palpite pelo primeiro nome
   * tem convicção, ele e o modelo concordam — 22 de 23. Toda a diferença
   * estava nos "não sei": 16 das 17 divergências, mais as marcas, que a
   * heurística nunca reconhece e sempre deixa em aberto.
   *
   * Então perguntar sobre os óbvios era pagar para confirmar o que já se
   * sabia. Isto corta perto da metade do gasto sem tirar nada da tela.
   *
   * O preço disto, dito às claras: marca com nome de gente ("Amanda
   * Cosméticos") continua passando como pessoa, porque a heurística decide
   * sozinha e a IA nem é consultada.
   */
  const duvidosos = all.filter((u) => guessGender(u.displayName, u.username) === "u");
  const lidos = await quemSao(
    duvidosos.map((u) => ({ username: u.username, displayName: u.displayName })),
  );
  let marcasIA = 0;
  const quemEh = (u: { username: string; displayName: string | null }): "f" | "m" | "u" => {
    const ia = lidos.get(u.username.toLowerCase());
    if (ia === "marca") return "u";
    if (ia === "f" || ia === "m") return ia;
    return guessGender(u.displayName, u.username);
  };
  for (const u of all) if (lidos.get(u.username.toLowerCase()) === "marca") marcasIA++;

  // Aggregate gender estimate over everything we fetched (safe to show free —
  // it's a count, not an identity). Computed from the same single request.
  const g = { girls: 0, boys: 0 };
  for (const u of all) {
    const q = quemEh(u);
    if (q === "f") g.girls++;
    else if (q === "m") g.boys++;
  }
  // Share of the page we read, so the three bars add up to something honest.
  const total = all.length + brands;
  const marcas = brands + marcasIA;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const counts = {
    ...g,
    brands: marcas,
    total,
    percent: { girls: pct(g.girls), boys: pct(g.boys), brands: pct(marcas) },
  };

  // Only the first rows are shown; masked for free so names don't leak — but we
  // always send the estimated gender so the teaser can label each row.
  const out = all.slice(0, 12).map((u) => ({
    ...(paid ? u : mask(u)),
    gender: quemEh(u),
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
