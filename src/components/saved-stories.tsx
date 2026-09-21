"use client";

import * as React from "react";
import { AtSign, Clock } from "lucide-react";
import { Panel } from "@/components/ui/brand";
import { StoryViewer } from "@/components/story-viewer";
import { planFor } from "@/lib/plans";
import type { Plan } from "@prisma/client";

/**
 * Os stories que o Faro guardou.
 *
 * No Instagram eles somem em 24h. Aqui, enquanto o perfil está no Faro, a
 * miniatura foi copiada no momento em que o Faro a encontrou — e **continua
 * guardada enquanto o perfil estiver no Faro**, sem prazo (decidido em 21/09).
 * O prazo curto ficou só para o Farejador, que é consulta única.
 *
 * A tela diz isso com todas as letras: o que já expirou no Instagram leva o
 * aviso, para ninguém achar que ainda está no ar.
 */

export interface SavedStory {
  id: string;
  takenAt: string | null;
  detectedAt: string;
  thumbnailUrl: string | null;
  mentions: string[];
}

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

export function SavedStories({
  stories,
  plan,
  username,
  avatarUrl,
}: {
  stories: SavedStory[];
  plan: Plan;
  username: string;
  avatarUrl?: string | null;
}) {
  const [aberto, setAberto] = React.useState(-1);

  if (!stories.length) return null;

  const janela = planFor(plan).storiesHours;
  const prazo =
    janela === Number.POSITIVE_INFINITY
      ? "Guardados desde a entrada no Faro, sem prazo."
      : `Guardados por ${janela} horas pelo seu plano.`;

  // Fora da janela do plano, some — mesmo que a cópia ainda exista.
  const visiveis = stories.filter((s) => horas(s.detectedAt) <= janela);
  if (!visiveis.length) return null;

  return (
    <Panel title="Stories guardados">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {visiveis.map((s, i) => {
          const h = horas(s.detectedAt);
          const expirou = h >= 24;
          return (
            <div key={s.id} className="w-32 shrink-0 sm:w-36">
              <button
                type="button"
                onClick={() => setAberto(i)}
                aria-label={`Ver story guardado de @${username}`}
                className="relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-pink/40 to-purple/40 ring-2 ring-pink ring-offset-2 ring-offset-background transition hover:opacity-90"
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
                  {quando(h)}
                </span>
                {expirou && (
                  <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-full bg-ink/75 px-2 py-1 text-[10px] font-semibold text-cream">
                    <Clock className="h-3 w-3" /> expirou no Instagram
                  </span>
                )}
              </button>
              {s.mentions.length > 0 && (
                <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                  <AtSign className="mr-0.5 inline h-3 w-3" />
                  {s.mentions.join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {aberto >= 0 && (
        <StoryViewer
          username={username}
          avatarUrl={avatarUrl}
          startAt={aberto}
          stories={visiveis.map((s) => ({
            id: s.id,
            imageUrl: proxied(s.thumbnailUrl),
            takenAt: s.takenAt ?? s.detectedAt,
            mentions: s.mentions,
            expirou: horas(s.detectedAt) >= 24,
          }))}
          onClose={() => setAberto(-1)}
        />
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {prazo} O Farejo copiou a miniatura quando ela ainda estava pública; o story em si sai do
        Instagram em 24 horas.
      </p>
    </Panel>
  );
}
