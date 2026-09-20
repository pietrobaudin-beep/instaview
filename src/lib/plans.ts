/**
 * Plan definitions + entitlements. Single source of truth for what each tier
 * can do. The Stripe layer maps price IDs -> Plan; enforcement reads from here.
 */
import type { Plan } from "@prisma/client";

export interface PlanConfig {
  id: Plan;
  name: string;
  priceMonthly: number; // BRL, display only — Stripe charges what its price id says
  /** BRL for a year up front, when the plan offers it. Display only. */
  priceYearly?: number;
  /** Max profiles a user/org can monitor simultaneously. */
  maxProfiles: number;
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
    name: "Grátis",
    priceMonthly: 0,
    maxProfiles: 1,
    minIntervalMinutes: 24 * 60, // once a day
    historyDays: 7,
    alerts: false,
    team: false,
    exportAndApi: false,
    features: [
      "1 perfil analisado",
      "Atualizações diárias",
      "Contagem de mulheres e homens",
      "Histórico de 7 dias",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMonthly: 29.9,
    priceYearly: 239.9,
    maxProfiles: 10,
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
      "Quem começou a seguir, sem censura",
      "Quem deixou de seguir",
      "Interações em posts específicos",
      "Até 10 perfis no Faro",
      "Histórico e relatórios completos",
      "Alertas de novas conexões",
      "Último farejo e mudanças desde a última atualização",
    ],
  },
  AGENCY: {
    id: "AGENCY",
    name: "Agency",
    priceMonthly: 149.9,
    maxProfiles: 30,
    // The paid-for extra: four passes a day instead of one. Costs ~4x per
    // profile, which the Agency price covers and the Pro price does not.
    minIntervalMinutes: 6 * 60,
    historyDays: Number.POSITIVE_INFINITY,
    alerts: true,
    team: true,
    exportAndApi: true,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_AGENCY",
    features: [
      "Até 30 perfis no Faro",
      "Farejo a cada 6 horas",
      "Histórico ilimitado",
      "Membros de equipe",
      "Exportar CSV + API",
      "Todos os canais de alerta",
    ],
  },
};

/**
 * "Uso único": unlock the full analysis of ONE profile, paid once, no
 * subscription. Display price only — Stripe charges what its price id says.
 */
export const SINGLE_UNLOCK = {
  name: "Uso único",
  price: 9.9,
  stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_SINGLE",
  features: [
    "Análise completa de 1 perfil",
    "Nomes e fotos sem censura",
    "Interações desse perfil",
    "Sem assinatura",
  ],
} as const;

export function planFor(plan: Plan): PlanConfig {
  return PLANS[plan];
}

/** Clamp a requested interval to the plan's allowed minimum. */
export function clampInterval(plan: Plan, requestedMinutes: number): number {
  return Math.max(planFor(plan).minIntervalMinutes, requestedMinutes);
}
