/**
 * Plan definitions + entitlements. Single source of truth for what each tier
 * can do. The Stripe layer maps price IDs -> Plan; enforcement reads from here.
 */
import type { Plan } from "@prisma/client";

export interface PlanConfig {
  id: Plan;
  name: string;
  priceMonthly: number; // USD, display only
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
    name: "Free",
    priceMonthly: 0,
    maxProfiles: 1,
    minIntervalMinutes: 24 * 60, // once a day
    historyDays: 7,
    alerts: false,
    team: false,
    exportAndApi: false,
    features: ["1 tracked profile", "Daily updates", "7-day history", "New-follower detection"],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMonthly: 19,
    maxProfiles: 10,
    minIntervalMinutes: 60, // hourly
    historyDays: 365,
    alerts: true,
    team: false,
    exportAndApi: false,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_PRO",
    features: ["10 tracked profiles", "Hourly updates", "Full history", "Email + webhook alerts"],
  },
  AGENCY: {
    id: "AGENCY",
    name: "Agency",
    priceMonthly: 99,
    maxProfiles: 100,
    minIntervalMinutes: 30,
    historyDays: Number.POSITIVE_INFINITY,
    alerts: true,
    team: true,
    exportAndApi: true,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_AGENCY",
    features: [
      "100 tracked profiles",
      "30-min updates",
      "Unlimited history",
      "Team members",
      "CSV export + REST API",
      "All alert channels",
    ],
  },
};

export function planFor(plan: Plan): PlanConfig {
  return PLANS[plan];
}

/** Clamp a requested interval to the plan's allowed minimum. */
export function clampInterval(plan: Plan, requestedMinutes: number): number {
  return Math.max(planFor(plan).minIntervalMinutes, requestedMinutes);
}
