import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isBillingConfigured, planForPriceId, stripe } from "@/lib/billing/stripe";

const log = logger.scope("stripe:webhook");

// Stripe needs the raw body to verify the signature.
export const dynamic = "force-dynamic";

/**
 * Stripe webhook (scaffold). Handles subscription lifecycle -> updates the
 * user's plan. Inactive until STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET are set.
 */
export async function POST(req: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 501 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Missing webhook secret" }, { status: 501 });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig!, secret);
  } catch (e) {
    log.error("signature verification failed", { error: e });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as any;
        const userId = s.metadata?.userId ?? s.client_reference_id;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: s.customer ?? undefined, stripeSubscriptionId: s.subscription ?? undefined },
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = event.type === "customer.subscription.deleted" ? "FREE" : planForPriceId(priceId);
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { plan },
        });
        break;
      }
      default:
        log.debug("unhandled event", { type: event.type });
    }
  } catch (e) {
    log.error("handler error", { error: e });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
