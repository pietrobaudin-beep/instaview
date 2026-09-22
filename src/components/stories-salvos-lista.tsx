"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, Loader2, Search, Star } from "lucide-react";
import { StoryViewer } from "@/components/story-viewer";
import type { SavedStory } from "@/components/saved-stories";

/**
 * A página dos stories que a pessoa salvou com a estrela.
 *
 * Saiu de dentro do painel do Faro: a lista dobrava a altura do cartão e, no
 * celular, empurrava as pistas para fora da tela. Aqui cabe em grade, com
 * espaço para crescer — que é o ponto, já que a coleção aumenta todo mês.
 *
 * Estes stories **não expiram** com o prazo do plano; é isso que a estrela
 * compra. Tirar a estrela devolve o story ao prazo normal, e por isso a tela
 * avisa antes.
 */
const proxied = (url: string | null) =>
  url && /(?:\.fbcdn\.net|\.cdninstagram\.com)/i.test(url)
    ? `/api/img?url=${encodeURIComponent(url)}`
    : url;

function horas(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function quando(h: number): string {
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${Math.round(h)} h`;
  return `há ${Math.round(h / 24)} d`;
}

export function StoriesSalvosLista({
  stories,
  username,
  avatarUrl,
  profileId,
  cotaInicial,
}: {
  stories: SavedStory[];
  username: string;
  avatarUrl?: string | null;
  profileId: string;
  cotaInicial: { usados: number; limite: number; restam: number };
}) {
  const [lista, setLista] = React.useState(stories);
  const [aberto, setAberto] = React.useState(-1);
  const [tirando, setTirando] = React.useState<string | null>(null);
  const [cota, setCota] = React.useState(cotaInicial);

  async function tirar(storyId: string) {
    setTirando(storyId);
    const antes = lista;
    // Some antes da resposta: quem tirou a estrela já decidiu.
    setLista((l) => l.filter((s) => s.id !== storyId));
    try {
      const r = await fetch("/api/stories-salvos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId, storyId, salvar: false }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(String(r.status));
      if (b?.cota) setCota(b.cota);
    } catch {
      setLista(antes);
    } finally {
      setTirando(null);
    }
  }

  if (!lista.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border p-8 text-center">
        <Star className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-3 font-bold">Nenhum story salvo ainda.</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          No painel do Faro, toque na estrela de um story guardado. Ele deixa de expirar e fica
          aqui.
        </p>
        <Link
          href={`/rastros/${encodeURIComponent(username)}`}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-2xl bg-muted px-4 text-sm font-bold transition hover:opacity-90"
        >
          Voltar ao painel
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
        Estes não expiram, mesmo depois do prazo do seu plano. Você salvou {cota.usados} de{" "}
        {cota.limite} neste mês.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {lista.map((s, i) => (
          <div key={s.id} className="relative">
            <button
              type="button"
              onClick={() => setAberto(i)}
              aria-label={`Ver story salvo de @${username}`}
              className="relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-yellow/40 to-pink/40 ring-2 ring-yellow ring-offset-2 ring-offset-background transition hover:opacity-90"
            >
              {s.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proxied(s.thumbnailUrl)!}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
              <span className="absolute left-2 top-2 rounded-full bg-ink/65 px-1.5 py-0.5 text-[10px] font-bold text-cream">
                {quando(horas(s.detectedAt))}
              </span>
              {horas(s.detectedAt) >= 24 && (
                <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-full bg-ink/75 px-2 py-1 text-[10px] font-semibold text-cream">
                  <Clock className="h-3 w-3" /> expirou no Instagram
                </span>
              )}
            </button>

            {/* Fora do botão que abre: dentro, o toque abriria a tela cheia. */}
            <button
              type="button"
              onClick={() => tirar(s.id)}
              aria-label="Tirar dos salvos"
              title="Tirar dos salvos — volta a valer o prazo do plano"
              className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-ink/65 text-cream transition hover:bg-ink/80"
            >
              {tirando === s.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Star className="h-4 w-4 fill-yellow text-yellow" />
              )}
            </button>

            {s.mentions.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {s.mentions.map((m) => (
                  <Link
                    key={m}
                    href={`/p/${encodeURIComponent(m)}`}
                    title={`Farejar @${m}`}
                    className="flex items-center gap-1 truncate text-[11px] font-semibold text-accent hover:underline"
                  >
                    <Search className="h-3 w-3 shrink-0" />
                    <span className="truncate">Farejar @{m}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {aberto >= 0 && (
        <StoryViewer
          username={username}
          avatarUrl={avatarUrl}
          startAt={aberto}
          stories={lista.map((s) => ({
            id: s.id,
            imageUrl: proxied(s.thumbnailUrl),
            takenAt: s.takenAt ?? s.detectedAt,
            mentions: s.mentions,
            expirou: horas(s.detectedAt) >= 24,
          }))}
          onClose={() => setAberto(-1)}
        />
      )}
    </>
  );
}
