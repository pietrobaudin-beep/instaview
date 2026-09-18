import Link from "next/link";
import { Activity, Check } from "lucide-react";
import { UpgradeButton } from "@/components/pricing-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PLANS } from "@/lib/plans";
import { isBillingConfigured } from "@/lib/billing/stripe";
import { getCurrentUser } from "@/lib/auth";
import { safeNext, withParam } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const demoMode = !isBillingConfigured();
  const user = await getCurrentUser();
  const next = safeNext(searchParams.next);
  const loginHref = withParam("/login", "next", next ? withParam("/pricing", "next", next) : "/pricing");

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo className="h-6" />
        </Link>
        {user ? (
          <span className="text-sm text-muted-foreground">
            {user.email} · plano <b className="text-foreground">{user.plan}</b>
          </span>
        ) : (
          <Link href={loginHref} className="text-sm text-muted-foreground hover:text-foreground">
            Já é assinante? Entrar →
          </Link>
        )}
      </div>

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Mais dados. Mais respostas.
        </h1>
        <p className="mt-3 text-muted-foreground">
          No grátis você vê os números. No Pro, os nomes, as fotos e a hora exata de cada mudança.
        </p>
        {demoMode && (
          <p className="mt-2 text-xs text-accent">
Modo demonstração: a assinatura libera na hora e nada é cobrado.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(["FREE", "PRO", "AGENCY"] as const).map((key) => {
          const plan = PLANS[key];
          const highlighted = key === "PRO";
          return (
            <Card
              key={key}
              className={highlighted ? "border-accent/60 ring-1 ring-accent/30" : undefined}
            >
              <CardContent className="flex h-full flex-col p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">
                      {plan.priceMonthly === 0
                        ? "Grátis"
                        : plan.priceMonthly.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                    </span>
                    {plan.priceMonthly > 0 && (
                      <span className="text-sm text-muted-foreground">/mês</span>
                    )}
                  </div>
                </div>
                <ul className="mb-6 flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                {user?.plan === key ? (
                  <Link href={next || "/dashboard"}>
                    <Button variant="outline" className="w-full">
                      Seu plano atual
                    </Button>
                  </Link>
                ) : key === "FREE" ? (
                  <Link href={next || "/"}>
                    <Button variant="outline" className="w-full">
                      Continuar grátis
                    </Button>
                  </Link>
                ) : (
                  <UpgradeButton
                    plan={key}
                    label={`Assinar ${plan.name}`}
                    variant={highlighted ? "accent" : "outline"}
                    next={next}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
