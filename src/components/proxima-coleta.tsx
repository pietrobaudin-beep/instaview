"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2 } from "lucide-react";

/**
 * "As primeiras mudanças aparecem em 17h 42min."
 *
 * Um perfil recém-colocado no Faro AI não tem quem-entrou-quem-saiu: a
 * primeira coleta é a base, e só a segunda tem com o que comparar. Em vez de
 * um "nada por aqui" que parece defeito, a tela diz quando vem — e, quando o
 * relógio chega a zero, se atualiza sozinha até os dados chegarem.
 *
 * A atualização só relê a página (o banco). Não pede coleta nenhuma: quem
 * coleta é o cron, no horário dele.
 */
export function ProximaColeta({
  alvo,
  texto = "As primeiras mudanças aparecem na próxima coleta",
}: {
  /** Quando a próxima coleta acontece (ISO). */
  alvo: string | null;
  texto?: string;
}) {
  const router = useRouter();
  const [agora, setAgora] = React.useState(() => Date.now());
  const fim = alvo ? new Date(alvo).getTime() : null;
  const falta = fim ? fim - agora : null;

  React.useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Passou da hora: relê a página a cada minuto, por até meia hora — o cron
  // roda de hora em hora e a coleta leva alguns segundos.
  React.useEffect(() => {
    if (falta == null || falta > 0) return;
    if (falta < -30 * 60 * 1000) return;
    const id = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [falta != null && falta <= 0, router]); // eslint-disable-line react-hooks/exhaustive-deps

  if (fim == null) {
    return <p className="py-2 text-sm text-muted-foreground">{texto}.</p>;
  }

  if (falta! <= 0) {
    return (
      <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Farejando agora — as mudanças aparecem aqui em instantes.
      </p>
    );
  }

  const s = Math.floor(falta! / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const relogio = h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min ${String(seg).padStart(2, "0")}s`;

  return (
    <p className="flex flex-wrap items-center gap-2 py-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4 text-accent" />
      {texto} — em{" "}
      <b className="font-bold tabular-nums text-foreground">{relogio}</b>
    </p>
  );
}
