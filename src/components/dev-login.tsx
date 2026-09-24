"use client";

import * as React from "react";

/**
 * One-click sign-in to the local test accounts. Only rendered on a
 * development build (the page checks NODE_ENV), and the endpoint it calls
 * refuses on production anyway.
 */
export function DevLogin() {
  const [busy, setBusy] = React.useState<string | null>(null);

  async function enter(email: string) {
    setBusy(email);
    const r = await fetch("/api/auth/dev", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (r.ok) window.location.href = "/";
    else setBusy(null);
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border-2 border-dashed border-ink/30 bg-yellow/90 p-4 text-ink shadow-lg backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-wider">Só no localhost · contas de teste</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { email: "pro@farejo.test", label: "Entrar como assinante" },
          { email: "free@farejo.test", label: "Entrar como grátis" },
        ].map((a) => (
          <button
            key={a.email}
            type="button"
            onClick={() => enter(a.email)}
            disabled={busy !== null}
            className="rounded-full bg-ink px-3 py-2 text-sm font-bold text-cream transition hover:opacity-90 disabled:opacity-50"
          >
            {busy === a.email ? "Entrando…" : a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
