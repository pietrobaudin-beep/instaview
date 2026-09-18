"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Heart, SniffingDog } from "@/components/ui/dog";
import { AtBubble, CurvedArrow, Magnifier, Sparkle } from "@/components/ui/doodles";
import { Logo } from "@/components/ui/logo";

/** Marks onboarding as seen on this device so it only shows once. */
const KEY = "farejo:onboarded";

const SLIDES = [
  {
    surface: "bg-background",
    title: "Descubra mais do Instagram.",
    body: "Acompanhe novos seguindo, quem deixou de seguir, interações e muito mais.",
    art: "search",
  },
  {
    surface: "brand-panel",
    title: "Para crushes, amigos ou só curiosidade.",
    body: "O Farejo te mostra o que importa, de forma simples, rápida e segura.",
    art: "dog",
  },
  {
    surface: "brand-purple",
    title: "Tudo começa com um @.",
    body: "Busque qualquer perfil público e veja o que mudou desde a última análise.",
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
        <h1 className="max-w-md text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          {slide.title}
        </h1>
        <p className="mt-4 max-w-sm text-base opacity-75">{slide.body}</p>

        <div className="mt-12 flex h-40 items-center justify-center">
          {slide.art === "search" && (
            <div className="flex items-end gap-5">
              <Magnifier className="h-16 text-accent" />
              <AtBubble className="h-20 text-pink" />
              <Sparkle className="h-10 text-yellow" />
            </div>
          )}
          {slide.art === "dog" && <SniffingDog className="h-32 text-ink" animated />}
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
          className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 text-base font-bold text-cream transition hover:opacity-90"
        >
          {last ? "Começar agora" : "Continuar"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </main>
  );
}
