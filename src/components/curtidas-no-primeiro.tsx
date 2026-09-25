"use client";

import * as React from "react";
import { Heart, ImageIcon, Loader2, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/brand";
import type { CurtidasNoPrimeiro } from "@/lib/analise";

// O CDN do Instagram bloqueia imagem embutida; passa pelo proxy.
const viaProxy = (u: string) =>
  /(?:\.fbcdn\.net|\.cdninstagram\.com)/i.test(u)
    ? `/api/img?url=${encodeURIComponent(u)}`
    : u;

/**
 * "O que @x curtiu de @y": os posts mais recentes da conta com quem a pessoa
 * mais interage, cada um dizendo se ela curtiu ou comentou.
 *
 * "Não apareceu" não é "não curtiu": em post grande o Instagram entrega só
 * parte de quem curtiu.
 */
export function CurtidasNoPrimeiroPanel({
  username,
  dados,
}: {
  username: string;
  dados: CurtidasNoPrimeiro;
}) {
  const { alvo, posts } = dados;
  const achou = posts.filter((p) => p.curtiu || p.comentou).length;
  return (
    <Panel
      title={
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            src={alvo.avatarUrl}
            name={alvo.displayName ?? alvo.username}
            size={40}
          />
          <div className="min-w-0 text-left">
            <h2 className="truncate text-base font-bold tracking-tight">
              ❤️ O que @{username} curtiu
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              nos posts de{" "}
              <a
                href={`https://instagram.com/${alvo.username}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-foreground hover:underline"
              >
                @{alvo.username}
              </a>
              , com quem mais interage
            </p>
          </div>
        </div>
      }
    >
      <div className="grid max-w-sm grid-cols-2 gap-2">
        {posts.map((p) => {
          const link = p.code
            ? `https://instagram.com/p/${p.code}`
            : `https://instagram.com/${alvo.username}`;
          return (
            <a
              key={p.id}
              href={link}
              target="_blank"
              rel="noreferrer"
              className="group relative block aspect-square overflow-hidden rounded-2xl bg-muted"
            >
              {p.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viaProxy(p.thumbnailUrl)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                </span>
              )}
              <span className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap justify-center gap-1">
                {p.curtiu && (
                  <span className="flex items-center gap-1 rounded-full bg-pink px-2 py-0.5 text-[11px] font-bold text-white shadow">
                    <Heart className="h-3 w-3 fill-white" /> Curtiu
                  </span>
                )}
                {p.comentou && (
                  <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white shadow">
                    <MessageCircle className="h-3 w-3 fill-white" /> Comentou
                  </span>
                )}
                {!p.curtiu && !p.comentou && (
                  <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Não apareceu
                  </span>
                )}
              </span>
            </a>
          );
        })}
      </div>
      <p className="mt-3 text-sm font-semibold">
        {achou === 0
          ? `Não apareceu nos ${posts.length} posts mais recentes.`
          : `Curtiu ${achou} de ${posts.length} posts mais recentes.`}
      </p>
    </Panel>
  );
}

/**
 * O botão que busca "o que curtiu" — a leitura só acontece aqui, quando a
 * pessoa toca. Uma vez por análise; depois fica salvo.
 */
export function CurtidasSobDemanda({
  username,
  alvo,
  inicial,
  liberado,
}: {
  username: string;
  alvo: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  inicial: CurtidasNoPrimeiro | null;
  /** O plano tem "Ver curtidas" (Farejador +). Sem ele, o botão leva aos planos. */
  liberado: boolean;
}) {
  const [dados, setDados] = React.useState<CurtidasNoPrimeiro | null>(inicial);
  const [estado, setEstado] = React.useState<"idle" | "busy" | "erro">("idle");
  React.useEffect(() => setDados(inicial), [inicial]);

  if (dados)
    return <CurtidasNoPrimeiroPanel username={username} dados={dados} />;

  async function ver() {
    setEstado("busy");
    try {
      const r = await fetch("/api/curtidas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const b = await r.json().catch(() => ({}));
      if (b?.curtidas) {
        setDados(b.curtidas);
        setEstado("idle");
      } else setEstado("erro");
    } catch {
      setEstado("erro");
    }
  }

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-3xl border border-border bg-card p-5">
      <Avatar
        src={alvo.avatarUrl}
        name={alvo.displayName ?? alvo.username}
        size={48}
      />
      <div className="min-w-0 flex-1">
        <p className="font-bold">❤️ O que @{username} curtiu</p>
        <p className="text-sm text-muted-foreground">
          nos posts recentes de{" "}
          <b className="font-semibold text-foreground">@{alvo.username}</b>, com
          quem mais interage
        </p>
        {estado === "erro" && (
          <p className="mt-1 text-sm text-red-600">
            Não deu para conferir agora. Tente de novo mais tarde.
          </p>
        )}
      </div>
      {!liberado ? (
        <a
          href={`/pricing?next=${encodeURIComponent(`/p/${username}`)}`}
          className="flex items-center gap-2 rounded-full border-2 border-accent px-5 py-2 text-sm font-bold text-accent transition hover:bg-accent hover:text-white max-sm:w-full max-sm:justify-center"
        >
          🔒 No Farejador +
        </a>
      ) : (
        <button
          type="button"
          onClick={ver}
          disabled={estado === "busy"}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-70 max-sm:w-full max-sm:justify-center"
        >
          {estado === "busy" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Farejando…
            </>
          ) : (
            "Ver curtidas"
          )}
        </button>
      )}
    </section>
  );
}
