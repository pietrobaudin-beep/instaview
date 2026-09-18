"use client";

import * as React from "react";
import { PawPrint } from "lucide-react";
import { Mascot, POSES, type Pose } from "@/components/ui/mascot";

/**
 * The loading screen's little story: Faro actually searching. He runs (leaving
 * paw prints), stops to sniff the ground, checks with the magnifier, turns
 * round, perks up at a clue, wonders — and, when the analysis is done, shows
 * up with the bone in his mouth.
 *
 * There is depth, too: he comes up close to the camera (bigger, lower) and
 * wanders back into the distance (smaller, higher). The finale brings the bone
 * right up front, as if handing it over.
 *
 * Deliberately gentle: one small gesture per pose, soft swaps, no bouncing
 * around for the sake of it.
 */

type Move = "run" | "sniff" | "scan" | "perk" | "tilt";

interface Beat {
  pose: Pose;
  move: Move;
  ms: number;
  /** For runs: where to go (0–1 across the stage) and which way he faces. */
  to?: number;
  dir?: 1 | -1;
  /** For runs: depth to end at — 0 = far away, 1 = right up to the camera. */
  z?: number;
}

const BEATS: Beat[] = [
  { pose: "correndo", move: "run", to: 0.72, dir: 1, z: 0.5, ms: 1500 },
  { pose: "cheirando", move: "sniff", ms: 1800 },
  { pose: "lupa", move: "scan", ms: 1600 },
  // Turns and comes right up to the camera…
  { pose: "correndo", move: "run", to: 0.46, dir: -1, z: 1, ms: 1500 },
  { pose: "alerta", move: "perk", ms: 1100 },
  { pose: "duvida", move: "tilt", ms: 1400 },
  // …then heads back into the distance.
  { pose: "correndo", move: "run", to: 0.3, dir: -1, z: 0, ms: 1500 },
  { pose: "cheirando", move: "sniff", ms: 1600 },
  { pose: "correndo", move: "run", to: 0.56, dir: 1, z: 0.5, ms: 1200 },
];

const START_X = 0.26;
const START_Z = 0.5;
const SPRITE_H = 76; // px, at mid depth

// Depth → how big and how high on screen. Far is small and up the "floor";
// near is big and down at the front.
const FAR = { scale: 0.62, bottom: 44 };
const NEAR = { scale: 1.3, bottom: 4 };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const depthScale = (z: number) => lerp(FAR.scale, NEAR.scale, z);
const depthBottom = (z: number) => lerp(FAR.bottom, NEAR.bottom, z);

// Poses that must never be mirrored (the "?" would read backwards).
const NO_FLIP: Pose[] = ["duvida"];

interface Trail {
  id: number;
  from: number;
  to: number;
  zFrom: number;
  zTo: number;
  ms: number;
  dir: 1 | -1;
}

export function LoadingScene({ done }: { done: boolean }) {
  const [i, setI] = React.useState(-1); // -1 = standing at the start
  const [x, setX] = React.useState(START_X);
  const [z, setZ] = React.useState(START_Z);
  const zRef = React.useRef(START_Z);
  const [dir, setDir] = React.useState<1 | -1>(1);
  const [runMs, setRunMs] = React.useState(0);
  const [trail, setTrail] = React.useState<Trail | null>(null);
  const [reduced, setReduced] = React.useState(false);
  const xRef = React.useRef(START_X);

  React.useEffect(() => {
    setReduced(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Play the beats in a loop until the analysis is done.
  React.useEffect(() => {
    if (done || reduced) return;
    let alive = true;
    let timer: number;
    let n = 0;
    let trailId = 0;

    const play = () => {
      if (!alive) return;
      const idx = n % BEATS.length;
      const b = BEATS[idx];
      setI(idx);
      if (b.move === "run" && b.to !== undefined) {
        const from = xRef.current;
        const zFrom = zRef.current;
        const zTo = b.z ?? zFrom;
        setDir(b.dir ?? 1);
        setRunMs(b.ms);
        setTrail({ id: ++trailId, from, to: b.to, zFrom, zTo, ms: b.ms, dir: b.dir ?? 1 });
        setX(b.to);
        setZ(zTo);
        xRef.current = b.to;
        zRef.current = zTo;
      } else {
        setRunMs(0);
      }
      n++;
      timer = window.setTimeout(play, b.ms);
    };

    timer = window.setTimeout(play, 350);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [done, reduced]);

  // Found it: come to the front, in the middle, with the bone.
  React.useEffect(() => {
    if (!done) return;
    setRunMs(550);
    setX(0.5);
    setZ(0.9);
    xRef.current = 0.5;
    zRef.current = 0.9;
    setDir(1);
  }, [done]);

  const beat = i >= 0 ? BEATS[i] : null;
  const pose: Pose = done ? "osso" : reduced ? "lupa" : beat?.pose ?? "sentado";
  const move = done ? "found" : reduced ? "" : beat?.move ?? "";
  const facing = NO_FLIP.includes(pose) ? 1 : dir;

  return (
    <div className="relative mx-auto h-[148px] w-full max-w-[340px]" aria-hidden>
      {/* Paw prints left behind on each run, fading as they go. */}
      {trail && !done && (
        <div key={trail.id} className="absolute inset-0">
          {Array.from({
            length: Math.max(
              4,
              Math.round(Math.hypot(trail.to - trail.from, (trail.zTo - trail.zFrom) * 0.5) * 12),
            ),
          }).map((_, k, arr) => {
            const t = (k + 0.5) / arr.length;
            const px = lerp(trail.from, trail.to, t);
            const pz = lerp(trail.zFrom, trail.zTo, t);
            const size = 14 * depthScale(pz);
            return (
              <PawPrint
                key={k}
                className="scene-paw absolute text-ink"
                style={{
                  left: `${px * 100}%`,
                  bottom: depthBottom(pz) - 8 + (k % 2 ? 5 * depthScale(pz) : 0),
                  width: size,
                  height: size,
                  transform: `translateX(-50%) rotate(${trail.dir === 1 ? 90 : -90}deg)`,
                  animationDelay: `${Math.round(t * trail.ms)}ms`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Faro, anchored to the ground, sliding along x on runs. */}
      <div
        className="scene-sprite absolute"
        style={{
          left: `${x * 100}%`,
          bottom: depthBottom(z),
          height: SPRITE_H,
          transform: `translateX(-50%) scale(${depthScale(z)})`,
          transformOrigin: "50% 100%",
          // Closer = in front of the paw prints and anything further back.
          zIndex: Math.round(z * 10) + 1,
          transition: runMs
            ? ["left", "bottom", "transform"]
                .map((p) => `${p} ${runMs}ms cubic-bezier(0.45, 0.05, 0.4, 1)`)
                .join(", ")
            : "none",
        }}
      >
        {/* soft shadow under him */}
        <span className="absolute -bottom-1 left-1/2 h-2 w-3/4 -translate-x-1/2 rounded-full bg-ink/15 blur-[2px]" />
        {/* turning: the flip is animated, so he visibly turns round */}
        <div
          className="h-full"
          style={{ transform: `scaleX(${facing})`, transition: "transform 240ms ease-in-out" }}
        >
          {/* Two layers: the swap "pop" and the pose's own gesture are separate
              animations, and on one element the second would cancel the first. */}
          <div key={pose} className="scene-pop h-full">
            <div className={`h-full ${move ? `scene-${move}` : ""}`}>
              <Mascot pose={pose} className="h-full text-ink" decorative />
            </div>
          </div>
        </div>
        {done && (
          <span className="faro-burst" aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
    </div>
  );
}

/** Widest pose, so callers can size around the scene if they need to. */
export const SCENE_SPRITE_WIDTH = SPRITE_H * POSES.correndo.ratio;
