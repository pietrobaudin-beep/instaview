"use client";

import { AnimatedDog, Heart } from "@/components/ui/dog";
import { Logo } from "@/components/ui/logo";

/**
 * Full-screen loading shown while a profile is analysed — the splash from the
 * brand designs: pink field, mascot sniffing, and the current step written
 * directly above the progress bar.
 */
export function AnalysisLoading({
  step,
  steps,
  username,
}: {
  step: number;
  steps: readonly string[];
  username?: string;
}) {
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="brand-panel fixed inset-0 z-50 overflow-hidden">
      {/* Handwritten annotations, as in the designs. */}
      <span className="hand absolute left-6 top-14 -rotate-[8deg] text-2xl leading-tight sm:left-12 sm:top-20 sm:text-3xl">
        tudo começa
        <br />
        com um @
        <span className="mt-1 block h-[3px] w-14 rounded-full bg-current" />
      </span>
      <Heart className="absolute right-8 top-16 h-8 sm:right-16 sm:top-20 sm:h-10" />

      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <Logo className="h-14 sm:h-20" />
        <p className="mt-3 text-sm tracking-[0.2em] opacity-80 sm:text-base">
          curiosidade conecta.
        </p>

        <AnimatedDog className="mt-8 w-full max-w-[190px] sm:max-w-[220px]" />

        {/* Status sits directly above the bar. */}
        <p
          className="mt-10 text-base font-medium sm:text-lg"
          role="status"
          aria-live="polite"
        >
          {steps[step]}
        </p>
        <div className="mt-4 h-2.5 w-full max-w-[320px] overflow-hidden rounded-full bg-ink/20">
          <div
            className="h-full rounded-full bg-ink transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {username && (
          <p className="mt-3 text-xs opacity-70">
            analisando <b>@{username}</b>
          </p>
        )}
      </div>

      <span className="hand absolute bottom-24 right-6 rotate-[8deg] text-right text-xl leading-tight sm:bottom-28 sm:right-14 sm:text-2xl">
        curiosidade também
        <br />é resposta <span className="align-middle">♥</span>
      </span>

      <p className="absolute inset-x-0 bottom-8 text-center text-[11px] tracking-[0.25em] opacity-70">
        FAREJANDO
      </p>
    </div>
  );
}
