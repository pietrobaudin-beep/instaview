"use client";

import * as React from "react";
import { Bone, Heart, PawPrint } from "lucide-react";
import { Mascot, type Pose } from "@/components/ui/mascot";
import { cn } from "@/lib/utils";

/**
 * Faro out for a stroll along an edge (the home header, the landing's search
 * field): he runs, sniffs, spots a bone, goes after it, trots off with it, sits, falls asleep,
 * wakes up puzzled, checks around with the magnifier and heads back — then it
 * starts over. Clicking him gets a happy hop and a couple of hearts.
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
  /** For runs: where to go, 0–1 along the lane. */
  to?: number;
  /** The bone in the lane: appears, or gets picked up. */
  bone?: "show" | "take";
}

const BONE_X = 0.7;

const BEATS: Beat[] = [
  { pose: "correndo", move: "run", to: 0.34, ms: 1700 },
  { pose: "cheirando", move: "sniff", ms: 1800 },
  { pose: "alerta", move: "perk", ms: 1000, bone: "show" },
  { pose: "correndo", move: "run", to: BONE_X - 0.03, ms: 1300 },
  { pose: "osso", move: "found", ms: 1400, bone: "take" },
  // Trots off proudly with the bone.
  { pose: "osso", move: "run", to: 0.9, ms: 1500 },
  { pose: "sentado", move: "bob", ms: 1800 },
  { pose: "dormindo", move: "breathe", ms: 5200 },
  { pose: "alerta", move: "perk", ms: 900 },
  { pose: "duvida", move: "tilt", ms: 1500 },
  { pose: "lupa", move: "scan", ms: 2200 },
  { pose: "correndo", move: "run", to: 0.1, ms: 2600 },
  { pose: "feliz", move: "bob", ms: 2200 },
];

const START_X = 0.1;
const SIZE = 44; // px, default sprite height
// "?" would read backwards if mirrored.
const NO_FLIP: Pose[] = ["duvida"];

// Room kept free at each end, so the widest pose (running) never spills out.
const padFor = (size: number) => size + 4;
const laneAt = (pad: number) => (x: number) => `calc(${pad}px + ${x} * (100% - ${pad * 2}px))`;
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

interface Trail {
  id: number;
  from: number;
  to: number;
  ms: number;
}

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
  const [x, setX] = React.useState(START_X);
  const xRef = React.useRef(START_X);
  const [dir, setDir] = React.useState<1 | -1>(1);
  const [runMs, setRunMs] = React.useState(0);
  const [trail, setTrail] = React.useState<Trail | null>(null);
  const [bone, setBone] = React.useState(false);
  const [pet, setPet] = React.useState(0);
  const [petting, setPetting] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    setReduced(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  React.useEffect(() => {
    if (reduced) return;
    let alive = true;
    let timer: number;
    let n = 0;
    let trailId = 0;

    const play = () => {
      if (!alive) return;
      const idx = n % BEATS.length;
      const b = BEATS[idx];
      setI(idx);
      if (b.bone === "show") setBone(true);
      if (b.bone === "take") setBone(false);
      if (b.move === "run" && b.to !== undefined) {
        const from = xRef.current;
        setDir(b.to >= from ? 1 : -1);
        setRunMs(b.ms);
        setTrail({ id: ++trailId, from, to: b.to, ms: b.ms });
        setX(b.to);
        xRef.current = b.to;
      } else {
        setRunMs(0);
      }
      n++;
      timer = window.setTimeout(play, b.ms);
    };

    timer = window.setTimeout(play, 900);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [reduced]);

  // A pat on the head: a happy hop for a moment, then back to the stroll.
  React.useEffect(() => {
    if (!pet) return;
    setPetting(true);
    const t = window.setTimeout(() => setPetting(false), 1400);
    return () => window.clearTimeout(t);
  }, [pet]);

  const laneLeft = laneAt(padFor(size));
  const beat = i >= 0 ? BEATS[i] : null;
  const running = beat?.move === "run";
  const pose: Pose = petting && !running ? "feliz" : beat?.pose ?? "sentado";
  const gesture =
    reduced ? "" : petting && !running ? "scene-perk" : beat ? GESTURE[beat.move] : "mascot-bob";
  const facing = NO_FLIP.includes(pose) ? 1 : dir;

  return (
    <div
      className={cn("pointer-events-none", className, ground && "border-b border-dashed border-ink/15")}
      aria-hidden
    >
      {/* Paw prints left behind on each run. */}
      {trail && (
        <div key={trail.id} className="absolute inset-0">
          {Array.from({ length: Math.max(4, Math.round(Math.abs(trail.to - trail.from) * 14)) }).map(
            (_, k, arr) => {
              const t = (k + 0.5) / arr.length;
              return (
                <PawPrint
                  key={k}
                  className="scene-paw absolute h-3 w-3 text-ink"
                  style={{
                    left: laneLeft(trail.from + (trail.to - trail.from) * t),
                    bottom: 2 + (k % 2 ? 5 : 0),
                    transform: `translateX(-50%) rotate(${trail.to >= trail.from ? 90 : -90}deg)`,
                    animationDelay: `${Math.round(t * trail.ms)}ms`,
                  }}
                />
              );
            },
          )}
        </div>
      )}

      {/* The bone, waiting in the lane. */}
      {bone && (
        <span className="absolute bottom-1" style={{ left: laneLeft(BONE_X), transform: "translateX(-50%)" }}>
          <span className="scene-pop block">
            <Bone className="stroll-bone h-5 w-5 text-vinho" strokeWidth={2.4} />
          </span>
        </span>
      )}

      {/* Faro. Only he takes clicks; the lane lets them through. */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setPet((n) => n + 1)}
        className="pointer-events-auto absolute bottom-1 cursor-pointer"
        style={{
          left: laneLeft(x),
          height: size,
          transform: "translateX(-50%)",
          transition: runMs ? `left ${runMs}ms cubic-bezier(0.45, 0.05, 0.4, 1)` : "none",
        }}
      >
        <span className="absolute -bottom-0.5 left-1/2 h-1.5 w-3/4 -translate-x-1/2 rounded-full bg-ink/15 blur-[2px]" />
        <div
          className="h-full"
          style={{ transform: `scaleX(${facing})`, transition: "transform 240ms ease-in-out" }}
        >
          <div key={`${pose}-${petting ? pet : ""}`} className="scene-pop h-full">
            <div className={`h-full ${gesture}`}>
              <Mascot pose={pose} className="h-full text-ink" decorative />
            </div>
          </div>
        </div>
        {petting && (
          <span key={pet} className="pointer-events-none absolute inset-0">
            <span className="faro-burst">
              <i />
              <i />
              <i />
              <i />
            </span>
            <Heart className="stroll-heart absolute -top-2 left-1/2 h-4 w-4 fill-pink text-pink" />
            <Heart
              className="stroll-heart absolute -top-1 left-[70%] h-3 w-3 fill-accent text-accent"
              style={{ animationDelay: "180ms" }}
            />
          </span>
        )}
      </button>
    </div>
  );
}
