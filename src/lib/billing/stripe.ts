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

/**
 * Demo billing — "Assinar" unlocks instantly and charges nothing — so the
 * paywall can be tried end to end without a Stripe account. Never on the live
 * site: there it would hand out PRO (and provider credits) for free.
 */
export function isDemoBillingAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** Map a Stripe price id (monthly or yearly) to an internal Plan. */
export function planForPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return "FREE";
  const env = process.env;
  // A estrutura de 24/09.
  if (priceId === env.NEXT_PUBLIC_STRIPE_PRICE_CAO) return "CAO";
  if (priceId === env.NEXT_PUBLIC_STRIPE_PRICE_DETETIVE) return "DETETIVE";
  if (priceId === env.NEXT_PUBLIC_STRIPE_PRICE_FAREJADOR_MAIS) return "FAREJADOR_MAIS";
  // Os antigos continuam reconhecidos, para uma assinatura existente não cair
  // para o grátis num evento de renovação. Não são mais vendidos.
  if (priceId === env.NEXT_PUBLIC_STRIPE_PRICE_PRO || priceId === env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY) {
    return "PRO";
  }
  if (priceId === env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || priceId === env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_YEARLY) {
    return "AGENCY";
  }
  return "FREE";
}

/**
 * Create a Checkout session. "subscription" for plans; "payment" for the
 * one-off "uso único", whose metadata carries the profile being unlocked so
 * the webhook knows what to grant.
 */
export async function createCheckoutSession(params: {
  userId: string;
  /** Pre-fills Stripe Checkout; WhatsApp-only accounts have none. */
  email: string | null;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  mode?: "subscription" | "payment";
  metadata?: Record<string, string>;
}) {
  return stripe().checkout.sessions.create({
    mode: params.mode ?? "subscription",
    customer_email: params.email ?? undefined,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    metadata: { userId: params.userId, ...params.metadata },
    // The subscription carries the user id too, so its own events can find the
    // user even when they arrive before checkout.session.completed.
    ...((params.mode ?? "subscription") === "subscription"
      ? { subscription_data: { metadata: { userId: params.userId } } }
      : {}),
  });
}
