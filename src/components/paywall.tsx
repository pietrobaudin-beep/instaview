"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { StatusPill } from "@/components/ui/brand";
import { withParam } from "@/lib/utils";

const BENEFITS = [
  { emoji: "📌", title: "Coloque perfis no Faro AI", body: "Acompanhe os perfis que você escolher." },
  { emoji: "🐾", title: "Histórico de rastros", body: "Veja as mudanças anteriores." },
  { emoji: "🔔", title: "Alertas", body: "Receba as novidades detectadas." },
  { emoji: "❤️", title: "Interações", body: "Interações públicas disponíveis, organizadas." },
  { emoji: "👥", title: "Seguidores e seguindo", body: "Compare as mudanças ao longo do tempo." },
  { emoji: "📊", title: "Raio-X", body: "Entenda padrões e atividade." },
];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * The Pro paywall. Built on the brand board's dark card so the paid tier reads
 * as the exclusive one, with the pink and yellow accents keeping it on-brand.
 */
export function Paywall({
  monthly,
  yearly,
  next,
  demoMode,
  comingSoon = false,
}: {
  monthly: number;
  yearly: number;
  next?: string | null;
  /** True on localhost without Stripe keys: "subscribing" just unlocks locally. */
  demoMode: boolean;
  /** True on the live site without Stripe keys: nothing is on sale yet. */
  comingSoon?: boolean;
}) {
  const router = useRouter();
  const [interval, setInterval] = React.useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "PRO", interval, next }),
      });
      if (res.status === 401) {
        const back = next ? withParam("/pricing", "next", next) : "/pricing";
        router.push(withParam("/signup", "next", back));
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Algo deu errado. Tente novamente.");
        return;
      }
      if (data.url) {
        window.location.href = data.url; // Stripe Checkout
      } else {
        router.push(next || "/");
        router.refresh();
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const options = [
    { id: "monthly" as const, label: "Mensal", price: brl(monthly), note: "por mês" },
    { id: "yearly" as const, label: "Anual", price: brl(yearly), note: "2 meses grátis" },
  ];

  return (
    <div className="premium-surface relative overflow-hidden rounded-3xl p-7 sm:p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-pink/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-purple/20 blur-3xl" />
      <div className="relative">
      <StatusPill tone="yellow" className="text-xs">
        Farejo PRO
      </StatusPill>

      <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        Seu faro, ligado 24h.
      </h1>
      <p className="mt-3 max-w-lg text-cream/75">
        Escolha quem acompanhar. O Farejo organiza as mudanças e te avisa quando encontrar algo
        novo.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex items-start gap-3">
            <span className="text-xl leading-none" aria-hidden>
              {b.emoji}
            </span>
            <span>
              <span className="block text-sm font-bold">{b.title}</span>
              <span className="block text-xs text-cream/65">{b.body}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const active = interval === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setInterval(o.id)}
              aria-pressed={active}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                active
                  ? "border-pink bg-white/10"
                  : "border-white/15 bg-white/[0.04] opacity-80 hover:opacity-100"
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-semibold">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    active ? "border-pink" : "border-white/40"
                  }`}
                >
                  {active && (
                    <span className="h-2 w-2 rounded-full bg-pink" />
                  )}
                </span>
                {o.label}
              </span>
              <span className="mt-2 block text-2xl font-bold">{o.price}</span>
              <span className="block text-xs opacity-70">{o.note}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={subscribe}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-pink px-6 py-4 text-base font-bold text-ink transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Assinar agora
        {!loading && <ArrowRight className="h-5 w-5" />}
      </button>

      {error && <p className="mt-3 text-center text-sm font-semibold">{error}</p>}
      {demoMode && (
        <p className="mt-3 text-center text-xs opacity-70">
          Modo demonstração: a assinatura libera na hora e nada é cobrado.
        </p>
      )}
      {comingSoon && (
        <p className="mt-3 text-center text-xs opacity-70">Os pagamentos abrem em breve.</p>
      )}
      <p className="mt-2 text-center text-xs opacity-70">Cancele quando quiser.</p>
      </div>
    </div>
  );
}
