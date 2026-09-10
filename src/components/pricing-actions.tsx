"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpgradeButton({
  plan,
  label,
  variant = "accent",
}: {
  plan: "PRO" | "AGENCY";
  label: string;
  variant?: "accent" | "outline";
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
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      if (data.url) {
        window.location.href = data.url; // Stripe Checkout
      } else {
        // Demo unlock — go back to the dashboard, now revealed.
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Network error");
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
