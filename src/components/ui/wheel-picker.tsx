"use client";

import * as React from "react";

/**
 * The iPhone time-picker wheel, used here to choose what you are looking at.
 *
 * Behaves like the real thing: the list scrolls under a fixed highlight band,
 * snaps to the nearest row, and the rows away from the centre fade and shrink.
 * Tapping a row brings it to the centre.
 *
 * One deliberate difference from a plain tab bar: the choice is only committed
 * once the wheel stops. Each section costs a provider request, so spinning past
 * six of them must not fetch six times.
 */

/** Five short rows: enough to see where you are going, still compact. */
const ITEM_H = 34;
const VISIBLE = 5;

export function WheelPicker<T extends string>({
  options,
  value,
  onChange,
  className = "",
  itemHeight = ITEM_H,
  visible = VISIBLE,
  "aria-label": ariaLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Row height in px. */
  itemHeight?: number;
  /** How many rows show at once (odd numbers keep a centre). */
  visible?: number;
  "aria-label"?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const settle = React.useRef<number | undefined>(undefined);
  const selected = Math.max(0, options.findIndex((o) => o.value === value));
  // Which row is under the band right now — drives the fading, not the choice.
  const [centred, setCentred] = React.useState(selected);

  const height = itemHeight * visible;
  const pad = (height - itemHeight) / 2;

  // Follow the value when it changes from outside (a link, a back button).
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const top = selected * itemHeight;
    if (Math.abs(el.scrollTop - top) > 2) el.scrollTo({ top, behavior: "auto" });
    setCentred(selected);
  }, [selected]);

  function handleScroll() {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / itemHeight);
    setCentred(Math.min(options.length - 1, Math.max(0, i)));

    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const idx = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / itemHeight)));
      const next = options[idx];
      if (next && next.value !== value) onChange(next.value);
    }, 160);
  }

  function goTo(i: number) {
    ref.current?.scrollTo({ top: i * itemHeight, behavior: "smooth" });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = Math.min(options.length - 1, Math.max(0, selected + (e.key === "ArrowDown" ? 1 : -1)));
    goTo(i);
    onChange(options[i].value);
  }

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ height }}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKey}
    >
      {/* The band the chosen row sits in. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 z-10 rounded-2xl bg-plum/[0.06]"
        style={{ top: pad, height: itemHeight }}
      />

      <div
        ref={ref}
        onScroll={handleScroll}
        className="wheel-scroll h-full overflow-y-auto overscroll-contain"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          paddingTop: pad,
          paddingBottom: pad,
          // Fades the rows into the edges, as the iOS wheel does.
          maskImage:
            "linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
        }}
      >
        {options.map((o, i) => {
          const d = Math.abs(i - centred);
          const isCentre = d === 0;
          return (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                goTo(i);
                onChange(o.value);
              }}
              className="flex w-full items-center justify-center text-center transition-[opacity,transform,color] duration-150"
              style={{
                height: itemHeight,
                scrollSnapAlign: "center",
                // Trava item a item: um arrasto forte não passa voando por seis
                // seções, para exatamente na próxima — como no seletor do iOS.
                scrollSnapStop: "always",
                opacity: isCentre ? 1 : d === 1 ? 0.6 : d === 2 ? 0.32 : 0.18,
                transform: `scale(${isCentre ? 1 : d === 1 ? 0.94 : 0.88})`,
              }}
            >
              <span
                className={
                  isCentre
                    ? "text-[15px] font-semibold tracking-tight text-plum"
                    : "text-[15px] font-medium text-plum/70"
                }
              >
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
