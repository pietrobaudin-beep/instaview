"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Clock, Loader2, Search, Star } from "lucide-react";
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
  profileId,
  salvosIniciais = [],
  cotaInicial = { usados: 0, limite: 0, restam: 0 },
}: {
  stories: SavedStory[];
  plan: Plan;
  username: string;
  avatarUrl?: string | null;
  /** Sem ele não dá para marcar: é a chave da lista de salvos. */
  profileId?: string;
  /** Os ids já marcados, vindos do servidor. */
  salvosIniciais?: string[];
  /** Quantos salvamentos o plano ainda permite neste mês. */
  cotaInicial?: { usados: number; limite: number; restam: number };
}) {
  const [aberto, setAberto] = React.useState(-1);
  const [salvos, setSalvos] = React.useState<string[]>(salvosIniciais);
  const [marcando, setMarcando] = React.useState<string | null>(null);
  /*
   * A cota vem do servidor, em vez de ser importada: o arquivo que a define
   * também importa o Prisma, e trazê-lo para cá arrastaria código de servidor
   * para o navegador.
   */
  const [cota, setCota] = React.useState(cotaInicial);
  const [semCota, setSemCota] = React.useState(false);

  /**
   * Marca ou desmarca, mudando a tela antes da resposta.
   *
   * Marcar é um gesto pequeno e repetido; esperar o servidor a cada estrela
   * faria a lista piscar. Se o pedido falhar, volta como estava.
   */
  async function alternar(storyId: string) {
    if (!profileId) return;
    const estava = salvos.includes(storyId);
    setMarcando(storyId);
    setSemCota(false);
    setSalvos((atual) => (estava ? atual.filter((id) => id !== storyId) : [storyId, ...atual]));
    try {
      const r = await fetch("/api/stories-salvos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId, storyId, salvar: !estava }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(String(r.status));
      if (Array.isArray(b?.ids)) setSalvos(b.ids);
      if (b?.cota) setCota(b.cota);
      // Recusado por falta de cota: a tela volta atrás e diz por quê.
      if (b?.ok === false) {
        setSemCota(true);
        setSalvos((atual) => atual.filter((id) => id !== storyId));
      }
    } catch {
      setSalvos((atual) => (estava ? [storyId, ...atual] : atual.filter((id) => id !== storyId)));
    } finally {
      setMarcando(null);
    }
  }

  if (!stories.length) return null;

  const janela = planFor(plan).storiesHours;
  const prazo =
    janela === Number.POSITIVE_INFINITY
      ? "Guardados desde a entrada no Faro, sem prazo."
      : `Guardados por ${janela} horas pelo seu plano.`;

  /*
   * O prazo do plano vale para o que o Faro guardou sozinho. O que a pessoa
   * marcou com a estrela **escapa dele**: é isso que a estrela compra, e é
   * por isso que ela tem cota mensal.
   *
   * No Faro Detetive a janela já é infinita, então lá marcar é só organizar.
   */
  const dentroDoPrazo = stories.filter((s) => horas(s.detectedAt) <= janela);
  const marcados = stories.filter((s) => salvos.includes(s.id));
  const visiveis = dentroDoPrazo;
  if (!visiveis.length && !marcados.length) return null;

  const paraViewer = (lista: SavedStory[]) =>
    lista.map((s) => ({
      id: s.id,
      imageUrl: proxied(s.thumbnailUrl),
      takenAt: s.takenAt ?? s.detectedAt,
      mentions: s.mentions,
      expirou: horas(s.detectedAt) >= 24,
    }));

  return (
    <Panel title="Stories guardados">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {visiveis.map((s, i) => {
          const h = horas(s.detectedAt);
          const expirou = h >= 24;
          return (
            <div key={s.id} className="relative w-32 shrink-0 sm:w-36">
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

              {/* A estrela fica FORA do botão que abre o story: dentro, o
                  toque abriria a tela cheia em vez de marcar. */}
              {profileId && (
                <button
                  type="button"
                  onClick={() => alternar(s.id)}
                  aria-pressed={salvos.includes(s.id)}
                  aria-label={salvos.includes(s.id) ? "Tirar dos salvos" : "Salvar este story"}
                  title={salvos.includes(s.id) ? "Tirar dos salvos" : "Salvar este story"}
                  className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-ink/65 text-cream transition hover:bg-ink/80"
                >
                  {marcando === s.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Star
                      className={`h-4 w-4 ${salvos.includes(s.id) ? "fill-yellow text-yellow" : ""}`}
                    />
                  )}
                </button>
              )}
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
          );
        })}
      </div>
      {aberto >= 0 && (
        <StoryViewer
          username={username}
          avatarUrl={avatarUrl}
          startAt={aberto}
          stories={paraViewer(visiveis)}
          onClose={() => setAberto(-1)}
        />
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {prazo} O Farejo copiou a miniatura quando ela ainda estava pública; o story em si sai do
        Instagram em 24 horas.
        {profileId && cota.limite > 0 && janela !== Number.POSITIVE_INFINITY && (
          <>
            {" "}
            Toque na <b className="font-semibold">estrela</b> para o story não expirar —{" "}
            {cota.restam} de {cota.limite} ainda neste mês.
          </>
        )}
        {profileId && cota.limite > 0 && janela === Number.POSITIVE_INFINITY && (
          <> Aqui nada expira; a estrela serve para separar os que importam.</>
        )}
      </p>

      {/*
        * "Stories salvos" tem página própria (`/rastros/<@>/salvos`).
        *
        * A lista morava aqui embaixo e dobrava a altura do cartão — num
        * celular, empurrava as pistas para fora da tela. Aqui fica só o
        * atalho, com a contagem, que é o que interessa de relance.
        */}
      {profileId && marcados.length > 0 && (
        <Link
          href={`/rastros/${encodeURIComponent(username)}/salvos`}
          className="mt-4 flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-4 transition hover:border-accent/50"
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <Star className="h-4 w-4 fill-yellow text-yellow" />
            Stories salvos
            <span className="text-muted-foreground">· {marcados.length}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      {semCota && (
        <p className="mt-2 text-[11px] font-semibold text-destructive">
          Você já salvou {cota.limite} stories este mês. A cota volta no dia 1º — ou você libera
          espaço tirando a estrela de algum.
        </p>
      )}
    </Panel>
  );
}
