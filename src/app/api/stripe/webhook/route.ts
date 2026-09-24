import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isBillingConfigured, planForPriceId, stripe } from "@/lib/billing/stripe";
import { grantUnlock } from "@/lib/access";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

const log = logger.scope("stripe:webhook");

// Stripe needs the raw body to verify the signature.
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Handles the subscription lifecycle (-> the user's plan) and
 * the one-off "uso único" (-> a ProfileUnlock). Inactive until
 * STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET are set.
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

        // "Uso único": unlock one profile — only once the money actually
        // arrived (async methods such as boleto complete the session unpaid).
        if (s.mode === "payment" && s.metadata?.kind === "single") {
          const username = normalizeUsername(String(s.metadata?.username ?? ""));
          if (userId && isValidUsername(username) && s.payment_status === "paid") {
            await grantUnlock(userId, username, s.id);
            log.info("single unlock granted", { userId, username });
          }
          break;
        }

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: s.customer ?? undefined, stripeSubscriptionId: s.subscription ?? undefined },
          });
        }
        break;
      }
      // PIX / boleto: the session completed unpaid earlier; this is the moment
      // the money actually arrives, so the one-off unlock is granted here.
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object as any;
        const userId = s.metadata?.userId ?? s.client_reference_id;
        const username = normalizeUsername(String(s.metadata?.username ?? ""));
        if (s.metadata?.kind === "single" && userId && isValidUsername(username)) {
          await grantUnlock(userId, username, s.id);
          log.info("single unlock granted (async payment)", { userId, username });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const priceId = sub.items?.data?.[0]?.price?.id;
        // Only a live subscription grants a plan; canceled / unpaid ones don't.
        const live = ["active", "trialing"].includes(sub.status);
        const plan = event.type === "customer.subscription.deleted" || !live ? "FREE" : planForPriceId(priceId);
        const userId: string | undefined = sub.metadata?.userId;

        /*
         * O ciclo das franquias acompanha o da cobrança: a âncora é a do
         * Stripe, então "renova em" na tela é o mesmo dia da fatura.
         *
         * Cancelar no fim do período marca `planEndsAt`: a pessoa usa o que
         * pagou até lá, e depois a conta volta a ser Curioso sem apagar nada.
         */
        const ancora = sub.billing_cycle_anchor ? new Date(sub.billing_cycle_anchor * 1000) : undefined;
        const fim =
          event.type === "customer.subscription.deleted"
            ? new Date()
            : sub.cancel_at_period_end && sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null;

        if (userId && event.type !== "customer.subscription.deleted") {
          // The subscription knows its user (set at checkout), so this works
          // even when it arrives before checkout.session.completed.
          await prisma.user.updateMany({
            where: { id: userId },
            data: {
              plan,
              planStartedAt: ancora,
              planEndsAt: fim,
              stripeSubscriptionId: sub.id,
              stripeCustomerId: sub.customer ?? undefined,
            },
          });
        } else {
          // Deletions only touch the user who still holds THIS subscription, so
          // ending an old one never downgrades someone on a newer one.
          await prisma.user.updateMany({ where: { stripeSubscriptionId: sub.id }, data: { plan, planEndsAt: fim } });
        }
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
