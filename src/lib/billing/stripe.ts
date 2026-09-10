/**
 * Stripe billing scaffold.
 *
 * Structure is ready (client, price->plan mapping, checkout + webhook handler);
 * it activates as soon as STRIPE_SECRET_KEY and the price envs are set. The MVP
 * does not require a live Stripe account — plans still exist in the DB and are
 * enforced by lib/plans.ts.
 */
import Stripe from "stripe";
import type { Plan } from "@prisma/client";

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set — billing is not configured.");
  // Pin to the SDK's expected API version; cast avoids coupling the build to
  // one exact string across Stripe SDK bumps.
  if (!client) client = new Stripe(key, { apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion });
  return client;
}

export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Map a Stripe price id to an internal Plan. Extend as you add prices. */
export function planForPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return "FREE";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) return "PRO";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY) return "AGENCY";
  return "FREE";
}

/** Create a Checkout session for a plan. Wire this to an "Upgrade" button. */
export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return stripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: params.email,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    metadata: { userId: params.userId },
  });
}
