import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { ProviderError, type SearchHit } from "@/lib/providers/types";
import { cacheSectionKey } from "@/lib/sandbox";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/auth";
import { usageKey } from "@/lib/usage";
import { TETO_BUSCA, consumirTeto } from "@/lib/teto-diario";

const log = logger.scope("api:search");

export const dynamic = "force-dynamic";

/**
 * Busca de contas — a lista que aparece enquanto se digita o @.
 *
 * Custo: **uma requisição por palavra distinta**, e ela já traz as ~20 contas.
 * Por isso a tela mostra 3 e guarda o resto: abrir "ver mais" não pede nada de
 * novo. E a resposta fica 24h no banco, com a palavra como chave — digitar
 * "pietro" de novo, aqui ou em outro aparelho, não custa nada.
 *
 * O mínimo de 3 letras é deliberado: sem ele, cada tecla das duas primeiras
 * letras viraria uma requisição paga por um resultado que ninguém usa.
 *
 * **Teto por visitante** (22/09): o mínimo de letras e o cache seguram a
 * repetição, mas não a variedade — e é a variedade que custa. Sem porteiro,
 * um script pedindo palavras aleatórias gastava crédito sem conta e sem
 * login. Palavra já guardada continua de graça e não consome o teto.
 */
const TTL = 24 * 60 * 60 * 1000;
const MIN_CHARS = 3;

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");

  if (q.length < MIN_CHARS) return NextResponse.json({ results: [] });
  if (!/^[a-z0-9._]{1,30}$/.test(q)) return NextResponse.json({ results: [] });

  const provider = getProvider();
  if (!provider.searchUsers) return NextResponse.json({ results: [], unsupported: true });

  const key = `q:${q}`;
  const section = cacheSectionKey("search");

  const stored = await prisma.sectionCache
    .findUnique({ where: { username_section: { username: key, section } } })
    .catch(() => null);
  if (stored && Date.now() - stored.fetchedAt.getTime() < TTL) {
    return NextResponse.json({ results: stored.data as unknown as SearchHit[], cached: true });
  }

  // Só aqui o gasto vai acontecer de verdade — o que veio do cache, acima,
  // não consome teto.
  const teto = await consumirTeto(usageKey(await getCurrentUser()), "busca", TETO_BUSCA);
  if (!teto.ok) {
    log.info("teto de busca atingido", { q });
    return NextResponse.json({ results: [], teto: true });
  }

  try {
    const results = await provider.searchUsers(q);
    await prisma.sectionCache
      .upsert({
        where: { username_section: { username: key, section } },
        create: { username: key, section, data: results as unknown as Prisma.InputJsonValue },
        update: { data: results as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
      })
      .catch(() => null);
    return NextResponse.json({ results });
  } catch (e) {
    const code = e instanceof ProviderError ? e.code : "UNKNOWN";
    log.warn("search failed", { q, code });
    // A busca é um conforto enquanto se digita: falhando, a tela ainda tem o
    // caminho do @ exato. Por isso lista vazia, não erro na cara da pessoa.
    return NextResponse.json({ results: [], error: code });
  }
}
