"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Mascot } from "@/components/ui/mascot";

/**
 * Atualizar agora — antecipar uma coleta da franquia do ciclo.
 *
 * Cada coleta é paga no provedor e sai da franquia do plano (10 no Cão, 30 no
 * Detetive), então o contador fica à vista. No Faro de Cão não há botão: a
 * cadência de três dias é o que o plano vende, e a tela diz quando é a
 * próxima.
 * A data completa aparece ao passar o mouse; na tela fica só "há 2 horas".
 *
 * Mora dentro do cartão do perfil, ao lado de "última verificação" — era um
 * cartão solto no meio da coluna, longe da informação que ele muda.
 */

interface Status {
  usadas: number;
  /** `null` = sem limite (Admin). */
  limite: number | null;
  podeAtualizar: boolean;
  ultima: string | null;
  proxima: string | null;
  antecipa?: boolean;
  liberaEm?: string | null;
  cadenciaHoras?: number;
}

function daqui(iso: string | null | undefined): string {
  if (!iso) return "em breve";
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  if (s <= 60) return "agora";
  if (s < 3600) return `em ${Math.round(s / 60)} min`;
  if (s < 86400) return `em ${Math.round(s / 3600)} h`;
  return `em ${Math.round(s / 86400)} d`;
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
  const limite = status.limite == null || !Number.isFinite(status.limite) ? null : status.limite;
  const semColeta = limite != null && status.usadas >= limite;

  // Faro de Cão: sem botão. A tela diz a cadência e a próxima coleta.
  if (status.antecipa === false) {
    return (
      <div className="text-[11px] text-muted-foreground sm:text-right">
        <p className="font-bold text-plum">Coleta a cada {Math.round((status.cadenciaHoras ?? 72) / 24)} dias</p>
        <p>
          {semColeta
            ? "As coletas deste ciclo acabaram."
            : `Próxima ${daqui(status.proxima)} · ${status.usadas} de ${limite ?? "∞"} no ciclo`}
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={atualizar}
        disabled={esgotou}
        title={esgotou ? "Ainda não dá para antecipar a coleta." : "Antecipa uma das coletas do ciclo"}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition sm:w-auto ${
          esgotou
            ? "cursor-not-allowed bg-muted text-muted-foreground"
            : "bg-pink text-ink hover:opacity-90"
        }`}
      >
        <RefreshCw className="h-4 w-4" /> Atualizar agora
      </button>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground sm:text-left">
        {semColeta
          ? "As coletas deste ciclo acabaram."
          : esgotou
            ? `Disponível ${daqui(status.liberaEm)} · ${status.usadas} de ${limite ?? "∞"} coletas`
            : `Usa 1 das coletas · ${status.usadas} de ${limite ?? "∞"} no ciclo`}
      </p>
      {erro && <p className="mt-1 text-center text-[11px] text-destructive sm:text-left">{erro}</p>}
    </div>
  );
}
