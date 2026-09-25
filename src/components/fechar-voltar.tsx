"use client";

import { X } from "lucide-react";

/**
 * O X que fecha: volta para onde a pessoa estava no Farejo; se ela chegou
 * direto (link de fora), vai para a página inicial. Nunca para a página de
 * planos antiga.
 */
export function FecharVoltar({ fallback = "/" }: { fallback?: string }) {
  function fechar() {
    try {
      const veio = document.referrer ? new URL(document.referrer) : null;
      if (veio && veio.origin === location.origin && !veio.pathname.startsWith("/checkout") && history.length > 1) {
        history.back();
        return;
      }
    } catch {
      /* cai no padrão */
    }
    location.href = fallback;
  }
  return (
    <button
      type="button"
      onClick={fechar}
      aria-label="Fechar"
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <X className="h-5 w-5" />
    </button>
  );
}
