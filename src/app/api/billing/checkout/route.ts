import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeNext, withParam } from "@/lib/utils";
import { createCheckoutSession, isBillingConfigured } from "@/lib/billing/stripe";
import type { Plan } from "@prisma/client";

const bodySchema = z.object({
  plan: z.enum(["PRO", "AGENCY"]),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
  next: z.string().max(300).nullish(),
});

/**
 * Starts an upgrade.
 * - If Stripe is configured (STRIPE_SECRET_KEY + price id) -> returns a Checkout URL.
 * - Otherwise (dev/demo) -> upgrades the current user immediately so the paywall
 *   is demoable end-to-end without a Stripe account. Real payments require keys.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  const plan = parsed.data.plan as Plan;

  // Yearly falls back to the monthly price id when no annual price is set up,
  // so a missing env never blocks the purchase — it just bills monthly.
  const yearly = parsed.data.interval === "yearly";
  const priceId =
    plan === "PRO"
      ? (yearly ? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY : undefined) ??
        process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
      : (yearly ? process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_YEARLY : undefined) ??
        process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY;

  // Use the real site origin (NEXT_PUBLIC_APP_URL may be unset on Vercel).
  const origin = new URL(req.url).origin;
  const back = safeNext(parsed.data.next) ?? "/dashboard";

  if (isBillingConfigured() && priceId) {
    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      priceId,
      successUrl: origin + withParam(back, "upgraded", "1"),
      cancelUrl: origin + "/pricing",
    });
    return NextResponse.json({ url: session.url });
  }

  // Demo mode: unlock immediately.
  await prisma.user.update({ where: { id: user.id }, data: { plan } });
  return NextResponse.json({ unlocked: true });
}
