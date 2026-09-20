"use client";

import * as React from "react";
import { AtSign, ChevronLeft, ChevronRight, Clock, Play, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

/**
 * O visualizador de stories, com o comportamento do Instagram.
 *
 * Tela cheia, barrinhas de progresso no topo, toque na direita avança, toque na
 * esquerda volta, segurar pausa, arrastar para baixo (ou Esc) fecha. As setas
 * do teclado também andam, para quem está no computador.
 *
 * Uma diferença honesta: de story em vídeo o provedor entrega **a capa**, não o
 * vídeo. A capa aparece com o aviso, em vez de fingir um play que não existe.
 */

export interface ViewerStory {
  id: string;
  /** Endereço já pronto para a tela (passado pelo proxy quando preciso). */
  imageUrl: string | null;
  takenAt: string | null;
  kind?: "photo" | "video";
  mentions: string[];
  /** Marcado quando a cópia já sobreviveu ao story no Instagram. */
  expirou?: boolean;
}

/** Quanto tempo cada story fica na tela, como no Instagram. */
const DURACAO_MS = 5000;
const TICK_MS = 50;

function quando(iso: string | null): string {
  if (!iso) return "";
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (h < 1) return `há ${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `há ${Math.round(h)} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "1 dia atrás" : `${d} dias atrás`;
}

export function StoryViewer({
  stories,
  startAt = 0,
  username,
  avatarUrl,
  onClose,
}: {
  stories: ViewerStory[];
  startAt?: number;
  username: string;
  avatarUrl?: string | null;
  onClose: () => void;
}) {
  const [i, setI] = React.useState(Math.min(startAt, Math.max(0, stories.length - 1)));
  const [progresso, setProgresso] = React.useState(0);
  const [pausado, setPausado] = React.useState(false);
  const toqueIniciado = React.useRef<{ t: number; y: number } | null>(null);

  const atual = stories[i];

  /**
   * Posição e progresso vivem em refs, e só refletem na tela.
   *
   * Trocar de story dentro do `setState` parecia funcionar e não funcionava:
   * o React roda esse pedaço duas vezes em desenvolvimento, então cada volta
   * do relógio pulava dois stories e o visualizador fechava sozinho em poucos
   * segundos. Com ref, quem manda é o relógio, uma vez por volta.
   */
  const iRef = React.useRef(i);
  const progRef = React.useRef(0);

  const irPara = React.useCallback((n: number) => {
    iRef.current = n;
    progRef.current = 0;
    setI(n);
    setProgresso(0);
  }, []);

  const avancar = React.useCallback(() => {
    if (iRef.current + 1 >= stories.length) {
      onClose();
      return;
    }
    irPara(iRef.current + 1);
  }, [stories.length, onClose, irPara]);

  const voltar = React.useCallback(() => {
    irPara(Math.max(0, iRef.current - 1));
  }, [irPara]);

  // O relógio do story. Para enquanto estiver segurando.
  React.useEffect(() => {
    if (pausado) return;
    const id = window.setInterval(() => {
      progRef.current += TICK_MS / DURACAO_MS;
      if (progRef.current >= 1) {
        avancar();
        return;
      }
      setProgresso(progRef.current);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [pausado, avancar]);

  // Teclado, e a página parada atrás da tela cheia.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") avancar();
      if (e.key === "ArrowLeft") voltar();
      if (e.key === " ") {
        e.preventDefault();
        setPausado((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = antes;
    };
  }, [avancar, voltar, onClose]);

  if (!atual) return null;

  function pressionar(e: React.PointerEvent) {
    toqueIniciado.current = { t: Date.now(), y: e.clientY };
    setPausado(true);
  }

  function soltar(e: React.PointerEvent) {
    const inicio = toqueIniciado.current;
    toqueIniciado.current = null;
    setPausado(false);
    if (!inicio) return;

    // Arrastou para baixo: fecha, como no Instagram.
    if (e.clientY - inicio.y > 80) {
      onClose();
      return;
    }
    // Segurou: era pausa, não toque.
    if (Date.now() - inicio.t > 250) return;

    const alvo = e.currentTarget as HTMLElement;
    const x = e.clientX - alvo.getBoundingClientRect().left;
    if (x < alvo.clientWidth * 0.3) voltar();
    else avancar();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`Stories de @${username}`}
    >
      <div className="relative h-full w-full max-w-[26rem] sm:h-[92vh] sm:rounded-3xl sm:overflow-hidden">
        {/* As barrinhas: uma por story, a do meio enchendo. */}
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3">
          {stories.map((s, n) => (
            <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <span
                className="block h-full rounded-full bg-white"
                style={{
                  width: n < i ? "100%" : n === i ? `${Math.min(100, progresso * 100)}%` : "0%",
                  transition: n === i ? "width 50ms linear" : undefined,
                }}
              />
            </span>
          ))}
        </div>

        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2.5 px-3 pb-3 pt-6">
          <Avatar src={avatarUrl ?? null} name={username} size={32} />
          <span className="text-sm font-bold text-white">@{username}</span>
          <span className="text-xs text-white/70">{quando(atual.takenAt)}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="ml-auto rounded-full p-1.5 text-white/90 transition hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* A imagem e as zonas de toque. */}
        <div
          className="h-full w-full touch-none select-none bg-neutral-900"
          onPointerDown={pressionar}
          onPointerUp={soltar}
          onPointerCancel={() => {
            toqueIniciado.current = null;
            setPausado(false);
          }}
        >
          {atual.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={atual.imageUrl}
              alt=""
              draggable={false}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/40">
              Sem imagem guardada.
            </div>
          )}
        </div>

        {/* Setas para quem está no mouse — no celular basta tocar dos lados. */}
        <button
          type="button"
          onClick={voltar}
          aria-label="Story anterior"
          disabled={i === 0}
          className="absolute left-1 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:opacity-0 sm:block"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={avancar}
          aria-label="Próximo story"
          className="absolute right-1 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:block"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 space-y-1.5 bg-gradient-to-t from-black/70 to-transparent px-4 pb-5 pt-10">
          {atual.kind === "video" && (
            <p className="flex items-center gap-1.5 text-[11px] text-white/80">
              <Play className="h-3 w-3" /> Vídeo — mostramos a capa.
            </p>
          )}
          {atual.expirou && (
            <p className="flex items-center gap-1.5 text-[11px] text-white/80">
              <Clock className="h-3 w-3" /> Já expirou no Instagram.
            </p>
          )}
          {atual.mentions.length > 0 && (
            <p className="truncate text-xs text-white">
              <AtSign className="mr-0.5 inline h-3 w-3" />
              {atual.mentions.join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Os stories de um perfil, abertos direto pela foto — como no Instagram.
 *
 * Só pede os stories ao provedor **quando a foto é tocada**: abrir um perfil
 * continua custando o mesmo de antes. A resposta é a mesma do Raio-X, então se
 * a seção já foi aberta nesta visita, nada é pedido de novo.
 */
export function ProfileStories({
  username,
  avatarUrl,
  onClose,
}: {
  username: string;
  avatarUrl?: string | null;
  onClose: () => void;
}) {
  const [estado, setEstado] = React.useState<
    | { kind: "loading" }
    | { kind: "ok"; items: ViewerStory[] }
    | { kind: "aviso"; texto: string }
  >({ kind: "loading" });

  React.useEffect(() => {
    let vivo = true;
    fetch(`/api/raio-x?username=${encodeURIComponent(username)}&section=stories`)
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!vivo) return;
        if (r.status === 402) return setEstado({ kind: "aviso", texto: "Seu limite de perfis deste plano acabou." });
        if (b.status === "locked")
          return setEstado({ kind: "aviso", texto: "Os stories abrem com o desbloqueio deste perfil." });
        if (b.status === "private")
          return setEstado({ kind: "aviso", texto: "Este perfil é privado — não dá para ver os stories." });
        const items: ViewerStory[] = (b?.data?.items ?? []).map((s: any) => ({
          id: String(s.id),
          imageUrl: s.thumbnailUrl
            ? /(?:\.fbcdn\.net|\.cdninstagram\.com)/i.test(s.thumbnailUrl)
              ? `/api/img?url=${encodeURIComponent(s.thumbnailUrl)}`
              : s.thumbnailUrl
            : null,
          takenAt: s.takenAt ?? null,
          kind: s.kind,
          mentions: (s.mentions ?? []).map((m: any) => m.username),
        }));
        if (!items.length) return setEstado({ kind: "aviso", texto: "Nenhum story nas últimas 24 horas." });
        setEstado({ kind: "ok", items });
      })
      .catch(() => vivo && setEstado({ kind: "aviso", texto: "Não conseguimos carregar os stories agora." }));
    return () => {
      vivo = false;
    };
  }, [username]);

  if (estado.kind === "ok")
    return (
      <StoryViewer
        username={username}
        avatarUrl={avatarUrl}
        stories={estado.items}
        onClose={onClose}
      />
    );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-6 text-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {estado.kind === "loading" ? (
        <p className="text-sm text-white/70">Abrindo os stories de @{username}…</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-white">{estado.texto}</p>
          <button type="button" className="rounded-full bg-white/15 px-5 py-2 text-sm font-bold text-white">
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
