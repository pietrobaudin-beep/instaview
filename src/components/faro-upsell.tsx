"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, PawPrint, X } from "lucide-react";
import { SniffingDog } from "@/components/ui/dog";

/**
 * Shown when a free user taps "Colocar no Faro": the moment the product sells
 * its Pro difference — not more features, but someone watching for you.
 */
export function FaroUpsell({
  open,
  onClose,
  next,
}: {
  open: boolean;
  onClose: () => void;
  next: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="faro-upsell-title"
    >
      <div
        className="premium-surface relative w-full max-w-md overflow-hidden rounded-3xl p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-pink/25 blur-3xl" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-cream/70 transition hover:bg-white/10 hover:text-cream"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow px-3 py-1 text-xs font-bold text-ink">
            <PawPrint className="h-3.5 w-3.5" /> Farejo PRO
          </span>
          <h2 id="faro-upsell-title" className="mt-5 text-3xl font-bold leading-tight">
            Quer que o Farejo acompanhe por você?
          </h2>
          <p className="mt-3 text-cream/75">
            Coloque perfis no Faro e receba alertas quando houver mudanças detectáveis.
          </p>

          <SniffingDog className="mx-auto my-6 h-20 text-pink" animated />

          <Link
            href={`/pricing?next=${encodeURIComponent(next)}`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink px-6 py-4 font-bold text-ink transition hover:opacity-90"
          >
            Desbloquear Farejo PRO <ArrowRight className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full text-center text-sm text-cream/60 hover:text-cream"
          >
            Talvez mais tarde
          </button>
        </div>
      </div>
    </div>
  );
}
