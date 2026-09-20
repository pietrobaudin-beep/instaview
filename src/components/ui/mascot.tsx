"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Faro's poses, served straight from the brand files in /public/mascote.
 *
 * The artwork is used as a CSS mask over `currentColor`, so:
 *  - the SVG file is the single source of truth — its paths are never copied
 *    into code, where a transcription slip would distort the drawing;
 *  - the mascot still takes the ink of whatever surface it sits on.
 * To update a pose, replace the file; nothing here changes.
 */
export const POSES = {
  sentado: { src: "/mascote/sentado.svg", ratio: 205.02 / 182.41, label: "Faro sentado" },
  lupa: { src: "/mascote/lupa.svg", ratio: 201.9 / 179.25, label: "Faro com a lupa" },
  feliz: { src: "/mascote/feliz.svg", ratio: 221.44 / 191.67, label: "Faro feliz" },
  dormindo: { src: "/mascote/dormindo.svg", ratio: 198.56 / 182.23, label: "Faro dormindo" },
  /** Front-facing, paws over a top edge. */
  espiando: { src: "/mascote/espiando.svg", ratio: 197.28 / 102, label: "Faro espiando" },
  /** Peeking out from behind something on its left. */
  lateral: { src: "/mascote/lateral.svg", ratio: 132.05 / 164.35, label: "Faro espiando de lado" },
  // The search story, for the loading scene. All face right.
  correndo: { src: "/mascote/correndo.svg", ratio: 279.24 / 163.94, label: "Faro correndo" },
  cheirando: { src: "/mascote/cheirando.svg", ratio: 239.4 / 176.83, label: "Faro farejando o chão" },
  alerta: { src: "/mascote/alerta.svg", ratio: 256.7 / 202.91, label: "Faro atento" },
  duvida: { src: "/mascote/duvida.svg", ratio: 174.38 / 222.82, label: "Faro em dúvida" },
  osso: { src: "/mascote/osso.svg", ratio: 206.79 / 141.53, label: "Faro com o osso" },
} as const;

export type Pose = keyof typeof POSES;

export function Mascot({
  pose,
  className = "h-24",
  bob = false,
  decorative = false,
}: {
  pose: Pose;
  className?: string;
  /**
   * Idle motion, so the mascot feels alive: a small bounce — or, for the
   * sleeping pose, a slow breath instead.
   */
  bob?: boolean;
  /** Hide from screen readers when the text next to it already says it all. */
  decorative?: boolean;
}) {
  const p = POSES[pose];
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
