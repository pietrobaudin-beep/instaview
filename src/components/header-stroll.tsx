"use client";

import * as React from "react";
import { Mascot, type Pose } from "@/components/ui/mascot";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/**
 * O Faro passeando no topo das telas de entrada.
 *
 * Ele **anda de um lado para o outro** — parado ele não era um personagem, era
 * um adesivo. A cada parada faz um gesto curto (cheira, procura com a lupa) e
 * segue. **Clicar nele** faz o Faro correr até o lugar do clique e comemorar.
 *
 * No celular, a faixa mostra a marca Farejo no meio e ele passa **na frente**
 * dela — o que dá ao topo da tela um dono, em vez de um bicho solto.
 *
 * Com "reduzir movimento" ligado no sistema, ele fica sentado e quieto.
 */

type Move = "run" | "sniff" | "scan" | "perk" | "found" | "bob";

interface Beat {
  pose: Pose;
  move: Move;
  ms: number;
  /** Para onde ele vai nesta batida, de 0 a 1 da largura. */
  x: number;
}

/**
 * O passeio: anda um pouco, **para um tempo**, faz um gesto, anda de novo.
 *
 * As paradas são mais longas que as travessias de propósito — um cachorro que
 * só corre cansa quem está tentando digitar um @ ao lado.
 */
const BEATS: Beat[] = [
  { pose: "sentado", move: "bob", ms: 3600, x: 0.5 },
  { pose: "correndo", move: "run", ms: 1500, x: 0.14 },
  { pose: "cheirando", move: "sniff", ms: 3400, x: 0.14 },
  { pose: "correndo", move: "run", ms: 1700, x: 0.82 },
  { pose: "lupa", move: "scan", ms: 3800, x: 0.82 },
  { pose: "correndo", move: "run", ms: 1400, x: 0.62 },
  { pose: "sentado", move: "bob", ms: 4200, x: 0.62 },
  { pose: "correndo", move: "run", ms: 1500, x: 0.3 },
  { pose: "alerta", move: "perk", ms: 2600, x: 0.3 },
  { pose: "correndo", move: "run", ms: 1300, x: 0.46 },
  { pose: "feliz", move: "bob", ms: 3400, x: 0.46 },
];

const SIZE = 44; // px, altura padrão
/** O "?" leria ao contrário espelhado. */
const NO_FLIP: Pose[] = ["duvida"];
const GESTURE: Record<Move, string> = {
  run: "scene-run",
  sniff: "scene-sniff",
  scan: "scene-scan",
  perk: "scene-perk",
  found: "scene-found",
  bob: "mascot-bob",
};

/** Quanto tempo a comemoração do clique dura antes de ele voltar ao passeio. */
const FESTA_MS = 1600;
/** Quanto tempo ele leva para atravessar a faixa inteira. */
const TRAVESSIA_MS = 1500;

export function HeaderStroll({
  ground = true,
  size = SIZE,
  className = "relative h-16",
  marca = false,
}: {
  size?: number;
  /** Desenha o chão pontilhado. */
  ground?: boolean;
  className?: string;
  /** Mostra a marca Farejo atrás dele (usado no topo do app no celular). */
  marca?: boolean;
} = {}) {
  /**
   * Com a marca atrás, ele **não para em cima dela**: vai e volta entre as
   * pontas e o meio é só passagem. De dez viagens, uma acaba parada no centro
   * — o suficiente para não virar um vaivém de relógio.
   */
  const PONTAS: Beat[] = [
    { pose: "correndo", move: "run", ms: 1500, x: 0.1 },
    { pose: "cheirando", move: "sniff", ms: 3600, x: 0.1 },
    { pose: "correndo", move: "run", ms: 1700, x: 0.9 },
    { pose: "lupa", move: "scan", ms: 3800, x: 0.9 },
    { pose: "correndo", move: "run", ms: 1500, x: 0.1 },
    { pose: "sentado", move: "bob", ms: 4200, x: 0.1 },
    { pose: "correndo", move: "run", ms: 1700, x: 0.9 },
    { pose: "alerta", move: "perk", ms: 3000, x: 0.9 },
  ];
  const PARADA_NO_MEIO: Beat[] = [
    { pose: "correndo", move: "run", ms: 1200, x: 0.5 },
    { pose: "feliz", move: "bob", ms: 2600, x: 0.5 },
  ];

  const roteiro = React.useCallback(
    (n: number): Beat => {
      if (!marca) return BEATS[n % BEATS.length];
      // Oito idas e vindas entre as pontas e, só então, uma paradinha no meio:
      // uma parada no centro a cada nove.
      const VOLTA = PONTAS.length * 2 + PARADA_NO_MEIO.length;
      const ciclo = n % VOLTA;
      if (ciclo >= VOLTA - PARADA_NO_MEIO.length) {
        return PARADA_NO_MEIO[ciclo - (VOLTA - PARADA_NO_MEIO.length)];
      }
      return PONTAS[ciclo % PONTAS.length];
    },
    // As listas são constantes dentro do componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marca],
  );

  const faixa = React.useRef<HTMLDivElement>(null);
  const inicial = marca ? PONTAS[1] : BEATS[0];
  const [beat, setBeat] = React.useState<Beat>(inicial);
  const [x, setX] = React.useState(inicial.x);
  const [dir, setDir] = React.useState(1);
  const [festa, setFesta] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);
  const xRef = React.useRef(x);
  xRef.current = x;

  React.useEffect(() => {
    setReduced(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // O passeio. Pausa enquanto ele comemora um clique.
  React.useEffect(() => {
    if (reduced || festa) return;
    let vivo = true;
    let timer: number;
    let n = 0;
    const tocar = () => {
      if (!vivo) return;
      const b = roteiro(n);
      setBeat(b);
      if (b.x !== xRef.current) setDir(b.x > xRef.current ? 1 : -1);
      setX(b.x);
      n++;
      timer = window.setTimeout(tocar, b.ms);
    };
    timer = window.setTimeout(tocar, 600);
    return () => {
      vivo = false;
      window.clearTimeout(timer);
    };
  }, [reduced, festa, roteiro]);

  /** Clicou na faixa: ele corre até ali e comemora. */
  function chamar(e: React.MouseEvent) {
    if (reduced) return;
    const r = faixa.current?.getBoundingClientRect();
    if (!r) return;
    const alvo = Math.min(0.92, Math.max(0.08, (e.clientX - r.left) / r.width));
    setDir(alvo > xRef.current ? 1 : -1);
    setX(alvo);
    setFesta(true);
    window.setTimeout(() => setFesta(false), FESTA_MS);
  }

  const pose: Pose = festa ? "feliz" : reduced ? "sentado" : beat.pose;
  const gesture = reduced ? "" : festa ? "scene-found" : GESTURE[beat.move];
  const facing = NO_FLIP.includes(pose) ? 1 : dir;

  return (
    <div
      ref={faixa}
      onClick={chamar}
      className={cn(
        "relative cursor-pointer select-none",
        className,
        ground && "border-b border-dashed border-ink/15",
      )}
      title="Chame o Faro"
    >
      {marca && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
        >
          {/* A marca na cor dela mesma; o Faro passa por cima. */}
          <Logo className="h-7" />
        </span>
      )}

      <span
        aria-hidden
        className="pointer-events-none absolute bottom-1 z-10"
        style={{
          left: `${x * 100}%`,
          height: size,
          transform: "translateX(-50%)",
          transition: reduced ? undefined : `left ${TRAVESSIA_MS}ms cubic-bezier(0.4, 0, 0.3, 1)`,
        }}
      >
        <span className="absolute -bottom-0.5 left-1/2 h-1.5 w-3/4 -translate-x-1/2 rounded-full bg-ink/15 blur-[2px]" />
        <div
          className="h-full"
          style={{ transform: `scaleX(${facing})`, transition: "transform 240ms ease-in-out" }}
        >
          <div key={pose} className="scene-pop h-full">
            <div className={`relative h-full ${gesture}`}>
              {/* Uma mancha creme por baixo dele.
                  A primeira tentativa foi uma cópia branca do próprio desenho,
                  mas o Faro é feito de traços: a cópia saía como traço branco,
                  e a marca continuava aparecendo entre as linhas. A mancha é
                  cheia, então o que passa atrás dele some de verdade. */}
              {marca && (
                <span
                  aria-hidden
                  className="absolute inset-x-[6%] bottom-[2%] top-[10%] rounded-[45%] bg-cream blur-[3px]"
                />
              )}
              <Mascot pose={pose} className="relative h-full text-ink" decorative />
            </div>
          </div>
        </div>
      </span>
    </div>
  );
}
