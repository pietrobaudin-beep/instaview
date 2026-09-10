import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createCheckoutSession, isBillingConfigured } from "@/lib/billing/stripe";
import type { Plan } from "@prisma/client";

const bodySchema = z.object({ plan: z.enum(["PRO", "AGENCY"]) });

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

  const priceId =
    plan === "PRO"
      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
      : process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY;

  if (isBillingConfigured() && priceId) {
    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      priceId,
      successUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=1`,
      cancelUrl: `${env.NEXT_PUBLIC_APP_URL}/pricing`,
    });
    return NextResponse.json({ url: session.url });
  }

  // Demo mode: unlock immediately.
  await prisma.user.update({ where: { id: user.id }, data: { plan } });
  return NextResponse.json({ unlocked: true });
}
