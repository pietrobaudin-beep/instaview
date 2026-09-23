"use client";

import * as React from "react";
import { Mascot, POSES } from "@/components/ui/mascot";
import { cn } from "@/lib/utils";

/**
 * Faro AI playing peek-a-boo around a card: he pops up from behind its top edge,
 * ducks back down, and reappears somewhere else — from the side, in the side
 * pose, when there is room for it on screen.
 *
 * His paws hold ON to the card while the rest of him is behind it. To get
 * that, he is drawn IN FRONT of the card but inside a clipping window whose
 * inner edge sits a paw's depth over the card: the paws cross the edge, and
 * ducking down slides him out through the bottom of the window — behind the
 * lip of the card.
 */

type Spot =
  | { edge: "top"; at: number } // 0–1 along the width
  | { edge: "right" | "left"; at: number }; // 0–1 down the height

// Wide cards: around the top and out of both sides.
const SPOTS_WIDE: Spot[] = [
  { edge: "top", at: 0.5 },
  { edge: "top", at: 0.24 },
  { edge: "right", at: 0.5 },
  { edge: "top", at: 0.76 },
  { edge: "left", at: 0.5 },
  { edge: "top", at: 0.62 },
];

// Narrow (phone) cards have no room at the sides and a short top edge, so a
// simple, readable pattern: centre → left → centre → right.
const SPOTS_NARROW: Spot[] = [
  { edge: "top", at: 0.5 },
  { edge: "top", at: 0.15 },
  { edge: "top", at: 0.5 },
  { edge: "top", at: 0.85 },
];
const NARROW_BELOW = 560; // px of card width

const TOP_H = 56; // px — the front "espiando" pose
const TOP_W = TOP_H * POSES.espiando.ratio;
const SIDE_H = 96; // px — the "lateral" pose
const SIDE_W = SIDE_H * POSES.lateral.ratio;
// How far the paws reach over the card's edge.
const PAW_OVER_TOP = 13;
const PAW_OVER_SIDE = 14;
// Extra room on the outer side of the window, so the spring overshoot of the
// pop-up never clips the top of his head.
const HEADROOM = 14;
// The card's corner radius (rounded-3xl). Paws must land on the straight
// part of an edge — on a corner one paw would hang in the air.
const CORNER = 24;
const CORNER_MARGIN = 8;
const VISIBLE_MS = 3400;
const TRAVEL_MS = 450;

type Phase = "show" | "hide" | "move";

export function PeekingFaro({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [index, setIndex] = React.useState(0);
  const [cardW, setCardW] = React.useState(0);
  const spots = cardW && cardW < NARROW_BELOW ? SPOTS_NARROW : SPOTS_WIDE;
  // The cycle runs in a timer, so it reads the current list through a ref.
  const spotsRef = React.useRef(spots);
  spotsRef.current = spots;

  // Track the card's width: on a narrow (phone) card the usable straight edge
  // is short, so the top spots are squeezed into it.
  React.useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCardW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [phase, setPhase] = React.useState<Phase>("move");

  // Is there room beside the card for the side pose right now?
  const fits = React.useCallback((s: Spot) => {
    if (s.edge === "top") return true;
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return false;
    const room = s.edge === "right" ? window.innerWidth - r.right : r.left;
    return room >= SIDE_W + HEADROOM - PAW_OVER_SIDE + 12;
  }, []);

  React.useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // First appearance, once the profile has been found.
    const first = window.setTimeout(() => setPhase("show"), 500);
    if (reduce) return () => window.clearTimeout(first);

    let timer: number;
    const cycle = () => {
      setPhase("hide");
      timer = window.setTimeout(() => {
        // Jump to the next spot that fits, while out of sight.
        setIndex((i) => {
          const list = spotsRef.current;
          for (let step = 1; step <= list.length; step++) {
            const next = (i + step) % list.length;
            if (fits(list[next])) return next;
          }
          return 0;
        });
        setPhase("move");
        // Two frames: let the new position settle with no transition, then pop up.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setPhase("show");
            timer = window.setTimeout(cycle, VISIBLE_MS);
          }),
        );
      }, TRAVEL_MS);
    };
    timer = window.setTimeout(cycle, 500 + VISIBLE_MS);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(timer);
    };
  }, [fits]);

  const spot = spots[index % spots.length];
  const shown = phase === "show";

  // `win` is the clipping window (placed so its inner edge overlaps the card by
  // a paw); `sprite` slides inside it — out through that edge to hide.
  let win: React.CSSProperties;
  let place: React.CSSProperties; // where the sprite sits inside the window
  let sprite: string;
  let pose: "espiando" | "lateral";
  if (spot.edge === "top") {
    pose = "espiando";
    // Keep the whole of him over the straight part of the top edge.
    const lo = cardW ? (TOP_W / 2 + CORNER + CORNER_MARGIN) / cardW : 0.3;
    const at = lo >= 0.5 ? 0.5 : Math.min(Math.max(spot.at, lo), 1 - lo);
    win = {
      left: `${at * 100}%`,
      bottom: `calc(100% - ${PAW_OVER_TOP}px)`,
      width: TOP_W,
      height: TOP_H + HEADROOM,
      transform: "translateX(-50%)",
    };
    place = { left: 0, bottom: 0, width: TOP_W, height: TOP_H };
    sprite = `translateY(${shown ? "0" : "100%"})`;
  } else if (spot.edge === "right") {
    pose = "lateral";
    win = {
      left: `calc(100% - ${PAW_OVER_SIDE}px)`,
      top: `${spot.at * 100}%`,
      width: SIDE_W + HEADROOM,
      height: SIDE_H,
      transform: "translateY(-50%)",
    };
    place = { left: 0, top: 0, width: SIDE_W, height: SIDE_H };
    sprite = `translateX(${shown ? "0" : "-100%"})`;
  } else {
    pose = "lateral";
    // Mirrored so he peeks out to the left.
    win = {
      right: `calc(100% - ${PAW_OVER_SIDE}px)`,
      top: `${spot.at * 100}%`,
      width: SIDE_W + HEADROOM,
      height: SIDE_H,
      transform: "translateY(-50%)",
    };
    place = { right: 0, top: 0, width: SIDE_W, height: SIDE_H };
    sprite = `translateX(${shown ? "0" : "100%"}) scaleX(-1)`;
  }

  return (
    // Room above the card for Faro AI to sit on its top edge.
    <div className={cn("pt-14", className)}>
      <div ref={cardRef} className="relative">
        <div className="relative z-10">{children}</div>
        {/* In front of the card, clipped at its edge (see the note above). */}
        <span
          aria-hidden
          className="pointer-events-none absolute z-20 overflow-hidden text-ink"
          style={win}
        >
          <span
            className="absolute block"
            style={{
              ...place,
              transform: sprite,
              transition:
                phase === "move"
                  ? "none"
                  : `transform ${TRAVEL_MS}ms cubic-bezier(0.34, 1.4, 0.64, 1)`,
            }}
          >
            <Mascot pose={pose} className="h-full" decorative />
          </span>
        </span>
      </div>
    </div>
  );
}
