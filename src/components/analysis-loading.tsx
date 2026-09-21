"use client";

import * as React from "react";
import { Globe, Lock } from "lucide-react";
import { Heart } from "@/components/ui/dog";
import { LoadingScene } from "@/components/loading-scene";
import { Logo } from "@/components/ui/logo";
import { PixelAvatar } from "@/components/pixel-avatar";

export interface RevealProfile {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
  /** "maio de 2016", when the provider already told us. */
  joined?: string | null;
}

/**
 * Quanto a frase final fica antes de a página assumir.
 *
 * Eram 2 segundos depois de a foto já estar nítida. O dado pronto não espera
 * a cena: fica só o tempo de ler "Achei".
 */
const OUTRO_MS = 700;

/**
 * Full-screen loading shown while a profile is analysed.
 *
 * Faro never leaves: he keeps running, sniffing and perking up the whole time.
 * When the provider answers, the profile builds itself above him — the picture
 * arrives as a mosaic and sharpens while name, @, public/private and the
 * account's age appear one after the other. Only at the end does he stop: with
 * the bone on a public profile, wondering on a private one.
 *
 * Nothing of the real person is ever drawn before the answer comes back.
 */
export function AnalysisLoading({
  step,
  steps,
  username,
  reveal,
  onRevealDone,
}: {
  step: number;
  steps: readonly string[];
  username?: string;
  /** Set as soon as the profile is known — starts the second act. */
  reveal?: RevealProfile | null;
  onRevealDone?: () => void;
}) {
  const [sharp, setSharp] = React.useState(false);
  const doneRef = React.useRef(onRevealDone);
  doneRef.current = onRevealDone;

  // Sharpened: hold the closing line for a beat, then hand over to the page.
  React.useEffect(() => {
    if (!sharp) return;
    const id = window.setTimeout(() => doneRef.current?.(), OUTRO_MS);
    return () => window.clearTimeout(id);
  }, [sharp]);

  React.useEffect(() => {
    if (!reveal) setSharp(false);
  }, [reveal]);

  const found = !!reveal;
  const privateAccount = !!reveal?.isPrivate;

  const status = !found
    ? steps[step]
    : !sharp
      ? "Encontrei o perfil…"
      : privateAccount
        ? "Encontrei o perfil, mas não consigo farejar além daqui."
        : "Achei.";

  return (
    <div className="brand-panel fixed inset-0 z-50 overflow-y-auto">
      {/* Handwritten annotations, as in the designs. */}
      <span className="hand absolute left-6 top-14 -rotate-[8deg] text-2xl leading-tight sm:left-12 sm:top-20 sm:text-3xl">
        toda curiosidade
        <br />
        deixa um rastro
        <span className="mt-1 block h-[3px] w-14 rounded-full bg-current" />
      </span>
      <Heart className="absolute right-8 top-16 h-8 sm:right-16 sm:top-20 sm:h-10" />

      <div className="flex min-h-full flex-col items-center justify-center px-8 py-28 text-center">
        <Logo className="h-12 sm:h-16" />
        <p className="mt-3 text-sm tracking-[0.2em] opacity-80">curiosidade conecta.</p>

        {/* The profile builds itself here, above Faro. */}
        <div
          className={`w-full max-w-[340px] overflow-hidden transition-all duration-700 ease-out ${
            found ? "mt-7 max-h-[260px] opacity-100" : "mt-0 max-h-0 opacity-0"
          }`}
        >
          {reveal && <RevealCard profile={reveal} onSharp={() => setSharp(true)} />}
        </div>

        {/* Faro stays on the job until the very end. */}
        <div className="mt-6 w-full max-w-[340px]">
          <LoadingScene done={sharp} outcome={privateAccount ? "private" : "found"} />
        </div>

        <p className="mt-6 max-w-sm text-base font-medium sm:text-lg" role="status" aria-live="polite">
          {status}
        </p>

        <div className="mt-4 h-2.5 w-full max-w-[320px] overflow-hidden rounded-full bg-ink/20">
          <div
            className="h-full rounded-full bg-ink transition-all duration-700 ease-out"
            style={{
              width: found ? (sharp ? "100%" : "80%") : `${((step + 1) / steps.length) * 70}%`,
            }}
          />
        </div>

        {username && !found && (
          <p className="mt-3 text-xs opacity-70">
            farejando <b>@{username}</b>
          </p>
        )}
      </div>

      <span className="hand absolute bottom-24 right-6 rotate-[8deg] text-right text-xl leading-tight sm:bottom-28 sm:right-14 sm:text-2xl">
        algumas respostas
        <br />
        precisam ser farejadas <span className="align-middle">♥</span>
      </span>

      <p className="absolute inset-x-0 bottom-8 text-center text-[11px] tracking-[0.25em] opacity-70">
        FAREJE ALÉM DO @
      </p>
    </div>
  );
}

/** The profile arriving: mosaic picture first, then one fact at a time. */
function RevealCard({ profile, onSharp }: { profile: RevealProfile; onSharp: () => void }) {
  const facts: React.ReactNode[] = [];
  if (profile.displayName)
    facts.push(
      <p key="nome" className="truncate text-lg font-extrabold leading-tight">
        {profile.displayName}
      </p>,
    );
  facts.push(
    <p key="arroba" className="truncate text-sm opacity-70">
      @{profile.username}
    </p>,
  );
  facts.push(
    <span
      key="selo"
      className="inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-2.5 py-1 text-xs font-bold"
    >
      {profile.isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
      {profile.isPrivate ? "Perfil privado" : "Perfil público"}
    </span>,
  );
  if (profile.joined)
    facts.push(
      <p key="desde" className="text-xs opacity-70">
        no Instagram desde {profile.joined}
      </p>,
    );

  return (
    <div className="flex flex-col items-center">
      <PixelAvatar
        src={profile.avatarUrl}
        size={96}
        revealing
        onDone={onSharp}
        className="ring-[3px] ring-ink/15"
      />
      <div className="mt-3 flex w-full flex-col items-center gap-1.5">
        {facts.map((fact, i) => (
          <span key={i} className="reveal-line block max-w-full" style={{ animationDelay: `${700 + i * 850}ms` }}>
            {fact}
          </span>
        ))}
      </div>
    </div>
  );
}
