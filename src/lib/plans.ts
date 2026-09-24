/**
 * Plan definitions + entitlements. Single source of truth for what each tier
 * can do. The Stripe layer maps price IDs -> Plan; enforcement reads from here.
 */
import type { Plan } from "@prisma/client";

export interface PlanConfig {
  id: Plan;
  name: string;
  /** Uma linha dizendo para quem é. */
  para?: string;
  /** Como é cobrado — a tela lê daqui em vez de supor "por mês". */
  billing?: "free" | "weekly" | "monthly" | "yearly";
  priceMonthly: number; // BRL, display only — Stripe charges what its price id says
  /** BRL for a year up front, when the plan offers it. Display only. */
  priceYearly?: number;
  /** Quantos perfis podem entrar no Faro AI (acompanhamento diário). */
  maxProfiles: number;
  /** Quantos perfis diferentes o plano deixa consultar por completo. */
  maxConsults: number;
  /**
   * Por quantas horas os stories encontrados ficam guardados.
   * `Infinity` = **enquanto o perfil estiver no Faro AI**, sem prazo.
   *
   * Voltou à tabela fechada em 20/09 (24h · 48h · 72h · sem prazo). Em 21/09
   * eu tinha igualado todos os planos pagos em "sem prazo"; era erro meu — é
   * justamente a guarda sem prazo que o Faro Detetive vende, e dá-la ao Cão e
   * ao PRO apaga a diferença entre eles.
   */
  storiesHours: number;
  /**
   * Quantos stories novos podem ser **salvos com a estrela** por mês.
   *
   * O Faro AI guarda todos sozinho; salvar é separar os que importam, e é por
   * isso que o teto sobe com o plano. Conta só o que entra: o que já foi
   * salvo fica para sempre e não ocupa a cota do mês seguinte. Desmarcar
   * dentro do mesmo mês devolve o crédito, senão um toque errado custaria
   * caro.
   */
  storiesSalvosMes: number;
  /**
   * Quantas vezes por dia o "Atualizar agora" pode ser usado num perfil.
   *
   * Cada uma é uma coleta paga no provedor. Era uma constante global de 3,
   * igual para todos: o Detetive tinha o mesmo teto do Faro de Cão, embora
   * pague sete vezes mais.
   */
  refreshesPorDia: number;
  /** Minimum minutes between collections (smaller = more frequent). */
  minIntervalMinutes: number;
  /** How many days of history are queryable. Infinity = unlimited. */
  historyDays: number;
  /** Alerts available on this plan. */
  alerts: boolean;
  /** Multi-user org / team support. */
  team: boolean;
  /** CSV / API export. */
  exportAndApi: boolean;
  stripePriceEnv?: string; // env var name holding the Stripe price id
  features: string[];
}

export const PLANS: Record<Plan, PlanConfig> = {
  FREE: {
    id: "FREE",
    name: "Curioso",
    para: "Para quem quer matar uma curiosidade.",
    billing: "free",
    priceMonthly: 0,
    // O Curioso não coloca ninguém no Faro AI: ele vê um farejo de demonstração,
    // com tudo borrado, e escolhe UMA pista depois de criar conta.
    maxProfiles: 0,
    // É sempre O MESMO farejo. Criar conta não dá um perfil novo: dá o direito
    // de revelar UMA informação daquele mesmo perfil.
    maxConsults: 1,
    storiesHours: 0,
    // O Curioso não coloca ninguém no Faro AI, então não tem story guardado para salvar.
    storiesSalvosMes: 0,
    refreshesPorDia: 0,
    minIntervalMinutes: 24 * 60, // once a day
    historyDays: 7,
    alerts: false,
    team: false,
    exportAndApi: false,
    features: [
      "1 farejo, com tudo borrado",
      "Contagem de mulheres e homens",
      "Com conta: 1 informação à sua escolha, no mesmo perfil",
      "Sem acompanhamento e sem atualização",
    ],
  },
  WEEK: {
    id: "WEEK",
    name: "Faro de Cão",
    para: "Para deixar o Faro AI de olho em uma pista.",
    billing: "weekly",
    priceMonthly: 14.9, // cobrado por semana
    maxProfiles: 1,
    maxConsults: 3,
    storiesHours: 48, // dois dias — tabela de 20/09
    // Dez por semana de assinatura já cobre o que costuma importar em uma pista só.
    storiesSalvosMes: 10,
    refreshesPorDia: 3,
    minIntervalMinutes: 24 * 60,
    historyDays: 90,
    alerts: true,
    team: false,
    exportAndApi: false,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_WEEK",
    features: [
      "1 perfil no Faro AI, vigiado todo dia",
      "3 análises novas por mês",
      "Quem ele começa a seguir, e quem deixa",
      "Stories guardados por 48 horas, com busca por dentro",
      "Pergunte ao Faro AI",
      "Me avise quando… — o alerta que você escreve",
      "Histórico desde a entrada no Faro AI",
    ],
  },

  PRO: {
    id: "PRO",
    name: "Farejo PRO",
    para: "Para deixar o Faro AI trabalhando por você.",
    billing: "monthly",
    priceMonthly: 29.9,
    priceYearly: 239.9,
    // 2, e não 5. Cada perfil no Faro AI custa 3 leituras por dia do provedor
    // — R$ 9,90/mês a US$ 0,02 a requisição. Com 5 perfis o PRO custava
    // R$ 63 e recebia R$ 29,90: cada assinante saía do bolso do dono.
    maxProfiles: 2,
    /*
     * 5, e não 3.
     *
     * Três saiu do cálculo de margem e travou em um dia de uso normal — o
     * dono bateu o teto testando o próprio produto. Cada análise nova custa
     * R$ 1,32; duas a mais são R$ 2,64 por assinante, e a margem cai de 33%
     * para 24%. Um plano em que a pessoa esbarra no primeiro dia cancela mais
     * do que custa.
     *
     * Reabrir um @ já analisado nunca contou, e continua não contando.
     */
    maxConsults: 5,
    // Sem prazo, como o arquivo do plano de cima costumava ser. Guardar story
    // não custa provedor — é imagem que o Farejo já baixou. Cobrar por prazo
    // aqui era criar escassez artificial no plano que deveria ser o melhor.
    storiesHours: Number.POSITIVE_INFINITY,
    // Cinco perfis no Faro AI; dez por perfil é a conta que o preço sustenta.
    // A estrela também deixa de ter cota: ela só marca o que já está guardado.
    storiesSalvosMes: Number.POSITIVE_INFINITY,
    refreshesPorDia: 5,
    // Once a day, on purpose. A story lasts 24h, so a daily pass catches every
    // one of them — reading every six hours finds nothing extra and costs four
    // times as much (R$ 46/month of data for a R$ 29,90 plan). The UI shows the
    // next scheduled "farejo", so the rhythm reads as intentional.
    minIntervalMinutes: 24 * 60,
    historyDays: 365,
    alerts: true,
    team: false,
    exportAndApi: false,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_PRO",
    features: [
      "2 perfis no Faro AI, vigiados todo dia",
      "5 análises novas por mês",
      "Quem eles começam a seguir, e quem deixam",
      "Stories guardados SEM PRAZO, com busca por dentro",
      "Resumir stories: o Faro AI lê o que está escrito neles",
      "Pergunte ao Faro AI, sem limite",
      "Me avise quando… — o alerta que você escreve",
      "Histórico completo e área Meu Faro AI",
    ],
  },
  AGENCY: {
    id: "AGENCY",
    name: "Faro Detetive",
    para: "O Faro AI de olho em uma pista, pago uma vez no ano.",
    // Cobrado UMA vez por ano: R$ 99,90. Preço definido pelo dono do produto.
    //
    /*
     * R$ 179/ano desde 22/09 (era R$ 99,90), com 8 perfis no Faro AI e 20
     * consultas por mês (eram 15 e 30).
     *
     * A R$ 99,90 o plano dava prejuízo em qualquer configuração: são R$ 7,96
     * por mês líquidos, e 15 perfis lidos 4× ao dia custam R$ 17,56 de
     * HikerAPI. Não havia corte que fechasse sem deixá-lo pior que o PRO.
     *
     * A R$ 179 sobram R$ 14,29/mês líquidos. Com 8 perfis lidos 4× ao dia o
     * custo é R$ 9,36 — **margem de 34%**, e o plano continua bem acima do
     * PRO (5 perfis, 1×/dia). Era esse descompasso que fazia o plano de topo
     * custar menos que o do meio.
     *
     * ATENÇÃO: este número é só o que a tela mostra. Quem cobra é o Stripe,
     * pelo price id em `stripePriceEnv` — sem criar o preço novo lá, o site
     * anuncia R$ 179 e cobra R$ 99,90.
     */
    billing: "yearly",
    priceMonthly: 179 / 12,
    priceYearly: 179,
    // R$ 179/ano são R$ 14,92/mês — METADE do PRO. Então oferece menos, não
    // mais: 1 perfil cabe em R$ 9,90 de leitura e ainda sobra. Com 8 perfis
    // custava R$ 79/mês contra R$ 14,92 recebidos.
    maxProfiles: 1,
    maxConsults: 2,
    // 72h, não "sem prazo": o arquivo sem fim passou a ser do PRO, que é o
    // topo. Este custa metade por mês — não pode entregar mais.
    storiesHours: 72,
    // É o plano de quem documenta; o teto existe só para o banco não crescer sem fim.
    storiesSalvosMes: 50,
    refreshesPorDia: 3,
    // The paid-for extra: four passes a day instead of one. Costs ~4x per
    // profile, which the Agency price covers and the Pro price does not.
    minIntervalMinutes: 6 * 60,
    historyDays: Number.POSITIVE_INFINITY,
    alerts: true,
    team: true,
    exportAndApi: true,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_AGENCY",
    features: [
      "1 perfil no Faro AI, pago uma vez no ano",
      "2 análises novas por mês",
      "Quem ele começa a seguir, e quem deixa",
      "Stories guardados por 72 horas, com busca por dentro",
      "Resumir stories: o Faro AI lê o que está escrito neles",
      "Pergunte ao Faro AI",
      "Me avise quando… — o alerta que você escreve",
      "Histórico contínuo e área Meu Faro AI",
    ],
  },
};

/**
 * "Uso único": unlock the full analysis of ONE profile, paid once, no
 * subscription. Display price only — Stripe charges what its price id says.
 */
export const SINGLE_UNLOCK = {
  name: "Farejador",
  para: "Para descobrir tudo sobre 1 perfil, sem assinatura.",
  price: 9.9,
  /** Stories do momento da consulta: as últimas 24 horas. */
  storiesHours: 24,
  stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_SINGLE",
  features: [
    "Desbloqueio completo de 1 perfil",
    "Conexões, interações e mudanças daquele momento",
    "Stories públicos das últimas 24 horas",
    "Sem assinatura e sem renovação",
  ],
} as const;

export function planFor(plan: Plan): PlanConfig {
  return PLANS[plan];
}

/** Clamp a requested interval to the plan's allowed minimum. */
export function clampInterval(plan: Plan, requestedMinutes: number): number {
  return Math.max(planFor(plan).minIntervalMinutes, requestedMinutes);
}
