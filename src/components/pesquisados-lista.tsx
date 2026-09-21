"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export interface Pesquisado {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  quando: string;
}

/**
 * A lista de pesquisados, com o "x" para apagar da lista.
 *
 * Apagar aqui **esconde** o @, não devolve a consulta: a tabela que alimenta
 * esta lista é o caderno do limite do plano, e apagar a linha seria farejar de
 * graça outra vez. A consulta segue contada, e reabrir aquele @ continua sem
 * custo, como sempre.
 */
export function PesquisadosLista({ itens }: { itens: Pesquisado[] }) {
  const router = useRouter();
  const [saindo, setSaindo] = React.useState<string | null>(null);
  const [limpando, setLimpando] = React.useState(false);
  const [confirmarTudo, setConfirmarTudo] = React.useState(false);

  async function apagar(username: string) {
    setSaindo(username);
    try {
      await fetch(`/api/pesquisados?username=${encodeURIComponent(username)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setSaindo(null);
    }
  }

  async function limparTudo() {
    setLimpando(true);
    try {
      await fetch("/api/pesquisados?tudo=1", { method: "DELETE" });
      router.refresh();
    } finally {
      setLimpando(false);
      setConfirmarTudo(false);
    }
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-plum/50">
          {itens.length} {itens.length === 1 ? "perfil" : "perfis"}
        </p>
        {confirmarTudo ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={limparTudo}
              disabled={limpando}
              className="flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {limpando && <Loader2 className="h-3 w-3 animate-spin" />}
              Limpar a lista toda
            </button>
            <button
              type="button"
              onClick={() => setConfirmarTudo(false)}
              className="text-xs font-semibold text-muted-foreground hover:underline"
            >
              cancelar
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmarTudo(true)}
            className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Limpar lista
          </button>
        )}
      </div>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {itens.map((p) => (
          <li key={p.username} className="relative">
            <Link
              href={`/p/${encodeURIComponent(p.username)}`}
              className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 pr-11 transition hover:border-accent/50"
            >
              <Avatar src={p.avatarUrl} name={p.displayName ?? p.username} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">@{p.username}</p>
                {p.displayName && (
                  <p className="truncate text-xs text-muted-foreground">{p.displayName}</p>
                )}
                <p className="text-xs text-muted-foreground">farejado {p.quando}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>

            <button
              type="button"
              onClick={() => apagar(p.username)}
              disabled={saindo === p.username}
              aria-label={`Tirar @${p.username} da lista`}
              title="Tirar da lista"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {saindo === p.username ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Tirar da lista não devolve a consulta do seu plano — ela já foi usada. Reabrir um @ que você
        já farejou continua sem custo.
      </p>
    </>
  );
}
