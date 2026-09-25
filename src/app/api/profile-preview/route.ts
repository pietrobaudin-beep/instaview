import { NextResponse } from "next/server";
import { creditosAvulso } from "@/lib/avulso-credito";
import { getProfileCached, peekProfileCached, peekProfileStale } from "@/lib/profile-cache";
import { ProviderError, type ProfileData } from "@/lib/providers/types";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/auth";
import { acessoA } from "@/lib/access";
import { comQuem } from "@/lib/custo";
import { direitosDe, inicioDoCiclo } from "@/lib/direitos";
import { devolver, reservarBruto, tetoDe, type Reserva } from "@/lib/franquia";
import { usageKey } from "@/lib/usage";

const log = logger.scope("api:preview");

export const dynamic = "force-dynamic";

function cartao(p: ProfileData, lidoEm: Date, velho = false) {
  return {
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
    analyzedAt: lidoEm.toISOString(),
    /** Veio de uma leitura antiga, sem gastar leitura nova. */
    antigo: velho,
  };
}

/**
 * O cartão do perfil — foto, nome, números. É o que confirma "é esta pessoa"
 * antes de qualquer análise.
 *
 * Ordem de onde ele vem, da mais barata à mais cara:
 * 1. a análise salva desta conta (reabrir nunca relê);
 * 2. o cache compartilhado ainda fresco (de graça, vale para todos);
 * 3. o provedor — e só então conta na franquia de cartões: 1 na experiência
 *    grátis, alguns por ciclo nos planos. Esgotada, mostra o último cartão
 *    guardado, com a data, se houver.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = normalizeUsername(url.searchParams.get("username") || "");
  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const acesso = await acessoA(user, username);
  if (acesso.salva?.data.perfil) {
    return NextResponse.json(cartao(acesso.salva.data.perfil, acesso.salva.collectedAt));
  }

  const fresco = await peekProfileCached(username);
  if (fresco) {
    const { fetchedAt } = await getProfileCached(username); // do cache, sem provedor
    return NextResponse.json(cartao(fresco, fetchedAt));
  }

  // Vai ao provedor: conta na franquia. Quem já tem acesso revelado a este @
  // (Farejador, Faro AI, Admin) não gasta cartão — a coleta dele já está paga.
  const d = direitosDe(user);
  let reserva: Reserva | null = null;
  // Conta grátis presa ao perfil da revelação: cartão novo de outro @ não.
  const foraDaRevelacao =
    !!user && !d.admin && d.plano === "FREE" && !!user.revelacaoUsername && user.revelacaoUsername !== username;
  // Quem tem análise avulsa comprada (sem perfil) precisa abrir o perfil onde
  // vai usá-la: 3 cartões a mais por crédito, para escolher.
  const creditos = user && acesso.access === "free" ? await creditosAvulso(user.id) : 0;
  if (acesso.access === "free" && !d.admin) {
    const dono = user ? user.id : usageKey(null);
    const ciclo = user ? inicioDoCiclo(user) : new Date(0);
    reserva = await reservarBruto(
      dono,
      "perfil_basico",
      ciclo,
      (foraDaRevelacao ? 0 : tetoDe(d.config, "perfil_basico")) + creditos * 3,
    );
    if (!reserva.ok) {
      const velho = await peekProfileStale(username);
      if (velho) return NextResponse.json(cartao(velho.profile, velho.fetchedAt, true));
      return NextResponse.json(
        { limited: true, motivo: "cartoes", used: reserva.usados, limit: reserva.limite },
        { status: 402 },
      );
    }
  }

  try {
    const { profile: p, fetchedAt } = await comQuem(
      { userId: user?.id ?? null, admin: d.admin, motivo: "cartao" },
      () => getProfileCached(username),
    );
    return NextResponse.json(cartao(p, fetchedAt));
  } catch (e) {
    // Sem entrega, a franquia volta. O custo da chamada fica no registro.
    if (reserva) await devolver(reserva);
    const code = e instanceof ProviderError ? e.code : "UNKNOWN";
    if (code !== "NOT_FOUND") log.warn("preview failed", { username, code });
    if (code === "NOT_FOUND") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (code === "RATE_LIMIT") return NextResponse.json({ error: "quota" }, { status: 429 });
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
