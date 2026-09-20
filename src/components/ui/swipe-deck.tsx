"use client";

import * as React from "react";

/**
 * Um cartão de cada vez no celular; grade normal do tablet para cima.
 *
 * No celular a rolagem da página comanda: conforme a pessoa arrasta para baixo,
 * a seção fica presa na tela e os cartões desfilam para o lado. O movimento não
 * é ligado direto na rolagem — ele persegue o alvo quadro a quadro, então um
 * arrasto brusco vira um deslize macio, e o cartão do meio cresce e clareia
 * enquanto os vizinhos recuam.
 *
 * Quem preferir pode arrastar com o dedo: enquanto o dedo está na tela o
 * comando é dele, com o encaixe item a item de sempre.
 *
 * Com `prefers-reduced-motion` nada disso acontece: cartões parados, em lista.
 */

/** Suaviza as pontas: começa devagar, corre no meio, chega devagar. */
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function SwipeDeck({
  children,
  className = "",
  gridClassName = "md:grid-cols-3",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  /** Como a grade se organiza a partir de `md`. */
  gridClassName?: string;
  label?: string;
}) {
  const items = React.Children.toArray(children);
  const outer = React.useRef<HTMLDivElement | null>(null);
  const deck = React.useRef<HTMLDivElement | null>(null);
  const touching = React.useRef(false);
  const target = React.useRef(0);
  const frame = React.useRef(0);
  const [current, setCurrent] = React.useState(0);
  const [linked, setLinked] = React.useState(false);

  // Só no celular, e só para quem não pediu menos movimento.
  React.useEffect(() => {
    const check = () =>
      setLinked(
        window.matchMedia("(max-width: 767px)").matches &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const step = () => {
    const first = deck.current?.firstElementChild as HTMLElement | null;
    return first ? first.offsetWidth + 20 : 1; // cartão + gap
  };

  /** Destaca quem está no meio e recolhe os vizinhos. */
  const paint = React.useCallback(() => {
    const row = deck.current;
    if (!row) return;
    const mid = row.scrollLeft + row.clientWidth / 2;
    Array.from(row.children).forEach((node) => {
      const el = node as HTMLElement;
      const d = Math.min(1.6, Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid) / step());
      el.style.transform = `scale(${1 - d * 0.06})`;
      el.style.opacity = `${1 - d * 0.35}`;
    });
  }, []);

  // A rolagem da página define o alvo; o quadro a quadro persegue esse alvo.
  React.useEffect(() => {
    if (!linked) {
      const row = deck.current;
      if (row) {
        Array.from(row.children).forEach((n) => {
          (n as HTMLElement).style.transform = "";
          (n as HTMLElement).style.opacity = "";
        });
      }
      return;
    }

    const tick = () => {
      const row = deck.current;
      if (row && !touching.current) {
        const diff = target.current - row.scrollLeft;
        // Persegue 12% da distância por quadro: rápido no começo, macio no fim.
        if (Math.abs(diff) > 0.5) row.scrollLeft += diff * 0.12;
        else row.scrollLeft = target.current;
        setCurrent(Math.min(items.length - 1, Math.max(0, Math.round(row.scrollLeft / step()))));
      }
      paint();
      frame.current = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      const box = outer.current;
      const row = deck.current;
      if (!box || !row) return;
      const r = box.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = r.height - vh * 0.7;
      const raw = total > 0 ? Math.min(1, Math.max(0, (vh * 0.7 - r.top) / total)) : 0;
      target.current = ease(raw) * (row.scrollWidth - row.clientWidth);
    };

    onScroll();
    frame.current = window.requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, [linked, items.length, paint]);

  function handleScroll() {
    const row = deck.current;
    if (!row) return;
    if (touching.current) {
      setCurrent(Math.min(items.length - 1, Math.max(0, Math.round(row.scrollLeft / step()))));
      paint();
    }
  }

  function goTo(i: number) {
    target.current = i * step();
    deck.current?.scrollTo({ left: i * step(), behavior: "smooth" });
  }

  return (
    // No celular a seção fica mais alta que a tela: é essa altura extra que dá
    // "corda" para os cartões desfilarem enquanto a pessoa rola.
    <div ref={outer} className={`${className} ${linked ? "min-h-[190vh] md:min-h-0" : ""}`}>
      <div className={linked ? "sticky top-[18vh] md:static" : undefined}>
        <div
          ref={deck}
          onScroll={handleScroll}
          onTouchStart={() => (touching.current = true)}
          onTouchEnd={() => {
            touching.current = false;
            // Retoma de onde o dedo largou, sem pulo.
            if (deck.current) target.current = deck.current.scrollLeft;
          }}
          aria-label={label}
          style={{
            // O encaixe é do dedo. Durante a rolagem da página ele atrapalharia
            // o deslize, puxando os cartões de volta.
            scrollSnapType: linked && !touching.current ? "none" : undefined,
          }}
          className={`-mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:overflow-visible md:px-0 ${gridClassName}`}
        >
          {items.map((child, i) => (
            <div
              key={i}
              className="w-[86%] shrink-0 snap-center transition-[transform,opacity] duration-200 ease-out [scroll-snap-stop:always] md:w-auto md:shrink md:!transform-none md:!opacity-100"
            >
              {child}
            </div>
          ))}
        </div>

        {/* Bolinhas: só no celular, onde os cartões aparecem um de cada vez. */}
        <div className="mt-5 flex items-center justify-center gap-2 md:hidden">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ver opção ${i + 1} de ${items.length}`}
              aria-current={i === current}
              className={`h-2 rounded-full transition-all ${
                i === current ? "w-6 bg-vinho" : "w-2 bg-vinho/25"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
