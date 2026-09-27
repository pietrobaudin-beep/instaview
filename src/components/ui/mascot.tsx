"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * FarejAI's poses, served straight from the brand files in /public/mascote.
 *
 * The definitive poses (`cor: true`) are full-colour and render as images.
 * The older one-colour ones are used as a CSS mask over `currentColor`, so:
 *  - the SVG file is the single source of truth — its paths are never copied
 *    into code, where a transcription slip would distort the drawing;
 *  - the mascot still takes the ink of whatever surface it sits on.
 * To update a pose, replace the file; nothing here changes.
 */
export const POSES = {
  // Poses definitivas (26/09): coloridas, entram como imagem com as cores do desenho.
  sentado: { src: "/mascote/poses/faro-normal.svg", ratio: 702.65 / 699.94, label: "Faro sentado", cor: true },
  lupa: { src: "/mascote/poses/faro-investigando.svg", ratio: 787.79 / 788.7, label: "Faro com a lupa", cor: true },
  feliz: { src: "/mascote/poses/faro-feliz.svg", ratio: 673.43 / 933.51, label: "Faro feliz", cor: true },
  dormindo: { src: "/mascote/poses/faro-dormindo.svg", ratio: 926.38 / 770.8, label: "Faro dormindo", cor: true },
  correndo: { src: "/mascote/poses/faro-correndo.svg", ratio: 906.09 / 778.64, label: "Faro correndo", cor: true },
  cheirando: { src: "/mascote/poses/faro-cavando.svg", ratio: 957.06 / 829.54, label: "Faro cavando", cor: true },
  alerta: { src: "/mascote/poses/faro-investigando-de-perto.svg", ratio: 748.09 / 786.74, label: "Faro de binóculo", cor: true },
  osso: { src: "/mascote/poses/faro-dando-a-patinha.svg", ratio: 708.36 / 880.06, label: "Faro dando a patinha", cor: true },
  duvida: { src: "/mascote/poses/faro-triste.svg", ratio: 747.16 / 733.97, label: "Faro triste", cor: true },
  pensando: { src: "/mascote/poses/faro-investigando-a-fundo.svg", ratio: 817.82 / 726.06, label: "Faro investigando a fundo", cor: true },
  entediado: { src: "/mascote/poses/faro-entediado.svg", ratio: 973.22 / 618.56, label: "Faro entediado", cor: true },
  detetive: { src: "/mascote/poses/faro-detetive.svg", ratio: 758.23 / 821.25, label: "Faro detetive", cor: true },
  carinho: { src: "/mascote/poses/faro-querendo-carinho.svg", ratio: 765.71 / 724.26, label: "Faro querendo carinho", cor: true },
  debochado: { src: "/mascote/poses/faro-debochado.svg", ratio: 714.72 / 779, label: "Faro debochado", cor: true },
  // Sem versão nova: continuam as antigas, de uma cor (máscara).
  /** Front-facing, paws over a top edge. */
  espiando: { src: "/mascote/espiando.svg", ratio: 197.28 / 102, label: "Faro espiando", cor: false },
  /** Peeking out from behind something on its left. */
  lateral: { src: "/mascote/lateral.svg", ratio: 132.05 / 164.35, label: "Faro espiando de lado", cor: false },
} as const;

export type Pose = keyof typeof POSES;
export type Acao = "andar" | "cavar";

export function Mascot({
  pose,
  className = "h-24",
  bob = false,
  decorative = false,
  acao,
}: {
  pose: Pose;
  className?: string;
  /** Movimento de corpo inteiro: patas andando ou cavando (só nas poses coloridas). */
  acao?: Acao;
  /**
   * Idle motion, so the mascot feels alive: a small bounce — or, for the
   * sleeping pose, a slow breath instead.
   */
  bob?: boolean;
  /** Hide from screen readers when the text next to it already says it all. */
  decorative?: boolean;
}) {
  const p = POSES[pose];
  if (p.cor) {
    return <FaroVivo pose={pose} className={className} vivo={bob} decorative={decorative} acao={acao} />;
  }
  const mask = `url(${p.src}) center / contain no-repeat`;
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : p.label}
      aria-hidden={decorative || undefined}
      className={cn(
        "inline-block shrink-0 bg-current",
        bob && (pose === "dormindo" ? "mascot-breathe" : "mascot-bob"),
        className,
      )}
      style={{ aspectRatio: String(p.ratio), WebkitMask: mask, mask }}
    />
  );
}

/**
 * One pose turning into another with a quiet crossfade. The motion is kept
 * deliberately small so it reads as feedback, not decoration.
 *
 * - Controlled: pass `active` (e.g. "the user is typing") and it swaps on change.
 * - `loop`: alternates on its own, for showcase spots such as onboarding.
 */
export function FaroSwap({
  from = "sentado",
  to = "lupa",
  active,
  loop = false,
  interval = 2400,
  className = "h-28",
}: {
  from?: Pose;
  to?: Pose;
  active?: boolean;
  loop?: boolean;
  interval?: number;
  className?: string;
}) {
  const [auto, setAuto] = React.useState(false);
  const on = loop ? auto : !!active;
  React.useEffect(() => {
    if (!loop) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => setAuto((v) => !v), interval);
    return () => clearInterval(id);
  }, [loop, interval]);

  return (
    <span className={cn("relative inline-grid place-items-center", className)} aria-live="off">
      <span className={cn("faro-layer", on ? "faro-out" : "faro-in")}>
        <Mascot pose={from} className="h-full" bob={!on} decorative={on} />
      </span>
      <span className={cn("faro-layer", on ? "faro-in" : "faro-out")}>
        <Mascot pose={to} className="h-full" bob={on} decorative={!on} />
      </span>
    </span>
  );
}

/** O jeito de cada pose se mexer quando está parada na tela. */
const JEITO: Partial<Record<Pose, string>> = {
  sentado: "respira",
  carinho: "respira",
  detetive: "respira",
  feliz: "pula",
  dormindo: "dorme",
  correndo: "galopa",
  cheirando: "cava",
  lupa: "procura",
  pensando: "procura",
  alerta: "procura",
  osso: "acena",
  duvida: "murcha",
  entediado: "suspira",
  debochado: "empina",
};

/**
 * O Faro colorido com volume: sombra no chão, luz e sombreado aplicados POR
 * CIMA do desenho (a mesma arte serve de máscara — nada é redesenhado), um
 * jeito próprio de se mexer por pose, inclinação 3D seguindo o ponteiro e um
 * "boop" quando alguém toca nele. Quem pede menos movimento vê tudo parado.
 */
/** Onde as patas começam, de cima para baixo (0–100% da altura do desenho). */
const PATAS: Partial<Record<Pose, number>> = { correndo: 66, cheirando: 70 };

function FaroVivo({
  pose,
  className,
  vivo,
  decorative,
  acao: pedida,
}: {
  pose: Pose;
  className?: string;
  vivo: boolean;
  decorative: boolean;
  acao?: Acao;
}) {
  // Parado na tela, o correndo anda e o cavando cava; numa cena, quem manda é ela.
  const acao: Acao | undefined =
    pedida ?? (vivo ? (pose === "correndo" ? "andar" : pose === "cheirando" ? "cavar" : undefined) : undefined);
  const corte = PATAS[pose] ?? 68;
  const p = POSES[pose];
  const ref = React.useRef<HTMLSpanElement>(null);
  const corpo = React.useRef<HTMLSpanElement>(null);
  const mask = `url(${p.src}) center / contain no-repeat`;

  const calmo = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const inclinar = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || calmo()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${(x * 22).toFixed(1)}deg`);
    el.style.setProperty("--rx", `${(-y * 16).toFixed(1)}deg`);
  };
  const soltar = () => {
    ref.current?.style.setProperty("--ry", "0deg");
    ref.current?.style.setProperty("--rx", "0deg");
  };
  const boop = () => {
    if (calmo()) return;
    corpo.current?.animate(
      [
        { transform: "scale(1,1)" },
        { transform: "translateY(2px) scale(1.08,0.9)" },
        { transform: "translateY(-10px) scale(0.95,1.07) rotate(-3deg)" },
        { transform: "translateY(0) scale(1.03,0.97)" },
        { transform: "scale(1,1)" },
      ],
      { duration: 520, easing: "cubic-bezier(.3,.7,.4,1)" },
    );
  };

  return (
    <span
      ref={ref}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : p.label}
      aria-hidden={decorative || undefined}
      onPointerMove={inclinar}
      onPointerLeave={soltar}
      onPointerDown={boop}
      className={cn("faro3d relative inline-block shrink-0 select-none", vivo && "faro3d-entra", className)}
      style={{ aspectRatio: String(p.ratio) }}
    >
      <span className={cn("faro3d-chao", vivo && `faro3d-chao--${JEITO[pose] ?? "respira"}`)} aria-hidden />
      <span className="faro3d-giro" aria-hidden>
        <span
          ref={corpo}
          className={cn(
            "faro3d-corpo",
            acao ? `faro3d-acao--${acao}` : vivo && `faro3d--${JEITO[pose] ?? "respira"}`,
          )}
        >
          {acao ? (
            <>
              {/* O mesmo desenho duas vezes: em cima o corpo, embaixo as patas,
                  que balançam presas na linha do corte — parece passo. */}
              <span className="faro3d-parte" style={{ clipPath: `inset(0 0 ${100 - corte - 0.5}% 0)` }}>
                <Arte src={p.src} mask={mask} />
              </span>
              <span
                className={`faro3d-parte faro3d-patas--${acao}`}
                style={{ clipPath: `inset(${corte}% 0 0 0)`, transformOrigin: `50% ${corte}%` }}
              >
                <Arte src={p.src} mask={mask} />
              </span>
              {acao === "cavar" && (
                <span className="faro3d-terra" aria-hidden>
                  <i /><i /><i /><i /><i /><i />
                </span>
              )}
            </>
          ) : (
            <Arte src={p.src} mask={mask} />
          )}
        </span>
      </span>
    </span>
  );
}

function Arte({ src, mask }: { src: string; mask: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} className="faro3d-img" />
      <span className="faro3d-luz" style={{ WebkitMask: mask, mask }} />
    </>
  );
}
