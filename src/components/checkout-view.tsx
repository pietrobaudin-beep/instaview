"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, Lock, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import type { Produto } from "@/lib/billing/cakto";

export interface Pedido {
  produto: Produto;
  nome: string;
  detalhe: string;
  preco: number;
  periodo: string;
  itens: string[];
  /** Para onde ir quando o pagamento cair. */
  depois: string;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Checkout do Farejo: à esquerda o formulário da Cakto (PIX ou cartão),
 * embutido; à direita o pedido. A tela pergunta a cada 4 s se o webhook já
 * liberou o acesso e, quando libera, mostra a confirmação e segue.
 */
export function CheckoutView({ pedido, link, perfil }: { pedido: Pedido; link: string; perfil: string | null }) {
  const [pago, setPago] = React.useState(false);
  const [carregou, setCarregou] = React.useState(false);

  React.useEffect(() => {
    if (pago) return;
    const q = new URLSearchParams({ produto: pedido.produto, ...(perfil ? { perfil } : {}) });
    const id = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/checkout/status?${q}`);
        const b = await r.json();
        if (b?.pago) setPago(true);
      } catch {
        /* tenta de novo no próximo */
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, [pago, pedido.produto, perfil]);

  React.useEffect(() => {
    if (!pago) return;
    const id = window.setTimeout(() => (window.location.href = pedido.depois), 2500);
    return () => window.clearTimeout(id);
  }, [pago, pedido.depois]);

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-center justify-between">
          <Link href="/" aria-label="Farejo">
            <Logo className="h-7" />
          </Link>
          <Link
            href="/pricing"
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Link>
        </header>

        <div className="grid overflow-hidden rounded-3xl border border-border bg-card shadow-sm md:grid-cols-[1fr_380px]">
          {/* O pedido: no celular vem primeiro, e curto. */}
          <aside className="order-first bg-vinho p-6 text-cream md:order-last md:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cream/60">Seu pedido</p>
            <div className="mt-3 rounded-2xl bg-white/10 p-4">
              <p className="text-lg font-extrabold">{pedido.nome}</p>
              <p className="text-sm text-cream/75">{pedido.detalhe}</p>
            </div>
            <ul className="mt-5 space-y-2 text-sm max-md:hidden">
              {pedido.itens.map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
                  {i}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-baseline justify-between border-t border-white/15 pt-4">
              <span className="font-bold">Total</span>
              <span className="text-right">
                <span className="block text-2xl font-extrabold">{brl(pedido.preco)}</span>
                <span className="text-xs text-cream/60">{pedido.periodo}</span>
              </span>
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-xs text-cream/60">
              <Lock className="h-3.5 w-3.5" /> Pagamento seguro, processado pela Cakto
            </p>
          </aside>

          <section className="relative p-4 md:p-6">
            <h1 className="mb-3 text-2xl font-extrabold tracking-tight">Pagamento</h1>
            {!carregou && (
              <div className="absolute inset-x-4 top-20 flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground md:inset-x-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Abrindo o pagamento…
              </div>
            )}
            <iframe
              src={link}
              title="Pagamento"
              allow="payment *; clipboard-write"
              onLoad={() => setCarregou(true)}
              className="h-[1250px] w-full rounded-2xl border-0 bg-transparent md:h-[1050px]"
            />
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              O pagamento não abriu? Abrir em outra aba <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </section>
        </div>
      </div>

      {pago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-xl">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-7 w-7 text-emerald-700" />
            </span>
            <p className="mt-4 text-xl font-extrabold">Pagamento confirmado</p>
            <p className="mt-1 text-sm text-muted-foreground">Liberando o seu acesso…</p>
          </div>
        </div>
      )}
    </main>
  );
}
