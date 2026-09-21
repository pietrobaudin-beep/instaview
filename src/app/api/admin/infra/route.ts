import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";
import { env } from "@/lib/env";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * O que a casa consome: créditos da HikerAPI e espaço no banco.
 *
 * **Créditos.** O `/sys/balance` da HikerAPI é de graça (não é cobrado) e diz
 * quantas requisições **restam** — nunca quantas foram feitas. Para saber o
 * gasto, guardamos a primeira leitura de cada dia e comparamos: o consumo de
 * hoje é a leitura da virada menos a de agora.
 *
 * **Banco.** O tamanho vem do próprio Postgres. O **teto** não dá para
 * perguntar ao banco: é o que o plano da Supabase oferece, então vem de
 * `DB_SIZE_LIMIT_GB` (padrão 8 GB, o do plano Pro). Se você mudar de plano,
 * mude a variável — o número não se descobre sozinho.
 */
const SNAP = "hiker-balance";
const GB = 1024 ** 3;

interface Balance {
  requests: number;
  rate: number;
  currency: string;
  amount: number;
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

async function lerSaldo(): Promise<Balance | null> {
  if (!env.HIKERAPI_KEY) return null;
  try {
    const res = await fetch("https://api.hikerapi.com/sys/balance", {
      headers: { "x-access-key": env.HIKERAPI_KEY, accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Balance;
  } catch {
    return null;
  }
}

/** As mesmas janelas do faturamento. */
const DIAS: Record<string, number> = { hoje: 0, ontem: 1, "7d": 7, "30d": 30, "6m": 182, "1a": 365 };

function diaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const periodo = new URL(req.url).searchParams.get("periodo") ?? "7d";

  const saldo = await lerSaldo();

  // Guarda a leitura do dia (a primeira vence: é a da virada).
  let consumoHoje: number | null = null;
  let consumo7d: number | null = null;
  let consumoPeriodo: number | null = null;
  let diasComLeitura = 0;
  if (saldo) {
    await prisma.sectionCache
      .create({
        data: {
          username: hoje(),
          section: SNAP,
          data: { requests: saldo.requests, amount: saldo.amount } as unknown as Prisma.InputJsonValue,
        },
      })
      .catch(() => null); // já existe: a primeira do dia é a que vale

    const snaps = await prisma.sectionCache.findMany({
      where: { section: SNAP },
      orderBy: { username: "desc" },
      take: 400,
    });
    // dia -> quantas requisições restavam na primeira leitura daquele dia
    const restavam = new Map<string, number>();
    for (const s of snaps) {
      const n = (s.data as { requests?: number } | null)?.requests;
      if (typeof n === "number") restavam.set(s.username, n);
    }

    /**
     * Gasto entre dois dias: o que restava no começo menos o que restava no
     * fim. Sem a leitura de um dos dois, a resposta é honesta: `null`, e a
     * tela diz que ainda não há leitura daquele dia — em vez de inventar.
     */
    const gasto = (deDias: number, ateDias: number): number | null => {
      const de = restavam.get(diaISO(new Date(Date.now() - deDias * 86400_000)));
      const ate =
        ateDias === 0
          ? saldo.requests
          : restavam.get(diaISO(new Date(Date.now() - ateDias * 86400_000)));
      if (typeof de !== "number" || typeof ate !== "number") return null;
      return Math.max(0, de - ate);
    };

    consumoHoje = gasto(0, 0);
    consumo7d = gasto(7, 0);

    // O período escolhido na tela.
    if (periodo === "ontem") consumoPeriodo = gasto(1, 0) !== null ? gasto(1, 1) : null;
    else consumoPeriodo = gasto(DIAS[periodo] ?? 7, 0);

    diasComLeitura = restavam.size;
  }

  // Tamanho do banco e das maiores tabelas.
  const [tamanho] = await prisma.$queryRaw<{ bytes: bigint }[]>`
    SELECT pg_database_size(current_database())::bigint AS bytes
  `;
  const tabelas = await prisma.$queryRaw<{ nome: string; bytes: bigint }[]>`
    SELECT relname AS nome, pg_total_relation_size(c.oid)::bigint AS bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 8
  `;

  /**
   * Quanto cada pessoa ocupa.
   *
   * Conta o que é claramente dela: os eventos (posts, stories, marcações),
   * medidos de verdade, e as pistas, estimadas em ~200 bytes por linha. As
   * duas somas são calculadas **em separado** de propósito: juntar as duas
   * tabelas no mesmo JOIN multiplica uma pela outra e inflava o total.
   *
   * As **cópias de imagem** ficam fora da conta individual porque são
   * compartilhadas — a mesma foto serve para todo mundo que acompanha aquele
   * perfil — e aparecem à parte.
   */
  const porUsuario = await prisma.$queryRaw<
    { id: string; email: string | null; phone: string | null; perfis: bigint; bytes: bigint }[]
  >`
    WITH perfis AS (
      SELECT tp.id, tp."userId"
      FROM tracked_profiles tp
    ),
    eventos AS (
      SELECT p."userId", SUM(octet_length(pe.data::text))::bigint AS bytes
      FROM perfis p JOIN profile_events pe ON pe."profileId" = p.id
      GROUP BY p."userId"
    ),
    pistas AS (
      SELECT p."userId", COUNT(*)::bigint AS n
      FROM perfis p JOIN follower_changes fc ON fc."profileId" = p.id
      GROUP BY p."userId"
    )
    SELECT u.id,
           u.email,
           u.phone,
           (SELECT COUNT(*) FROM perfis p WHERE p."userId" = u.id)::bigint AS perfis,
           (COALESCE(e.bytes, 0) + COALESCE(pi.n, 0) * 200)::bigint AS bytes
    FROM users u
    LEFT JOIN eventos e ON e."userId" = u.id
    LEFT JOIN pistas pi ON pi."userId" = u.id
    ORDER BY bytes DESC
    LIMIT 20
  `;

  const [imagens] = await prisma.$queryRaw<{ bytes: bigint; linhas: bigint }[]>`
    SELECT COALESCE(SUM(octet_length(data::text)), 0)::bigint AS bytes,
           COUNT(*)::bigint AS linhas
    FROM section_cache WHERE section = 'img'
  `;

  /**
   * O que o Faro consome por dia, sem depender de leitura nenhuma: cada perfil
   * acompanhado custa uma requisição por seção relida (posts, stories,
   * marcações — reels saiu em 21/09).
   */
  const noFaro = await prisma.trackedProfile.count({ where: { status: "ACTIVE" } });
  const SECOES_POR_DIA = 3;
  const esperadoPorDia = noFaro * SECOES_POR_DIA;

  // O que está guardado por seção: cada linha aqui é uma requisição que NÃO
  // precisou ser feita de novo.
  const cache = await prisma.sectionCache.groupBy({
    by: ["section"],
    _count: { _all: true },
  });

  /**
   * O que aconteceu no período, contado no nosso banco. Vale mesmo quando não
   * há leitura de saldo guardada daquele dia: farejos novos e atualizações
   * manuais são as duas coisas que gastam além do acompanhamento diário.
   */
  const desdeDias = periodo === "hoje" ? 0 : (DIAS[periodo] ?? 7);
  const desde =
    periodo === "hoje"
      ? new Date(new Date().setHours(0, 0, 0, 0))
      : new Date(Date.now() - desdeDias * 86400_000);
  const ate = periodo === "ontem" ? new Date(new Date().setHours(0, 0, 0, 0)) : new Date();

  const [farejos, coletas] = await Promise.all([
    prisma.analysisUsage.count({ where: { createdAt: { gte: desde, lt: ate } } }),
    prisma.followerSnapshot.count({ where: { startedAt: { gte: desde, lt: ate } } }),
  ]);

  const limiteGb = Number(process.env.DB_SIZE_LIMIT_GB ?? 8);

  return NextResponse.json({
    hiker: saldo
      ? {
          requisicoesRestantes: saldo.requests,
          dinheiro: saldo.amount,
          moeda: saldo.currency,
          porSegundo: saldo.rate,
          consumoHoje,
          consumo7d,
          periodo,
          consumoPeriodo,
          diasComLeitura,
          farejosNoPeriodo: farejos,
          coletasNoPeriodo: coletas,
          // US$ 1 por 1.000 requisições, como está no contrato deles.
          custoHoje: consumoHoje == null ? null : +(consumoHoje / 1000).toFixed(3),
          // US$ 1 por 1.000 requisições, como está no contrato deles.
          porRequisicao: 0.001,
          diasRestantes:
            consumoHoje && consumoHoje > 0 ? Math.floor(saldo.requests / consumoHoje) : null,
          esperadoPorDia,
          perfisNoFaro: noFaro,
          secoesPorDia: SECOES_POR_DIA,
          custoEsperadoMes: +((esperadoPorDia * 30.4) / 1000).toFixed(2),
          guardado: cache
            .map((c) => ({ secao: c.section, linhas: c._count._all }))
            .sort((a, b) => b.linhas - a.linhas)
            .slice(0, 10),
        }
      : null,
    banco: {
      bytes: Number(tamanho?.bytes ?? 0),
      limiteBytes: limiteGb * GB,
      limiteGb,
      tabelas: tabelas.map((t) => ({ nome: t.nome, bytes: Number(t.bytes) })),
      imagens: { bytes: Number(imagens?.bytes ?? 0), linhas: Number(imagens?.linhas ?? 0) },
    },
    usuarios: porUsuario.map((u) => ({
      id: u.id,
      quem: u.email ?? u.phone ?? "—",
      perfis: Number(u.perfis),
      bytes: Number(u.bytes),
    })),
  });
}
