"use client";

import * as React from "react";
import { Mascot, type Pose } from "@/components/ui/mascot";

/**
 * O Faro trabalhando, ao lado do cartão do PRO.
 *
 * Ele conta a rotina em quatro tempos, devagar: espia o perfil, fica atento
 * quando algo muda, avisa — e sai feliz com a pista na boca. Depois recomeça.
 *
 * As trocas são fades curtos, no mesmo tom calmo do resto do site, e quem pede
 * menos movimento vê só a primeira pose, parada.
 */

interface Beat {
  pose: Pose;
  /** Etiqueta que acompanha a pose, quando há o que dizer. */
  say?: string;
  ms: number;
}

const BEATS: Beat[] = [
  { pose: "espiando", ms: 4200 },
  { pose: "alerta", say: "Pista encontrada", ms: 3400 },
  { pose: "feliz", ms: 3000 },
  { pose: "osso", ms: 3600 },
];

export function FaroWatching({ className = "" }: { className?: string }) {
  const [i, setI] = React.useState(0);
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    setReduced(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  React.useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(() => setI((n) => (n + 1) % BEATS.length), BEATS[i].ms);
    return () => window.clearTimeout(id);
  }, [i, reduced]);

  const beat = reduced ? BEATS[0] : BEATS[i];

  return (
    <div className={`pointer-events-none relative ${className}`} aria-hidden>
      {/* Etiqueta, não balãozinho: encosta no cartão de mudanças, com a cor de
          "novo" que o resto do produto usa. */}
      <span
        className={`absolute -left-1 top-6 -translate-x-full whitespace-nowrap rounded-full bg-yellow px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm transition-opacity duration-300 ${
          beat.say ? "opacity-100" : "opacity-0"
        }`}
      >
        {beat.say ?? ""}
      </span>

      {/* Uma pose por vez, trocando em fade — sem giro, sem salto. */}
      <div className="relative h-full w-full">
        {BEATS.map((b, n) => (
          <Mascot
            key={b.pose}
            pose={b.pose}
            decorative
            className={`absolute bottom-0 left-1/2 h-full -translate-x-1/2 text-pink transition-opacity duration-500 ${
              n === (reduced ? 0 : i) ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
