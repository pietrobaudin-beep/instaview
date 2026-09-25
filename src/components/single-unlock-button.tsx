"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Unlock } from "lucide-react";
import { SINGLE_UNLOCK } from "@/lib/plans";
import { withParam } from "@/lib/utils";
import { cn } from "@/lib/utils";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * "Uso único": pay once to see ONE profile in full. Sends a signed-out visitor
 * to create an account first (the unlock has to belong to someone), then
 * straight back here.
 */
export function SingleUnlockButton({
  username,
  className,
  variant = "primary",
}: {
  /** Sem @: compra 1 análise para usar depois, no perfil que quiser. */
  username?: string | null;
  className?: string;
  variant?: "primary" | "outline";
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Crédito já comprado: usa aqui em vez de pagar de novo.
  const [creditos, setCreditos] = React.useState(0);
  const here = username ? `/p/${encodeURIComponent(username)}` : "/";

  React.useEffect(() => {
    if (!username) return;
    fetch("/api/avulso/usar")
      .then((r) => r.json())
      .then((b) => setCreditos(Number(b?.creditos) || 0))
      .catch(() => {});
  }, [username]);

  async function usar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/avulso/usar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Não deu para usar agora.");
      else window.location.href = withParam(here, "unlocked", "1");
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "SINGLE", username: username ?? null, next: here }),
      });
      if (res.status === 401) {
        router.push(withParam("/signup", "next", here));
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível iniciar o pagamento.");
        return;
      }
      if (data.url) {
        window.location.href = data.url; // Stripe Checkout
      } else {
        // Demo mode: unlocked immediately — reload to show the full profile.
        window.location.href = withParam(here, "unlocked", "1");
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (username && creditos > 0) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={usar}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3.5 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
          Usar minha análise em @{username}
        </button>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          Você tem {creditos} {creditos === 1 ? "análise avulsa" : "análises avulsas"} · já paga
        </p>
        {error && <p className="mt-1 text-center text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={buy}
        disabled={loading}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-bold transition disabled:opacity-60",
          variant === "primary"
            ? "bg-vinho text-cream hover:opacity-90"
            : "border-2 border-vinho text-vinho hover:bg-vinho hover:text-cream",
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
        {username ? `Ver @${username}` : "Comprar 1 análise"} · {brl(SINGLE_UNLOCK.price)}
      </button>
      <p className="mt-1.5 text-center text-xs text-muted-foreground">
        {username ? "Uso único · sem assinatura" : "Escolha o perfil depois · sem assinatura"}
      </p>
      {error && <p className="mt-1 text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
