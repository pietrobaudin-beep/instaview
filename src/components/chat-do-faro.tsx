"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { PergunteAoFaro } from "@/components/pergunte-ao-faro";

/**
 * Escolher de quem se fala, e então perguntar.
 *
 * A pergunta é sempre **sobre um perfil**: o dossiê que sustenta a resposta é
 * o que o Faro AI juntou daquele perfil ao longo do tempo. Sem escolher,
 * não há sobre o que responder — por isso o primeiro da lista já vem
 * escolhido, em vez de uma tela em branco pedindo um clique.
 */
export function ChatDoFaro({
  perfis,
}: {
  perfis: { username: string; displayName: string | null; avatarUrl: string | null }[];
}) {
  const [quem, setQuem] = React.useState(perfis[0]?.username ?? "");

  return (
    <div className="mt-6">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-plum/50">
        Sobre quem?
      </p>
      <div className="sem-barra -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {perfis.map((p) => (
          <button
            key={p.username}
            type="button"
            onClick={() => setQuem(p.username)}
            aria-pressed={quem === p.username}
            className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl px-3 text-sm font-semibold transition ${
              quem === p.username
                ? "bg-pink text-ink"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Avatar src={p.avatarUrl} name={p.displayName ?? p.username} size={24} />@{p.username}
          </button>
        ))}
      </div>

      {quem && (
        <div className="mt-4">
          {/* `key`: trocar de perfil começa uma conversa nova. Manter a
              resposta anterior na tela, com outro @ escolhido, seria a coisa
              mais fácil de ler errado nesta página. */}
          <PergunteAoFaro key={quem} username={quem} />
        </div>
      )}
    </div>
  );
}
