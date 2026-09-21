"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

/**
 * O "x" que tira um perfil do Faro, direto da lista.
 *
 * Pergunta duas vezes — o primeiro clique troca o "x" por "Tirar?" — e a rota
 * ainda exige `confirm=1`. Tirar apaga junto tudo o que o Faro já encontrou
 * daquele perfil; não tem desfazer.
 */
export function TirarDoFaro({ profileId, username }: { profileId: string; username: string }) {
  const router = useRouter();
  const [armado, setArmado] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!armado) return;
    const t = window.setTimeout(() => setArmado(false), 4000);
    return () => window.clearTimeout(t);
  }, [armado]);

  async function tirar() {
    setBusy(true);
    try {
      await fetch(`/api/profiles/${profileId}?confirm=1`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
      setArmado(false);
    }
  }

  if (armado) {
    return (
      <button
        type="button"
        onClick={tirar}
        disabled={busy}
        className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-3 w-3 animate-spin" />}
        Tirar do Faro?
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setArmado(true)}
      aria-label={`Tirar @${username} do Faro`}
      title="Tirar do Faro"
      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
