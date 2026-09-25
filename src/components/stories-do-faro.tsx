"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { StoryViewer, type ViewerStory } from "@/components/story-viewer";

export interface PerfilComStories {
  /** Para salvar (favoritar) direto do visualizador. */
  profileId?: string;
  salvos?: string[];
  username: string;
  avatarUrl: string | null;
  displayName: string | null;
  stories: ViewerStory[];
}

/**
 * Os stories do Faro AI no topo de Rastros, como no Instagram: uma bolinha
 * por perfil, com anel rosa, e tocar abre em tela cheia.
 *
 * Só aparecem os stories que o Faro AI capturou e que o plano ainda deixa ver
 * (a janela é aplicada no servidor). Perfil sem story no prazo não entra — uma
 * bolinha que abre vazia seria promessa sem entrega.
 */
export function StoriesDoFaro({ perfis }: { perfis: PerfilComStories[] }) {
  const [aberto, setAberto] = React.useState<PerfilComStories | null>(null);
  // Favoritos por perfil, começando do que veio do servidor.
  const [salvos, setSalvos] = React.useState<Record<string, string[]>>(() =>
    Object.fromEntries(perfis.map((p) => [p.username, p.salvos ?? []])),
  );
  const [marcando, setMarcando] = React.useState<string | null>(null);
  const [aviso, setAviso] = React.useState<string | null>(null);

  async function alternar(p: PerfilComStories, storyId: string) {
    if (!p.profileId) return;
    const atuais = salvos[p.username] ?? [];
    const salvar = !atuais.includes(storyId);
    setMarcando(storyId);
    setAviso(null);
    try {
      const r = await fetch("/api/stories-salvos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId: p.profileId, storyId, salvar }),
      });
      const b = await r.json();
      if (Array.isArray(b?.ids)) setSalvos((s) => ({ ...s, [p.username]: b.ids }));
      if (b?.ok === false) {
        setAviso(
          b.motivo === "sem_espaco"
            ? "O espaço dos favoritos está cheio. Tire algum para salvar este."
            : "Os favoritos do seu plano estão cheios. Tire algum para salvar este.",
        );
      }
    } catch {
      setAviso("Não deu para salvar agora. Tente de novo.");
    } finally {
      setMarcando(null);
    }
  }
  const comStories = perfis.filter((p) => p.stories.length > 0);
  if (!comStories.length) return null;

  return (
    <section aria-label="Stories do Faro AI" className="mb-6">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-plum/50">Stories</p>
      <ul className="sem-barra -mx-6 flex gap-4 overflow-x-auto px-6 pb-1">
        {comStories.map((p) => (
          <li key={p.username} className="shrink-0">
            <button
              type="button"
              onClick={() => setAberto(p)}
              className="flex w-[76px] flex-col items-center gap-1.5 text-center"
              aria-label={`Ver os stories de @${p.username}`}
            >
              <span className="rounded-full bg-gradient-to-tr from-pink via-accent to-yellow p-[3px]">
                <span className="block rounded-full bg-background p-[2px]">
                  <Avatar src={p.avatarUrl} name={p.displayName ?? p.username} size={64} />
                </span>
              </span>
              <span className="w-full truncate text-[11px] font-semibold">@{p.username}</span>
              <span className="-mt-1 text-[10px] text-muted-foreground">
                {p.stories.length} {p.stories.length === 1 ? "story" : "stories"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {aberto && (
        <StoryViewer
          username={aberto.username}
          avatarUrl={aberto.avatarUrl}
          stories={aberto.stories}
          onClose={() => {
            setAberto(null);
            setAviso(null);
          }}
          salvar={
            aberto.profileId
              ? {
                  salvos: salvos[aberto.username] ?? [],
                  marcando,
                  aviso,
                  alternar: (id) => alternar(aberto, id),
                }
              : undefined
          }
        />
      )}
    </section>
  );
}
