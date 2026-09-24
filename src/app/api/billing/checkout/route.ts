import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isValidUsername, normalizeUsername, safeNext, withParam } from "@/lib/utils";
import { grantUnlock } from "@/lib/access";
import { PLANS, SINGLE_UNLOCK } from "@/lib/plans";
import { createCheckoutSession, isBillingConfigured, isDemoBillingAllowed } from "@/lib/billing/stripe";
import type { Plan } from "@prisma/client";

const bodySchema = z.object({
  plan: z.enum(["CAO", "DETETIVE", "FAREJADOR_MAIS", "SINGLE"]),
  /** For "SINGLE": the one profile being unlocked. */
  username: z.string().max(60).nullish(),
  next: z.string().max(300).nullish(),
});

/**
 * Starts an upgrade.
 * - If Stripe is configured (STRIPE_SECRET_KEY + price id) -> returns a Checkout URL.
 * - Otherwise, on localhost (demo) -> upgrades the current user immediately so the
 *   paywall is demoable end-to-end without a Stripe account.
 * - Otherwise, on the live site -> refuses: nothing is ever given away for free.
 */

const NOT_YET = "Os pagamentos ainda não estão ativos. Volte em breve! 🐶";
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  // ——— "Uso único": a one-off payment that unlocks ONE profile. ———
  if (parsed.data.plan === "SINGLE") {
    const username = normalizeUsername(parsed.data.username ?? "");
    if (!isValidUsername(username)) {
      return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
    }
    const origin = new URL(req.url).origin;
    const back = safeNext(parsed.data.next) ?? `/p/${encodeURIComponent(username)}`;
    const singlePrice = process.env[SINGLE_UNLOCK.stripePriceEnv];

    if (isBillingConfigured() && singlePrice) {
      const session = await createCheckoutSession({
        userId: user.id,
        email: user.email,
        priceId: singlePrice,
        mode: "payment",
        metadata: { kind: "single", username },
        successUrl: origin + withParam(back, "unlocked", "1"),
        cancelUrl: origin + back,
      });
      return NextResponse.json({ url: session.url });
    }

    // Demo mode (no Stripe keys): unlock immediately, nothing is charged.
    if (!isDemoBillingAllowed()) return NextResponse.json({ error: NOT_YET }, { status: 503 });
    await grantUnlock(user.id, username, null);
    return NextResponse.json({ unlocked: true });
  }

  const plan = parsed.data.plan as Plan;

  /*
   * Farejador + (semanal) fica fechado até a decisão pendente: assinatura que
   * renova a cada 7 dias, ou passe de 7 dias sem renovação. Cobrar recorrência
   * sem essa definição dita antes do pagamento não é uma opção.
   */
  if (plan === "FAREJADOR_MAIS") {
    return NextResponse.json(
      { error: "O Farejador + chega em breve.", code: "semanal_pendente" },
      { status: 409 },
    );
  }

  const priceId = process.env[PLANS[plan].stripePriceEnv ?? ""];

  // Use the real site origin (NEXT_PUBLIC_APP_URL may be unset on Vercel).
  const origin = new URL(req.url).origin;
  // Depois de pagar, a pessoa vai para o Faro AI — não para a área antiga.
  const back = safeNext(parsed.data.next) ?? "/rastros";

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
  if (!isDemoBillingAllowed()) return NextResponse.json({ error: NOT_YET }, { status: 503 });
  // O ciclo das franquias começa agora.
  await prisma.user.update({
    where: { id: user.id },
    data: { plan, planStartedAt: new Date(), planEndsAt: null },
  });
  return NextResponse.json({ unlocked: true });
}
