"use client";

import * as React from "react";

/**
 * Types each word letter by letter, holds it, erases it and moves to the next —
 * the search-bar effect from the landing page. With reduced motion it just
 * shows the first word.
 */
export function useTypewriter(
  words: string[],
  { typeMs = 85, eraseMs = 40, holdMs = 1400, gapMs = 350, active = true } = {},
) {
  const [text, setText] = React.useState("");
  const key = words.join("|");

  React.useEffect(() => {
    if (!active) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setText(words[0] ?? "");
      return;
    }
    let w = 0;
    let i = 0;
    let typing = true;
    let t: number;
    const tick = () => {
      const word = words[w];
      if (typing) {
        i++;
        setText(word.slice(0, i));
        if (i >= word.length) {
          typing = false;
          t = window.setTimeout(tick, holdMs);
          return;
        }
        t = window.setTimeout(tick, typeMs);
      } else {
        i--;
        setText(word.slice(0, i));
        if (i <= 0) {
          typing = true;
          w = (w + 1) % words.length;
          t = window.setTimeout(tick, gapMs);
          return;
        }
        t = window.setTimeout(tick, eraseMs);
      }
    };
    t = window.setTimeout(tick, gapMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, typeMs, eraseMs, holdMs, gapMs]);

  return text;
}
