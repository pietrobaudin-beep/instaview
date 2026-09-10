import Link from "next/link";
import { Activity, Check } from "lucide-react";
import { UpgradeButton } from "@/components/pricing-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PLANS } from "@/lib/plans";
import { isBillingConfigured } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  const demoMode = !isBillingConfigured();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Activity className="h-5 w-5 text-accent" /> InstaView
        </Link>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          Dashboard →
        </Link>
      </div>

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Reveal who started following
        </h1>
        <p className="mt-3 text-muted-foreground">
          Free shows the numbers. Upgrade to unlock the names, photos and timestamps.
        </p>
        {demoMode && (
          <p className="mt-2 text-xs text-accent">
            Demo mode: “upgrade” unlocks instantly (no real charge until Stripe keys are set).
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
                    <span className="text-3xl font-semibold">${plan.priceMonthly}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
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
                {key === "FREE" ? (
                  <Link href="/dashboard">
                    <Button variant="outline" className="w-full">
                      Current plan
                    </Button>
                  </Link>
                ) : (
                  <UpgradeButton
                    plan={key}
                    label={`Choose ${plan.name}`}
                    variant={highlighted ? "accent" : "outline"}
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
