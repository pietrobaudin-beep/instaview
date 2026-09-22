"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, Pause as PauseIcon, Play, Search, X } from "lucide-react";
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
  // Duas pausas diferentes: a do botão (fica) e a do dedo segurando (passa).
  // Sem separar, tocar na tela depois de pausar no botão despausava sozinho.
  const [pausadoNoBotao, setPausadoNoBotao] = React.useState(false);
  const [segurando, setSegurando] = React.useState(false);
  const pausado = pausadoNoBotao || segurando;
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
  /** Quanto falta deste story, em ms. Guardado ao pausar. */
  const restanteRef = React.useRef(DURACAO_MS);

  const irPara = React.useCallback((n: number) => {
    iRef.current = n;
    restanteRef.current = DURACAO_MS;
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

  /**
   * O relógio do story, por **relógio de parede**, não por contagem de tiques.
   *
   * Somar 50ms a cada volta parecia dar 5s e dava 4,3s: o navegador não entrega
   * a volta exatamente no tempo pedido, e qualquer tique a mais ou a menos ia
   * direto para a conta. Aqui o fim é uma hora marcada; a volta só desenha.
   */
  React.useEffect(() => {
    if (pausado) return;
    const fim = Date.now() + restanteRef.current;
    const id = window.setInterval(() => {
      const falta = fim - Date.now();
      restanteRef.current = Math.max(0, falta);
      if (falta <= 0) {
        restanteRef.current = DURACAO_MS;
        avancar();
        return;
      }
      setProgresso(1 - falta / DURACAO_MS);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [pausado, avancar, i]);

  // Teclado, e a página parada atrás da tela cheia.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") avancar();
      if (e.key === "ArrowLeft") voltar();
      if (e.key === " ") {
        e.preventDefault();
        setPausadoNoBotao((p) => !p);
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
    setSegurando(true);
  }

  function soltar(e: React.PointerEvent) {
    const inicio = toqueIniciado.current;
    toqueIniciado.current = null;
    setSegurando(false);
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
      className="fixed inset-0 z-[100] flex items-center justify-center gap-1.5 bg-black/95 sm:gap-3"
      role="dialog"
      aria-modal="true"
      aria-label={`Stories de @${username}`}
    >
      {/* As setas ficam **fora** do story, nas bordas da tela: dentro dele
          tapavam a imagem. No computador sobram nas laterais pretas; no
          celular ficam rentes à borda, e tocar nos lados continua valendo. */}
      <button
        type="button"
        onClick={voltar}
        aria-label="Story anterior"
        disabled={i === 0}
        className="z-30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 disabled:opacity-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* O quadro deixa uma faixa livre dos dois lados, que é onde as setas
          ficam — dentro dele elas tapavam a imagem. No computador vira o
          retângulo 9:16, como o Instagram na web. */}
      <div className="relative h-[94dvh] min-w-0 flex-1 overflow-hidden rounded-3xl bg-neutral-900 sm:h-[92dvh] sm:aspect-[9/16] sm:w-auto sm:max-w-[26rem] sm:flex-none">
        {/* As barrinhas: uma por story, a do meio enchendo. */}
        <div
          className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pb-2"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
        >
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

        <div
          className="absolute inset-x-0 top-0 z-20 flex items-center gap-2.5 px-3 pb-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)" }}
        >
          <Avatar src={avatarUrl ?? null} name={username} size={32} />
          <span className="truncate text-sm font-bold text-white">@{username}</span>
          <span className="shrink-0 text-xs text-white/70">{quando(atual.takenAt)}</span>

          {/* Pausar fica no cabeçalho, como no Instagram da web. */}
          <button
            type="button"
            onClick={() => setPausadoNoBotao((p) => !p)}
            aria-label={pausado ? "Continuar" : "Pausar"}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
          >
            {pausado ? <Play className="h-5 w-5" /> : <PauseIcon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* A imagem e as zonas de toque. */}
        <div
          className="absolute inset-0 touch-none select-none"
          onPointerDown={pressionar}
          onPointerUp={soltar}
          onPointerCancel={() => {
            toqueIniciado.current = null;
            setSegurando(false);
          }}
        >
          {atual.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={atual.imageUrl}
              alt=""
              draggable={false}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/40">
              Sem imagem guardada.
            </div>
          )}
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 space-y-1.5 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
        >
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
            /* Quem foi marcado no story vira um convite: "Farejar @fulano".
               Este pedaço recebe toque, ao contrário do resto do rodapé, que
               é só legenda. */
            <div className="pointer-events-auto flex flex-wrap gap-1.5">
              {atual.mentions.map((m) => (
                <Link
                  key={m}
                  href={`/p/${encodeURIComponent(m)}`}
                  className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-ink transition hover:bg-white"
                  title={`Farejar @${m}`}
                >
                  <Search className="h-3.5 w-3.5" />
                  Farejar @{m}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={avancar}
        aria-label="Próximo story"
        className="z-30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
