/**
 * A prévia de quem ainda não paga (visitante ou conta grátis): quantas
 * mulheres e homens o perfil segue — de verdade — e os seguidos borrados.
 *
 * Decisão do dono em 25/09, revendo a regra de 24/09 ("não coletar listas
 * só para borrá-las"). O custo foi aceito com três travas:
 *
 * - **uma leitura** (uma página de seguindo) por identidade grátis, na
 *   franquia `previa`;
 * - **cache compartilhado de 24h** por @: o segundo visitante não gasta;
 * - **sem IA**: mulher/homem pelo palpite do nome, sem custo de OpenAI.
 *
 * Os nomes saem mascarados no servidor (só as duas primeiras letras) e a foto
 * vai para ser borrada na tela — nada identificável chega ao navegador.
 */
import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { ProviderError, type FollowerEntry } from "@/lib/providers/types";
import { guessGender } from "@/lib/gender";
import { cacheSectionKey } from "@/lib/sandbox";
import { comQuem } from "@/lib/custo";
import { devolver, reservarBruto } from "@/lib/franquia";
import { usageKey } from "@/lib/usage";

const TTL = 24 * 60 * 60 * 1000;
/** Quantas pessoas a prévia mostra (borradas). */
const AMOSTRA = 5;
/** Quantas contas entram na contagem de mulheres e homens da prévia. */
export const CONTADAS = 10;
/** Quantas prévias NOVAS (fora do cache) cada identidade grátis pode abrir. */
export const PREVIAS_GRATIS = 1;

export interface Previa {
  following: (FollowerEntry & { gender: "f" | "m" | "u" })[];
  counts: {
    girls: number;
    boys: number;
    brands: number;
    total: number;
    percent: { girls: number; boys: number; brands: number };
  } | null;
  seguindoOculto: boolean;
  private: boolean;
  /** Algumas fotos de cada gênero, para o cartão com as fotinhas empilhadas. */
  rostos?: { f: string[]; m: string[] };
}

const mascarar = (u: FollowerEntry): FollowerEntry => ({
  username: u.username.slice(0, 2) + "•".repeat(Math.max(3, Math.min(9, u.username.length - 2))),
  displayName: null,
  avatarUrl: u.avatarUrl,
  isVerified: u.isVerified,
});

function montar(lista: FollowerEntry[], marcas: number): Previa {
  const g = { girls: 0, boys: 0 };
  const pessoas = lista.map((u) => {
    const gender = guessGender(u.displayName, u.username);
    if (gender === "f") g.girls++;
    else if (gender === "m") g.boys++;
    return { ...mascarar(u), gender };
  });
  const total = lista.length + marcas;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const fotos = (g: "f" | "m") =>
    pessoas.filter((p) => p.gender === g && p.avatarUrl).slice(0, 3).map((p) => p.avatarUrl as string);
  return {
    rostos: { f: fotos("f"), m: fotos("m") },
    // Só uma amostra na tela (5 pessoas, borradas). A contagem de mulheres e
    // homens usa a página inteira.
    following: pessoas.slice(0, AMOSTRA),
    counts: total
      ? { ...g, brands: marcas, total, percent: { girls: pct(g.girls), boys: pct(g.boys), brands: pct(marcas) } }
      : null,
    seguindoOculto: false,
    private: false,
  };
}

/** A prévia, do cache ou de uma leitura nova (se a franquia deixar). */
export async function previaSeguindo(user: User | null, username: string): Promise<Previa | null> {
  const secao = cacheSectionKey("previa-seguindo-10b");
  const guardada = await prisma.sectionCache
    .findUnique({ where: { username_section: { username, section: secao } } })
    .catch(() => null);
  if (guardada && Date.now() - guardada.fetchedAt.getTime() < TTL) {
    const p = guardada.data as unknown as Previa;
    return { ...p, following: p.following.slice(0, AMOSTRA) };
  }

  // Conta grátis que já usou a revelação num perfil: nada de leitura nova em
  // outro. A experiência grátis é UM perfil — cartão, prévia e revelação.
  if (user?.revelacaoUsername && user.revelacaoUsername !== username) return null;

  const dono = user ? user.id : usageKey(null);
  const reserva = await reservarBruto(dono, "previa", new Date(0), PREVIAS_GRATIS);
  if (!reserva.ok) return null;

  let previa: Previa;
  try {
    const r = await comQuem({ userId: user?.id ?? null, motivo: "previa" }, () =>
      getProvider().getFollowing(username, { maxPages: 1, pageSize: 50 }),
    );
    // Só as 10 contas mais recentes da lista entram na prévia — contagem e
    // amostra. A leitura custa o mesmo; mostrar 50 era dar a análise de graça.
    const dez = r.followers.slice(0, CONTADAS);
    previa = montar(
      dez.filter((u) => !u.isVerified),
      dez.filter((u) => u.isVerified).length,
    );
  } catch (e) {
    await devolver(reserva);
    if (e instanceof ProviderError && e.code === "PRIVATE") {
      return { following: [], counts: null, seguindoOculto: false, private: true };
    }
    if (e instanceof ProviderError && e.code === "HIDDEN") {
      return { following: [], counts: null, seguindoOculto: true, private: false };
    }
    return null;
  }

  const data = previa as unknown as Prisma.InputJsonValue;
  await prisma.sectionCache
    .upsert({
      where: { username_section: { username, section: secao } },
      create: { username, section: secao, data },
      update: { data, fetchedAt: new Date() },
    })
    .catch(() => null);
  return previa;
}
