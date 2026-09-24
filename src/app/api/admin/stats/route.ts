import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";
import { PLANS, SINGLE_UNLOCK } from "@/lib/plans";
import type { Plan } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * O faturamento, lido do **nosso** banco.
 *
 * O que dá para dizer com honestidade daqui:
 *
 * - **Receita recorrente**: quantas pessoas estão em cada plano hoje, com o
 *   preço de cada um trazido para o mês (semana × 4,33, ano ÷ 12). É uma
 *   projeção do que entra se ninguém cancelar — não é o que o Stripe depositou.
 * - **Avulsos**: cada desbloqueio do Farejador que tem sessão do Stripe é uma
 *   compra real que aconteceu. Os sem sessão são de demonstração e ficam fora.
 *
 * O extrato de verdade (estornos, taxas, falhas de cobrança) está no painel do
 * Stripe; trazer isso para cá exige ler a API deles e guardar os pagamentos.
 */
const MES_POR_SEMANA = 4.345;

function mensal(p: (typeof PLANS)[Plan]): number {
  if (p.billing === "weekly") return p.priceMonthly * MES_POR_SEMANA;
  if (p.billing === "yearly") return (p.priceYearly ?? p.priceMonthly) / 12;
  return p.priceMonthly;
}

/** As janelas do seletor, em milissegundos. "hoje" e "ontem" são por dia. */
const JANELAS: Record<string, number> = {
  "7d": 7 * 24 * 3600_000,
  "30d": 30 * 24 * 3600_000,
  "6m": 182 * 24 * 3600_000,
  "1a": 365 * 24 * 3600_000,
};

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const seteDias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [porPlano, unlocksTotal, unlocksMes, novosMes, novosSemana, totalUsuarios, noFaro] =
    await Promise.all([
      prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
      prisma.profileUnlock.count({ where: { stripeSessionId: { not: null } } }),
      prisma.profileUnlock.count({
        where: { stripeSessionId: { not: null }, createdAt: { gte: inicioMes } },
      }),
      prisma.user.count({ where: { createdAt: { gte: inicioMes } } }),
      prisma.user.count({ where: { createdAt: { gte: seteDias } } }),
      prisma.user.count(),
      prisma.trackedProfile.count(),
    ]);

  const planos = (Object.keys(PLANS) as Plan[]).map((id) => {
    const cfg = PLANS[id];
    const pessoas = porPlano.find((g) => g.plan === id)?._count._all ?? 0;
    return {
      id,
      nome: cfg.name,
      cobranca: cfg.billing ?? "monthly",
      preco: cfg.billing === "yearly" ? (cfg.priceYearly ?? cfg.priceMonthly) : cfg.priceMonthly,
      maxConsults: cfg.maxConsults,
      maxProfiles: cfg.maxProfiles,
      storiesHours: cfg.storiesHours === Number.POSITIVE_INFINITY ? null : cfg.storiesHours,
      pessoas,
      receitaMensal: +(mensal(cfg) * pessoas).toFixed(2),
    };
  });

  /**
   * Os últimos 6 meses, contados no banco.
   *
   * Aqui não há projeção: contas criadas e desbloqueios pagos são fatos com
   * data. O que **não** dá para montar é um histórico de receita recorrente —
   * ninguém guarda quando cada pessoa trocou de plano, então um gráfico de
   * "MRR mês a mês" seria invenção.
   */
  const meses: { mes: string; rotulo: string; contas: number; avulsos: number; receita: number }[] = [];
  for (let k = 5; k >= 0; k--) {
    const ini = new Date(agora.getFullYear(), agora.getMonth() - k, 1);
    const fim = new Date(agora.getFullYear(), agora.getMonth() - k + 1, 1);
    const [contas, avulsos] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: ini, lt: fim } } }),
      prisma.profileUnlock.count({
        where: { stripeSessionId: { not: null }, createdAt: { gte: ini, lt: fim } },
      }),
    ]);
    meses.push({
      mes: `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, "0")}`,
      rotulo: ini.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      contas,
      avulsos,
      receita: +(avulsos * SINGLE_UNLOCK.price).toFixed(2),
    });
  }

  /**
   * O período escolhido na tela, e o período anterior do mesmo tamanho.
   *
   * A comparação existe para o número dizer alguma coisa: "12 farejos" sozinho
   * não informa se foi um dia bom.
   */
  const periodo = new URL(req.url).searchParams.get("periodo") ?? "7d";
  const meiaNoite = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  let ini: Date;
  let fim: Date;
  if (periodo === "hoje") {
    ini = meiaNoite;
    fim = agora;
  } else if (periodo === "ontem") {
    ini = new Date(meiaNoite.getTime() - 24 * 3600_000);
    fim = meiaNoite;
  } else {
    const dur = JANELAS[periodo] ?? JANELAS["7d"];
    ini = new Date(Date.now() - dur);
    fim = agora;
  }
  const duracao = fim.getTime() - ini.getTime();
  const iniAnterior = new Date(ini.getTime() - duracao);

  const contar = async (de: Date, ate: Date) => {
    const [farejos, contas, faro, avulsos] = await Promise.all([
      prisma.analysisUsage.count({ where: { createdAt: { gte: de, lt: ate } } }),
      prisma.user.count({ where: { createdAt: { gte: de, lt: ate } } }),
      prisma.trackedProfile.count({ where: { monitoringStartedAt: { gte: de, lt: ate } } }),
      prisma.profileUnlock.count({
        where: { stripeSessionId: { not: null }, createdAt: { gte: de, lt: ate } },
      }),
    ]);
    return { farejos, contas, faro, avulsos, receita: +(avulsos * SINGLE_UNLOCK.price).toFixed(2) };
  };

  const [agoraVals, antesVals] = await Promise.all([contar(ini, fim), contar(iniAnterior, ini)]);

  const recorrente = +planos.reduce((n, p) => n + p.receitaMensal, 0).toFixed(2);
  const avulsoMes = +(unlocksMes * SINGLE_UNLOCK.price).toFixed(2);

  return NextResponse.json({
    periodo: {
      id: periodo,
      de: ini.toISOString(),
      ate: fim.toISOString(),
      atual: agoraVals,
      anterior: antesVals,
    },
    planos,
    meses,
    recorrente,
    anual: +(recorrente * 12).toFixed(2),
    avulso: {
      preco: SINGLE_UNLOCK.price,
      total: unlocksTotal,
      mes: unlocksMes,
      receitaMes: avulsoMes,
      receitaTotal: +(unlocksTotal * SINGLE_UNLOCK.price).toFixed(2),
    },
    noMes: +(recorrente + avulsoMes).toFixed(2),
    usuarios: { total: totalUsuarios, novosMes, novosSemana, noFaro },
    chamadas: await chamadasPagas(),
  });
}

/**
 * As chamadas pagas dos últimos 30 dias, do registro de custo
 * (`provider_calls`). Admin separado de clientes: o que o dono gasta
 * testando não entra na conta de quanto cada cliente custa.
 */
async function chamadasPagas() {
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const linhas = await prisma.providerCall
    .groupBy({ by: ["provider", "admin"], where: { createdAt: { gte: desde } }, _count: { _all: true } })
    .catch(() => []);
  const conta = (provider: string, admin: boolean) =>
    linhas.find((l) => l.provider === provider && l.admin === admin)?._count._all ?? 0;
  return ["hikerapi", "apify", "openai"].map((provider) => ({
    provider,
    clientes: conta(provider, false),
    admin: conta(provider, true),
  }));
}
