"use client";

import * as React from "react";
import { Mascot, type Pose } from "@/components/ui/mascot";
import { cn } from "@/lib/utils";

/**
 * A quiet idle moment for Faro on an edge (the home header or search field).
 * Earlier versions used a whole mini-story here; it competed with the form and
 * made the character feel jittery. A few slow poses are easier to notice and
 * keep the interface calm.
 *
 * Reuses the loading scene's gestures (scene-* classes), so both places move
 * the same way. Decorative: hidden from screen readers, and with reduced
 * motion he simply sits there.
 */

type Move = "run" | "sniff" | "scan" | "perk" | "tilt" | "found" | "bob" | "breathe";

interface Beat {
  pose: Pose;
  move: Move;
  ms: number;
}

const BEATS: Beat[] = [
  { pose: "sentado", move: "bob", ms: 4200 },
  { pose: "cheirando", move: "sniff", ms: 2400 },
  { pose: "lupa", move: "scan", ms: 2800 },
  { pose: "feliz", move: "bob", ms: 3600 },
];

const START_X = 0.5;
const SIZE = 44; // px, default sprite height
// "?" would read backwards if mirrored.
const NO_FLIP: Pose[] = ["duvida"];
const GESTURE: Record<Move, string> = {
  run: "scene-run",
  sniff: "scene-sniff",
  scan: "scene-scan",
  perk: "scene-perk",
  tilt: "scene-tilt",
  found: "scene-found",
  bob: "mascot-bob",
  breathe: "mascot-breathe",
};

export function HeaderStroll({
  ground = true,
  size = SIZE,
  className = "relative h-16",
}: {
  /** Sprite height in px. */
  size?: number;
  /** Draw the dashed "floor" line. Off when he walks on something else, like the search field. */
  ground?: boolean;
  /** Lane box: its bottom edge is the floor he walks on. */
  className?: string;
} = {}) {
  const [i, setI] = React.useState(-1);
  const dir = 1;
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    setReduced(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  React.useEffect(() => {
    if (reduced) return;
    let alive = true;
    let timer: number;
    let n = 0;
    const play = () => {
      if (!alive) return;
      const idx = n % BEATS.length;
      const b = BEATS[idx];
      setI(idx);
      n++;
      timer = window.setTimeout(play, b.ms);
    };

    timer = window.setTimeout(play, 900);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [reduced]);

  const beat = i >= 0 ? BEATS[i] : null;
  const pose: Pose = beat?.pose ?? "sentado";
  const gesture =
    reduced ? "" : beat ? GESTURE[beat.move] : "mascot-bob";
  const facing = NO_FLIP.includes(pose) ? 1 : dir;

  return (
    <div
      className={cn("pointer-events-none", className, ground && "border-b border-dashed border-ink/15")}
      aria-hidden
    >
      {/* Faro stays centered above the form, with just one small gesture at a time. */}
      <span
        className="pointer-events-none absolute bottom-1"
        style={{
          left: `${START_X * 100}%`,
          height: size,
          transform: "translateX(-50%)",
        }}
      >
        <span className="absolute -bottom-0.5 left-1/2 h-1.5 w-3/4 -translate-x-1/2 rounded-full bg-ink/15 blur-[2px]" />
        <div
          className="h-full"
          style={{ transform: `scaleX(${facing})`, transition: "transform 240ms ease-in-out" }}
        >
          <div key={pose} className="scene-pop h-full">
            <div className={`h-full ${gesture}`}>
              <Mascot pose={pose} className="h-full text-ink" decorative />
            </div>
          </div>
        </div>
      </span>
    </div>
  );
}
