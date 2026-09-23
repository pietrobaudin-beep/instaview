"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Heart } from "@/components/ui/dog";
import { CurvedArrow, Sparkle } from "@/components/ui/doodles";
import { Logo } from "@/components/ui/logo";
import { BRAND } from "@/lib/voice";
import { FaroSwap, Mascot } from "@/components/ui/mascot";

/** Marks onboarding as seen on this device so it only shows once. */
const KEY = "farejo:onboarded";

// Every line here is from the official brand book (see BRAND in lib/voice).
const SLIDES = [
  {
    surface: "bg-background",
    title: `${BRAND.manifesto[0]}\n${BRAND.manifesto[1]}`,
    body: "O Farejo encontra as pistas que você não percebeu.",
    art: "search",
  },
  {
    surface: "brand-panel",
    title: BRAND.phrases.prestaAtencao,
    body: BRAND.phrases.vocePergunta,
    art: "dog",
  },
  {
    surface: "brand-purple",
    title: BRAND.concept,
    body: `${BRAND.phrases.umArroba} Descubra conexões, acompanhe mudanças e encontre pistas a partir de um @.`,
    art: "at",
  },
] as const;

export function Onboarding({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const [i, setI] = React.useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  function finish() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* storage blocked — onboarding simply shows again */
    }
    router.push(next);
  }

  return (
    <main className={`flex min-h-screen flex-col px-6 py-6 ${slide.surface}`}>
      <div className="flex items-center justify-between">
        <Logo className="h-7" />
        <button
          type="button"
          onClick={finish}
          className="rounded-full px-3 py-1.5 text-sm font-semibold opacity-70 transition hover:opacity-100"
        >
          Pular
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <h1 className="max-w-xl whitespace-pre-line text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          {slide.title}
        </h1>
        <p className="mt-4 max-w-sm text-base opacity-75">{slide.body}</p>

        <div className="mt-12 flex h-40 items-center justify-center">
          {slide.art === "search" && (
            <FaroSwap from="sentado" to="lupa" loop className="h-36 text-vinho" />
          )}
          {slide.art === "dog" && <Mascot pose="feliz" className="h-36 text-ink" bob />}
          {slide.art === "at" && (
            <div className="flex items-center gap-4">
              <Heart className="h-12" />
              <CurvedArrow className="h-16" />
              <Sparkle className="h-10" />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center gap-2">
          {SLIDES.map((s, n) => (
            <span
              key={s.title}
              className={`h-2 rounded-full transition-all ${
                n === i ? "w-6 bg-current" : "w-2 bg-current opacity-30"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (last ? finish() : setI(i + 1))}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-4 text-base font-bold text-cream transition hover:opacity-90"
        >
          {last ? "Começar agora" : "Continuar"}
          <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
          {BRAND.signature}
        </p>
      </div>
    </main>
  );
}
