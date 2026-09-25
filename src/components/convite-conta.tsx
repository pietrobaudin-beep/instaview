"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Unlock, X } from "lucide-react";
import { Mascot } from "@/components/ui/mascot";

/**
 * O convite para quem está sem conta: criar a conta grátis e desbloquear uma
 * informação deste perfil — quem mais aparece nas interações dele.
 *
 * Sem conta não há plano: a pessoa vê a busca, o cartão e a prévia borrada.
 * O pop-up aparece uma vez por perfil em cada visita (Esc, X ou fundo fecham),
 * e o mesmo convite continua na página, embaixo da prévia.
 */
export function ConviteConta({ username }: { username: string }) {
  const [aberto, setAberto] = React.useState(false);
  const chave = `farejo:convite:${username}`;

  React.useEffect(() => {
    let visto = false;
    try {
      visto = sessionStorage.getItem(chave) === "1";
    } catch {
      /* sem armazenamento: mostra mesmo assim */
    }
    if (visto) return;
    const t = window.setTimeout(() => setAberto(true), 1200);
    return () => window.clearTimeout(t);
  }, [chave]);

  const fechar = React.useCallback(() => {
    setAberto(false);
    try {
      sessionStorage.setItem(chave, "1");
    } catch {
      /* ok */
    }
  }, [chave]);

  React.useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, fechar]);

  if (!aberto) return null;
  const volta = encodeURIComponent(`/p/${username}?revelar=1`);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={fechar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="convite-conta-titulo"
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
        <Mascot pose="feliz" className="mx-auto h-20 text-vinho" bob />
        <h2 id="convite-conta-titulo" className="mt-3 text-xl font-bold">
          Crie sua conta grátis e desbloqueie uma informação
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Com a conta você revela <b className="text-foreground">quem mais aparece nas interações</b> de
          @{username}. É grátis e leva só o seu e-mail.
        </p>
        <Link
          href={`/signup?next=${volta}`}
          className="mt-5 flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-pink px-5 font-bold text-ink transition hover:opacity-90"
        >
          <Unlock className="h-4 w-4" /> Criar conta e desbloquear <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/login?next=${volta}`}
          className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
        >
          Já tenho conta
        </Link>
        <button
          type="button"
          onClick={fechar}
          className="mt-1 block w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
