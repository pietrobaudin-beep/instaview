/**
 * Teto diário por visitante para o que custa crédito sem ser uma análise.
 *
 * ## Por que existe
 *
 * Duas rotas gastavam provedor **sem porteiro nenhum**:
 *
 * - `/api/search-profiles` — a lista que aparece enquanto se digita o @. Cada
 *   palavra distinta é uma requisição paga. Três letras dão ~46 mil
 *   combinações: alguém com um script torra dezenas de dólares sem conta e
 *   sem login.
 * - `/api/elsewhere?pagas=1` — as outras redes pelo Apify, que passaram a
 *   rodar sozinhas em todo perfil aberto, por qualquer visitante.
 *
 * Nos dois casos o cache segura a repetição, mas **não segura a variedade** —
 * e é a variedade que custa.
 *
 * ## O que este teto não é
 *
 * Não é segurança: a identidade vem do mesmo cookie assinado do funil
 * (`usageKey`), e cookie se apaga. É um freio contra desperdício e contra
 * script bobo, não contra um atacante decidido. Para isso seria preciso
 * guardar IP, que é dado pessoal — e o preço não compensa.
 *
 * Guardado em `section_cache`, uma linha por visitante/escopo/dia.
 */
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Quantas buscas NOVAS por dia (as que vêm do cache não contam). */
export const TETO_BUSCA = 30;

/** Quantos @ novos por dia podem acionar as redes pagas. */
export const TETO_REDES_PAGAS = 5;

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface Teto {
  ok: boolean;
  usados: number;
  limite: number;
}

/**
 * Conta mais um uso e diz se pode. Chamar **só quando o gasto vai acontecer**
 * de verdade — resposta que veio do cache não consome nada.
 *
 * Sem chave (visitante que ainda não tem cookie) a resposta é liberar: o
 * primeiro uso de alguém não deve esbarrar em teto. A rota que chama emite a
 * identidade logo em seguida.
 */
export async function consumirTeto(
  chave: string | null,
  escopo: string,
  limite: number,
): Promise<Teto> {
  if (!chave) return { ok: true, usados: 0, limite };

  const section = `teto:${escopo}:${hoje()}`;
  const linha = await prisma.sectionCache
    .findUnique({ where: { username_section: { username: chave, section } } })
    .catch(() => null);

  const usados = Number((linha?.data as { n?: number } | null)?.n ?? 0);
  if (usados >= limite) return { ok: false, usados, limite };

  const data = { n: usados + 1 } as unknown as Prisma.InputJsonValue;
  await prisma.sectionCache
    .upsert({
      where: { username_section: { username: chave, section } },
      create: { username: chave, section, data },
      update: { data, fetchedAt: new Date() },
    })
    .catch(() => null);

  return { ok: true, usados: usados + 1, limite };
}
