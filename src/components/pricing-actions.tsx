"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withParam } from "@/lib/utils";

export function UpgradeButton({
  plan,
  label,
  variant = "accent",
  next,
}: {
  plan: "CAO" | "DETETIVE" | "FAREJADOR_MAIS";
  label: string;
  variant?: "accent" | "outline";
  /** Where to send the buyer once the purchase completes (e.g. /p/<username>). */
  next?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function upgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, next }),
      });

      // Not logged in yet → create an account first, then come straight back here.
      if (res.status === 401) {
        const back = next ? withParam("/pricing", "next", next) : "/pricing";
        router.push(withParam("/signup", "next", back));
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Algo deu errado");
        return;
      }
      if (data.url) {
        window.location.href = data.url; // Stripe Checkout
      } else {
        // Demo unlock (no Stripe keys) — go back to where they were, now revealed.
        router.push(next || "/rastros");
        router.refresh();
      }
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button variant={variant} className="w-full" onClick={upgrade} disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </Button>
      {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
