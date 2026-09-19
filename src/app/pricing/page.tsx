import Link from "next/link";
import { Check, X } from "lucide-react";
import { Paywall } from "@/components/paywall";
import { UpgradeButton } from "@/components/pricing-actions";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Panel } from "@/components/ui/brand";
import { PLANS, SINGLE_UNLOCK } from "@/lib/plans";
import { SingleUnlockButton } from "@/components/single-unlock-button";
import { isBillingConfigured, isDemoBillingAllowed } from "@/lib/billing/stripe";
import { getCurrentUser } from "@/lib/auth";
import { safeNext, withParam } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Farejo Pro · Farejo", description: "Desbloqueie o Farejo completo." };

export default async function PricingPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  // Without Stripe: localhost unlocks for free (demo); the live site doesn't sell yet.
  const demoMode = !isBillingConfigured() && isDemoBillingAllowed();
  const comingSoon = !isBillingConfigured() && !isDemoBillingAllowed();
  const user = await getCurrentUser();
  const next = safeNext(searchParams.next);
  const loginHref = withParam(
    "/login",
    "next",
    next ? withParam("/pricing", "next", next) : "/pricing",
  );
  const pro = PLANS.PRO;
  // Came here from a profile page? Offer to unlock just that one.
  const fromProfile = next?.match(/^\/p\/([a-z0-9._]{1,30})$/i)?.[1] ?? null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" aria-label="Farejo">
          <Logo className="h-7" />
        </Link>
        <Link
          href={next || "/"}
          aria-label="Fechar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </Link>
      </div>

      {user?.plan === "PRO" || user?.plan === "AGENCY" ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-extrabold">Você já tem o Farejo {user.plan}.</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Todos os recursos estão liberados na sua conta.
            </p>
            <Link href={next || "/"} className="mt-2">
              <Button variant="accent">Voltar para o app</Button>
            </Link>
          </div>
        </Panel>
      ) : (
        <Paywall
          monthly={pro.priceMonthly}
          yearly={pro.priceYearly ?? pro.priceMonthly * 12}
          next={next}
          demoMode={demoMode}
          comingSoon={comingSoon}
        />
      )}

      {/* "Uso único" — see one profile, no subscription. */}
      <div className="mt-8 rounded-3xl border border-border bg-card p-6 sm:flex sm:items-center sm:gap-8">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Uso único</p>
          <h2 className="mt-2 text-xl font-bold">Só quer ver um perfil?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A análise completa de 1 perfil, sem censura, com um pagamento único de{" "}
            {SINGLE_UNLOCK.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.
            Sem assinatura.
          </p>
        </div>
        <div className="mt-5 w-full sm:mt-0 sm:w-72">
          {fromProfile ? (
            <SingleUnlockButton username={fromProfile} variant="outline" />
          ) : (
            <Link
              href="/"
              className="block rounded-full border-2 border-vinho px-6 py-3.5 text-center font-bold text-vinho transition hover:bg-vinho hover:text-cream"
            >
              Buscar um perfil
            </Link>
          )}
        </div>
      </div>

      {/* Secondary options, kept small so the Pro offer stays the focus. */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Panel title={`Farejo ${PLANS.FREE.name}`}>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {PLANS.FREE.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {f}
              </li>
            ))}
          </ul>
          <Link href={next || "/"} className="mt-4 block">
            <Button variant="outline" className="w-full">
              Continuar grátis
            </Button>
          </Link>
        </Panel>

        <Panel title={`Farejo ${PLANS.AGENCY.name}`}>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {PLANS.AGENCY.features.slice(0, 4).map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <UpgradeButton
              plan="AGENCY"
              label={`Assinar Agency · ${PLANS.AGENCY.priceMonthly.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}/mês`}
              variant="outline"
              next={next}
            />
          </div>
        </Panel>
      </div>

      {!user && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Já é assinante?{" "}
          <Link href={loginHref} className="font-semibold text-accent hover:underline">
            Entrar
          </Link>
        </p>
      )}
    </main>
  );
}
