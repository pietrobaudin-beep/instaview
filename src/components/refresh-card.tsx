"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Mascot } from "@/components/ui/mascot";

/**
 * Atualizar agora, com teto do dia.
 *
 * Cada atualização é uma coleta paga no provedor, então o contador fica à
 * vista: a pessoa entende por que o botão desliga, em vez de achar que quebrou.
 * A data completa aparece ao passar o mouse; na tela fica só "há 2 horas".
 *
 * Mora dentro do cartão do perfil, ao lado de "última verificação" — era um
 * cartão solto no meio da coluna, longe da informação que ele muda.
 */

interface Status {
  usadas: number;
  limite: number;
  podeAtualizar: boolean;
  ultima: string | null;
  proxima: string | null;
}

export function quando(iso: string | null): string {
  if (!iso) return "ainda não";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora mesmo";
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86400)} d`;
}

export function completa(iso: string | null): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
}

export function RefreshButton({
  profileId,
  inicial,
  onStatus,
}: {
  profileId: string;
  inicial: Status;
  /** Deixa o cartão do perfil mostrar o contador e o "última verificação". */
  onStatus?: (s: Status) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState(inicial);
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  function aplicar(s: Status) {
    setStatus(s);
    onStatus?.(s);
  }

  async function atualizar() {
    setBusy(true);
    setErro(null);
    try {
      const r = await fetch(`/api/profiles/${profileId}/refresh`, { method: "POST" });
      const b = await r.json().catch(() => null);
      if (b?.refresh) aplicar(b.refresh);
      else if (b?.usadas != null) aplicar(b);
      if (!r.ok) {
        setErro(b?.error ?? "Não deu para atualizar agora.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  const esgotou = !status.podeAtualizar;

  if (busy) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-blush px-5 py-2.5">
        <Mascot pose="cheirando" className="h-6 text-vinho" bob decorative />
        <span className="text-sm font-bold text-plum">Farejando…</span>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={atualizar}
        disabled={esgotou}
        title={esgotou ? "Limite diário de atualizações atingido. Volte amanhã." : undefined}
        className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition sm:w-auto ${
          esgotou
            ? "cursor-not-allowed bg-muted text-muted-foreground"
            : "bg-pink text-ink hover:opacity-90"
        }`}
      >
        <RefreshCw className="h-4 w-4" /> Atualizar agora
      </button>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground sm:text-left">
        {esgotou
          ? "Limite de hoje atingido. Volte amanhã."
          : `${status.usadas} de ${status.limite} atualizações hoje`}
      </p>
      {erro && <p className="mt-1 text-center text-[11px] text-destructive sm:text-left">{erro}</p>}
    </div>
  );
}
