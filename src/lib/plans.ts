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
  /** Quantos perfis podem entrar no Faro (acompanhamento diário). */
  maxProfiles: number;
  /** Quantos perfis diferentes o plano deixa consultar por completo. */
  maxConsults: number;
  /**
   * Por quantas horas os stories encontrados ficam guardados.
   * `Infinity` = **enquanto o perfil estiver no Faro**, sem prazo.
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
   * O Faro guarda todos sozinho; salvar é separar os que importam, e é por
   * isso que o teto sobe com o plano. Conta só o que entra: o que já foi
   * salvo fica para sempre e não ocupa a cota do mês seguinte. Desmarcar
   * dentro do mesmo mês devolve o crédito, senão um toque errado custaria
   * caro.
   */
  storiesSalvosMes: number;
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
    // O Curioso não coloca ninguém no Faro: ele vê um farejo de demonstração,
    // com tudo borrado, e escolhe UMA pista depois de criar conta.
    maxProfiles: 0,
    // É sempre O MESMO farejo. Criar conta não dá um perfil novo: dá o direito
    // de revelar UMA informação daquele mesmo perfil.
    maxConsults: 1,
    storiesHours: 0,
    // O Curioso não coloca ninguém no Faro, então não tem story guardado para salvar.
    storiesSalvosMes: 0,
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
    para: "Para deixar o Faro de olho em uma pista.",
    billing: "weekly",
    priceMonthly: 14.9, // cobrado por semana
    maxProfiles: 1,
    maxConsults: 3,
    storiesHours: 48, // dois dias — tabela de 20/09
    // Dez por semana de assinatura já cobre o que costuma importar em uma pista só.
    storiesSalvosMes: 10,
    minIntervalMinutes: 24 * 60,
    historyDays: 90,
    alerts: true,
    team: false,
    exportAndApi: false,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_WEEK",
    features: [
      "Até 3 perfis para consultar",
      "1 perfil no Faro, com tudo liberado",
      "Alertas quando o Faro encontrar algo",
      "Stories guardados enquanto o perfil estiver no Faro",
    ],
  },

  PRO: {
    id: "PRO",
    name: "Farejo PRO",
    para: "Para deixar o Faro trabalhando por você.",
    billing: "monthly",
    priceMonthly: 29.9,
    priceYearly: 239.9,
    maxProfiles: 5,
    maxConsults: 10,
    storiesHours: 72, // três dias — tabela de 20/09
    // Cinco perfis no Faro; dez por perfil é a conta que o preço sustenta.
    storiesSalvosMes: 50,
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
      "Até 10 perfis para consultar",
      "Até 5 perfis no Faro",
      "Alertas de follows, unfollows e interações",
      "Histórico desde a entrada no Faro",
      "Stories guardados enquanto o perfil estiver no Faro",
      "Área Meu Faro",
    ],
  },
  AGENCY: {
    id: "AGENCY",
    name: "Faro Detetive",
    para: "Para quem não deixa pista passar.",
    // Cobrado UMA vez por ano: R$ 99,90. Preço definido pelo dono do produto.
    //
    // Margem: 15 perfis no Faro lidos todo dia custam ~R$ 120/ano de HikerAPI,
    // acima do preço. Duas saídas sem mexer no preço: ler 3 seções por dia em
    // vez de 4 (~R$ 92) ou baixar o Faro para 10 perfis (~R$ 82). Ver
    // "Custos e preços" no cofre — decisão pendente.
    billing: "yearly",
    priceMonthly: 99.9 / 12,
    priceYearly: 99.9,
    maxProfiles: 15,
    maxConsults: 30,
    storiesHours: Number.POSITIVE_INFINITY,
    // Quinze perfis, e é o plano de quem documenta — o teto existe só para o banco não crescer sem fim.
    storiesSalvosMes: 200,
    // The paid-for extra: four passes a day instead of one. Costs ~4x per
    // profile, which the Agency price covers and the Pro price does not.
    minIntervalMinutes: 6 * 60,
    historyDays: Number.POSITIVE_INFINITY,
    alerts: true,
    team: true,
    exportAndApi: true,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_AGENCY",
    features: [
      "Até 30 perfis para consultar",
      "Até 15 perfis no Faro",
      "Alertas de conexões, interações e mudanças",
      "Histórico contínuo desde a entrada no Faro",
      "Arquivo de stories desde a entrada no Faro",
      "Área Meu Faro completa",
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
