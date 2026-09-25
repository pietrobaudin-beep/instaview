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
 *
 * **"Interage bastante com" (25/09):** a mesma pessoa que a revelação vai
 * mostrar, com nome mascarado e a foto **borrada no servidor**
 * (`/api/previa-foto`) — o endereço da foto de verdade nunca sai daqui. Custa
 * a leitura dos posts (R$ 0,11), dentro da mesma reserva da prévia, e fica no
 * cache de 24h que a revelação reaproveita: quem cria a conta e revela não
 * paga de novo.
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
import { getRecentMediaCached } from "@/lib/media-cache";
import { rankInteractions } from "@/lib/interactions";
import type { MediaPost } from "@/lib/providers/types";

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
  /**
   * Quem mais aparece nas interações, mascarado. `undefined` = ainda não
   * calculado (cache antigo); `null` = sem dado suficiente.
   */
  destaque?: { nome: string; temFoto: boolean } | null;
  /** SÓ NO SERVIDOR: a foto de verdade, para `/api/previa-foto` borrar. */
  destaqueFoto?: string | null;
}

/** Nome mascarado: as duas primeiras letras e pontinhos — some com o borrão. */
const mascaraNome = (t: string) => t.slice(0, 2) + "•".repeat(Math.max(4, Math.min(10, t.length - 2)));

/** A mesma regra da revelação (`coletarDestaque`): 1º lugar, com 2+ sinais. */
function destaqueDe(posts: MediaPost[], username: string): Pick<Previa, "destaque" | "destaqueFoto"> {
  const primeiro = rankInteractions(posts, username, 60).filter((i) => !i.isVerified)[0];
  if (!primeiro || primeiro.count < 2) return { destaque: null, destaqueFoto: null };
  return {
    destaque: { nome: mascaraNome(primeiro.displayName || primeiro.username), temFoto: !!primeiro.avatarUrl },
    destaqueFoto: primeiro.avatarUrl,
  };
}

/** Os posts já guardados no cache, sem ler o provedor. */
async function postsSoDoCache(username: string): Promise<MediaPost[] | null> {
  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username, section: cacheSectionKey("recent-media") } } })
    .catch(() => null);
  if (!row || Date.now() - row.fetchedAt.getTime() > TTL) return null;
  return row.data as unknown as MediaPost[];
}

export const SECAO_PREVIA = () => cacheSectionKey("previa-seguindo-10b");

/** Para o cliente: tira o que só o servidor pode ver. */
const publica = (p: Previa): Previa => {
  const { destaqueFoto: _, ...resto } = p;
  return { ...resto, following: p.following.slice(0, AMOSTRA) };
};

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
  const secao = SECAO_PREVIA();
  const guardada = await prisma.sectionCache
    .findUnique({ where: { username_section: { username, section: secao } } })
    .catch(() => null);
  if (guardada && Date.now() - guardada.fetchedAt.getTime() < TTL) {
    const p = guardada.data as unknown as Previa;
    // Prévia de antes do destaque: completa só com posts que já estão no
    // cache — sem leitura nova.
    if (p.destaque === undefined && !p.private && !p.seguindoOculto) {
      const posts = await postsSoDoCache(username);
      if (posts) {
        Object.assign(p, destaqueDe(posts, username));
        await prisma.sectionCache
          .update({
            where: { username_section: { username, section: secao } },
            data: { data: p as unknown as Prisma.InputJsonValue },
          })
          .catch(() => null);
      }
    }
    return publica(p);
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
    // O destaque borrado: posts recentes (cache de 24h, que a revelação reusa).
    const posts = await comQuem({ userId: user?.id ?? null, motivo: "previa" }, () =>
      getRecentMediaCached(username),
    ).catch(() => null);
    Object.assign(previa, posts ? destaqueDe(posts, username) : { destaque: null, destaqueFoto: null });
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
  return publica(previa);
}
