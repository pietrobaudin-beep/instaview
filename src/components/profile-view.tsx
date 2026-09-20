"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Chips, Panel, PersonRow } from "@/components/ui/brand";
import { ProfileHero, type HeroProfile } from "@/components/profile-hero";
import {
  FollowsBreakdown,
  OtherInteractions,
  TopInteraction,
  type Breakdown,
  type Person,
} from "@/components/follows-breakdown";
import { ProDashboard } from "@/components/pro-dashboard";
import { HistoryPanel } from "@/components/history-panel";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { AnalysisLoading, type RevealProfile } from "@/components/analysis-loading";
import { markSeen, wasSeenRecently } from "@/lib/seen-profiles";
import { BRAND, LOADING_LINES } from "@/lib/voice";
import { FaroUpsell } from "@/components/faro-upsell";
import { SingleUnlockButton } from "@/components/single-unlock-button";
import { PeekingFaro } from "@/components/ui/peeking-faro";
import { NoteBox } from "@/components/ui/brand";
import { Mascot } from "@/components/ui/mascot";
import { RaioX } from "@/components/raio-x";
import { WheelPicker } from "@/components/ui/wheel-picker";
import type { Section } from "@/lib/raio-x";

interface RecentItem extends Person {
  detectedAt: string;
}

// Faro's loading lines. They cycle while the provider answers — the sequence
// ends when the profile arrives, not on a clock.
const STEPS = LOADING_LINES;
/** One line every ~2.4s while Faro searches. */
const STEP_MS = 2400;
/** Faro always gets this long to search, even when the answer is instant. */
const MIN_SEARCH_MS = 9000;

const TABS = [
  { value: "visao", label: "Visão geral" },
  { value: "stories", label: "Stories" },
  { value: "posts", label: "Posts" },
  { value: "reels", label: "Reels" },
  { value: "seguindo", label: "Seguindo" },
  { value: "interacoes", label: "Interações" },
  { value: "tagged", label: "Marcações" },
  { value: "highlights", label: "Destaques" },
  { value: "reposts", label: "Reposts" },
  { value: "suggested", label: "Parecidos" },
  { value: "about", label: "Sobre" },
  { value: "historico", label: "Rastro" },
] as const;

type Tab = (typeof TABS)[number]["value"];

// Tabs served by the Raio-X (one provider request each, fetched when opened).
const RAIO_X_TABS: readonly Section[] = ["stories", "posts", "reels", "tagged", "highlights", "reposts", "suggested", "about"];
const isRaioX = (t: Tab): t is Tab & Section => (RAIO_X_TABS as readonly string[]).includes(t);

function GenderBadge({ gender }: { gender?: "f" | "m" | "u" }) {
  if (gender === "f")
    return (
      <span className="shrink-0 rounded-full border border-pink bg-pink/40 px-2 py-0.5 text-[11px] font-semibold text-accent">
        Mulher
      </span>
    );
  if (gender === "m")
    return (
      <span className="shrink-0 rounded-full border border-purple bg-purple/40 px-2 py-0.5 text-[11px] font-semibold text-[#5B47C4]">
        Homem
      </span>
    );
  return null;
}

/**
 * The upgrade block shown to free visitors: two honest options — see only this
 * profile once ("uso único"), or subscribe to follow it over time (PRO).
 */
function UpgradeCard({ username }: { username: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
    <div className="flex flex-col rounded-3xl border border-border bg-card p-6 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Unlock className="h-5 w-5 text-vinho" />
      </span>
      <h2 className="text-lg font-bold">Só quer ver este perfil?</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
        Desbloqueie a análise completa de @{username}, sem censura, com um pagamento único.
      </p>
      <SingleUnlockButton username={username} className="mt-auto pt-5" />
    </div>
    <div className="rounded-3xl border-2 border-pink bg-pink/20 p-6 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink text-ink">
        <Lock className="h-5 w-5" />
      </span>
      <h2 className="text-lg font-bold">Quer acompanhar o que mudar daqui pra frente?</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {BRAND.phrases.naoProcure}
      </p>
      <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm">
        {[
          "📌 Coloque perfis no Faro",
          "🐾 Veja quem entrou e quem saiu, sem censura",
          "❤️ Interações públicas organizadas",
          "🔔 Alertas quando o Faro encontrar algo novo",
        ].map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="text-foreground/80">{b}</span>
          </li>
        ))}
      </ul>
      <Link href={`/pricing?next=${encodeURIComponent(`/p/${username}`)}`} className="mt-5 block">
        <Button variant="accent" size="lg" className="w-full sm:w-auto">
          Farejo PRO <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <Link
        href={`/login?next=${encodeURIComponent(`/p/${username}`)}`}
        className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground"
      >
        já é assinante? entrar
      </Link>
    </div>
    </div>
  );
}

export function ProfileView({ username, loggedIn }: { username: string; loggedIn: boolean }) {
  const router = useRouter();

  const [state, setState] = React.useState<
    | { kind: "loading" }
    | { kind: "ok"; data: HeroProfile; note?: string }
    | { kind: "error" }
    | { kind: "limited"; spentOn: string | null }
  >({ kind: "loading" });

  const [following, setFollowing] = React.useState<
    | { kind: "loading" }
    | { kind: "private" }
    | {
        kind: "ready";
        locked: boolean;
        access: "free" | "single" | "pro";
        users: Person[];
        real: boolean;
        counts?: Breakdown;
        recent?: { started: RecentItem[]; stopped: RecentItem[] };
      }
  >({ kind: "loading" });

  const [interactions, setInteractions] = React.useState<{ locked: boolean; items: Person[] }>({
    locked: true,
    items: [],
  });

  const [tab, setTab] = React.useState<Tab>("visao");
  const [step, setStep] = React.useState(0);
  const [analyzing, setAnalyzing] = React.useState(true);
  const [tracking, setTracking] = React.useState({ saved: false, busy: false });
  const [upsell, setUpsell] = React.useState(false);
  const [justPinned, setJustPinned] = React.useState(false);

  // Is this profile already in the user's Faro? DB read only — no provider call.
  // The answer also decides whether the search scene plays: a profile you
  // already follow is not a new discovery, so it opens straight away.
  const [inFaro, setInFaro] = React.useState<boolean | null>(loggedIn ? null : false);
  React.useEffect(() => {
    if (!loggedIn) {
      setInFaro(false);
      return;
    }
    let alive = true;
    setInFaro(null);
    fetch(`/api/profile-history?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((b) => {
        if (!alive) return;
        if (b.saved) setTracking({ saved: true, busy: false });
        setInFaro(!!b.saved);
      })
      .catch(() => alive && setInFaro(false));
    return () => {
      alive = false;
    };
  }, [loggedIn, username]);

  // Already seen this @ recently? Then skip the scene and go straight to the
  // result. Decided after mount (storage is client-only) and before anything
  // is drawn, so a revisit never flashes the pink screen.
  const [joined, setJoined] = React.useState<string | null>(null);
  const [searchedEnough, setSearchedEnough] = React.useState(false);
  const [intro, setIntro] = React.useState<"pending" | "play" | "skip">("pending");
  React.useEffect(() => {
    setIntro("pending");
    if (wasSeenRecently(username)) {
      setIntro("skip");
      return;
    }
    // Profiles in the Faro open straight away — you already farejou this one,
    // and the Faro reads it every day anyway.
    if (inFaro === true) {
      setIntro("skip");
      return;
    }
    if (inFaro === false) {
      setIntro("play");
      return;
    }
    // Still asking: start the scene anyway if the answer takes too long, so a
    // slow database never leaves the page blank.
    const id = window.setTimeout(() => setIntro("play"), 900);
    return () => window.clearTimeout(id);
  }, [username, inFaro]);

  // Remember it once the scene has played through to the result. Only then:
  // a skipped revisit must not push the 24h window forward, or someone coming
  // back every day would never see a fresh search play again.
  React.useEffect(() => {
    if (intro === "play" && !analyzing && state.kind === "ok") markSeen(username);
  }, [intro, analyzing, state.kind, username]);

  // Faro searching: the lines cycle while the provider is still answering. The
  // scene no longer runs on a fixed clock — it ends when the profile arrives.
  React.useEffect(() => {
    if (intro !== "play") {
      if (intro === "skip") setAnalyzing(false);
      return;
    }
    setStep(0);
    setAnalyzing(true);
    setSearchedEnough(false);
    const floor = window.setTimeout(() => setSearchedEnough(true), MIN_SEARCH_MS);
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % LOADING_LINES.length;
      setStep(i);
    }, STEP_MS);
    return () => {
      clearInterval(id);
      window.clearTimeout(floor);
    };
  }, [intro, username]);

  // The profile is in: hand the loading screen over to the reveal. The real
  // picture only ever exists from here on.
  const reveal: RevealProfile | null =
    intro === "play" && analyzing && searchedEnough && state.kind === "ok"
      ? {
          username: state.data.username,
          displayName: state.data.displayName,
          avatarUrl: state.data.avatarUrl,
          isPrivate: state.data.isPrivate,
          joined,
        }
      : null;

  // "No Instagram desde…" — only when it is already cached, so the reveal never
  // costs a provider request of its own.
  React.useEffect(() => {
    if (intro !== "play" || state.kind !== "ok") return;
    let alive = true;
    fetch(`/api/raio-x?username=${encodeURIComponent(username)}&section=about&cached=1`)
      .then((r) => r.json())
      .then((b) => {
        const j = b?.status === "ok" ? b.data?.about?.joined : null;
        // Free visitors get it masked; a row of dots is not worth showing.
        if (alive && typeof j === "string" && !j.includes("•")) setJoined(j);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [intro, state.kind, username]);

  // A missing @ has nothing to reveal — but Faro still gets his moment of
  // searching before giving up, or the pink screen just blinks.
  React.useEffect(() => {
    if (state.kind === "error" && (searchedEnough || intro !== "play")) setAnalyzing(false);
  }, [state.kind, searchedEnough, intro]);

  React.useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    const minimal: HeroProfile = {
      username,
      displayName: null,
      avatarUrl: null,
      bio: null,
      isVerified: false,
      isPrivate: false,
      followersCount: 0,
      followingCount: 0,
      analyzedAt: null,
    };
    (async () => {
      try {
        const res = await fetch(`/api/profile-preview?username=${encodeURIComponent(username)}`);
        if (!alive) return;
        if (res.ok) setState({ kind: "ok", data: await res.json() });
        else if (res.status === 404) setState({ kind: "error" });
        else if (res.status === 402) {
          const b = await res.json().catch(() => ({}));
          setState({ kind: "limited", spentOn: b.spentOn ?? null });
        }
        else if (res.status === 429)
          setState({
            kind: "ok",
            data: minimal,
            note: "Limite de análises de hoje atingido. Tente novamente mais tarde.",
          });
        else
          setState({
            kind: "ok",
            data: minimal,
            note: "Não foi possível carregar os dados do perfil agora.",
          });
      } catch {
        if (alive)
          setState({
            kind: "ok",
            data: minimal,
            note: "Não foi possível carregar os dados do perfil agora.",
          });
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  // Nothing to analyse if the free analysis is spent.
  React.useEffect(() => {
    if (state.kind === "limited") setAnalyzing(false);
  }, [state.kind]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/interactions?username=${encodeURIComponent(username)}`);
        const b = await r.json();
        if (alive) setInteractions({ locked: !!b.locked, items: b.items ?? [] });
      } catch {
        /* stays locked */
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  React.useEffect(() => {
    let alive = true;
    setFollowing({ kind: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/following-preview?username=${encodeURIComponent(username)}`);
        if (!alive) return;
        const body = await res.json();
        if (res.status === 402 || body.limited) {
          setState({ kind: "limited", spentOn: body.spentOn ?? null });
          return;
        }
        if (body.private) {
          setFollowing({ kind: "private" });
          return;
        }
        setFollowing({
          kind: "ready",
          locked: !!body.locked || !body.real,
          access: body.real ? (body.access ?? (body.locked ? "free" : "pro")) : "free",
          users: body.following ?? [],
          real: !!body.real,
          counts: body.counts,
          recent: body.recent,
        });
      } catch {
        if (alive)
          setFollowing({ kind: "ready", locked: true, access: "free", users: [], real: false });
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  const ready = following.kind === "ready" ? following : null;
  const paid = !!ready && !ready.locked;
  // Pro features (Faro, history, extras) need a subscription — a one-off
  // unlock only reveals this profile.
  const isPro = ready?.access === "pro";

  async function startTracking() {
    if (!loggedIn) {
      router.push(`/signup?next=${encodeURIComponent(`/p/${username}`)}`);
      return;
    }
    // Not a subscriber: this is the Pro moment, not an error.
    if (!isPro) {
      setUpsell(true);
      return;
    }
    setTracking({ saved: false, busy: true });
    try {
      const r = await fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (r.status === 402) {
        setTracking({ saved: false, busy: false });
        setUpsell(true);
        return;
      }
      setTracking({ saved: r.ok, busy: false });
      if (r.ok) {
        setJustPinned(true);
        // Takes the baseline from the page already cached — no provider cost.
        fetch(`/api/following-preview?username=${encodeURIComponent(username)}`).catch(() => {});
      }
    } catch {
      setTracking({ saved: false, busy: false });
    }
  }

  const locked = !paid;
  const topInteraction = interactions.items[0] ?? ready?.users[0];
  const others = interactions.items.length > 1 ? interactions.items.slice(1) : ready?.users ?? [];

  return (
    <>
      {loggedIn && <AppNav />}
      {/* Clip at the SCREEN edge, not the content column: Faro peeks out beside
          the card, and clipping at the column cut him down to a sliver. */}
      <div className="overflow-x-clip">
      <main className={`mx-auto max-w-5xl px-6 py-8 ${loggedIn ? "md:pl-[15.5rem]" : ""}`}>
        {/* Tighter when the profile shows: Faro's peeking area sits just below. */}
        <div
          className={`flex items-center justify-between ${
            !analyzing && state.kind === "ok" ? "mb-2" : "mb-8"
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          {!loggedIn && <Logo className="h-6" />}
        </div>

        {intro === "play" && (analyzing || state.kind === "loading") && (
          <AnalysisLoading
            step={step}
            steps={STEPS}
            username={username}
            reveal={reveal}
            onRevealDone={() => setAnalyzing(false)}
          />
        )}

        {/* Revisit: no scene, just a quick beat while the (cached) data arrives. */}
        {intro === "skip" && state.kind === "loading" && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <Mascot pose="lupa" className="h-16 text-vinho" bob />
            <p className="text-sm text-muted-foreground">Abrindo @{username}…</p>
          </div>
        )}

        {!analyzing && state.kind === "limited" && (
          <div className="mx-auto max-w-lg">
            <Panel>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Mascot pose="feliz" className="h-20 text-vinho" bob />
                <h1 className="text-2xl font-bold">Sua análise gratuita já foi usada</h1>
                <p className="max-w-sm text-sm text-muted-foreground">
                  O plano grátis inclui <b>1 perfil</b>. Veja só este perfil com um pagamento
                  único, ou assine o PRO para farejar quantos quiser.
                </p>
                <SingleUnlockButton username={username} className="mt-2 w-full max-w-xs" />
                <Link
                  href={`/pricing?next=${encodeURIComponent(`/p/${username}`)}`}
                  className="w-full max-w-xs"
                >
                  <Button variant="outline" size="lg" className="w-full">
                    Conhecer o Farejo PRO <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                {state.spentOn && state.spentOn !== username && (
                  <Link
                    href={`/p/${encodeURIComponent(state.spentOn)}`}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    voltar para @{state.spentOn}
                  </Link>
                )}
                <Link
                  href={`/login?next=${encodeURIComponent(`/p/${username}`)}`}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  já é assinante? entrar
                </Link>
              </div>
            </Panel>
          </div>
        )}

        {!analyzing && state.kind === "error" && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Mascot pose="duvida" className="h-32 text-vinho" decorative />
            <p className="mt-2 max-w-sm text-lg font-bold">
              Não achei esse perfil. Confere o @ e tenta de novo.
            </p>
            <p className="text-sm text-muted-foreground">
              O Faro procurou, mas não existe nenhuma conta com o @{username}.
            </p>
            <Link href="/">
              <Button variant="outline" size="sm">
                Tentar outro @
              </Button>
            </Link>
          </div>
        )}

        {!analyzing && state.kind === "ok" && (
          <>
            {/* Profile found: Faro plays peek-a-boo around the card. */}
            <PeekingFaro>
              <ProfileHero
                profile={state.data}
                premium={isPro}
                tier={ready?.access ?? "free"}
                note={state.note}
                tracking={tracking}
                locked={!isPro}
                onTrack={following.kind === "private" ? undefined : startTracking}
              />
            </PeekingFaro>

            {justPinned && (
              <NoteBox className="mt-4 items-center" icon={<Mascot pose="feliz" className="h-10 text-ink" decorative />}>
                <p className="font-bold">@{state.data.username} está no seu Faro. 🐶</p>
                <p className="text-sm opacity-80">
                  A partir de agora você receberá alertas sobre as mudanças disponíveis nesse
                  perfil.
                </p>
              </NoteBox>
            )}

            <FaroUpsell open={upsell} onClose={() => setUpsell(false)} next={`/p/${username}`} />

            {following.kind === "private" ? (
              <Panel className="mt-6">
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Mascot pose="duvida" className="h-28 text-vinho" decorative />
                  <p className="mt-1 max-w-sm text-lg font-bold">
                    Encontrei o perfil, mas não consigo farejar além daqui.
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    O Instagram só mostra quem uma conta privada segue para os seguidores aprovados
                    dela. Não é possível analisar @{state.data.username}.
                  </p>
                  <Link href="/" className="mt-2">
                    <Button variant="outline" size="sm">
                      Buscar outro @
                    </Button>
                  </Link>
                </div>
              </Panel>
            ) : (
              <>
                <p className="mt-6 text-lg font-bold">{BRAND.phrases.achamosUmRastro} 👀</p>
                {/* No celular, a roda do iPhone: arrasta para escolher o que ver.
                    No computador, as pílulas continuam — roda com mouse é ruim. */}
                <div className="mt-3 rounded-2xl border border-plum/10 bg-white px-3 py-1 sm:hidden">
                  <WheelPicker
                    options={TABS}
                    value={tab}
                    onChange={setTab}
                    aria-label="O que você quer ver"
                  />
                </div>
                <Chips options={TABS} value={tab} onChange={setTab} className="mt-3 hidden sm:flex" />

                {tab === "visao" && (
                  <div className="mt-5 space-y-5">
                    <div className="grid gap-5 lg:grid-cols-2">
                      <FollowsBreakdown
                        counts={ready?.counts}
                        locked={locked}
                        username={state.data.username}
                      />
                      <TopInteraction
                        person={topInteraction}
                        locked={locked}
                        username={state.data.username}
                      />
                    </div>
                    <OtherInteractions
                      people={others}
                      locked={locked}
                      username={state.data.username}
                    />
                    {locked && <UpgradeCard username={state.data.username} />}
                  </div>
                )}

                {tab === "seguindo" && (
                  <div className="mt-5">
                    <Panel title="Novos seguindo">
                      <p className="-mt-1 mb-3 text-[11px] text-muted-foreground">
                        Perfis que @{state.data.username} começou a seguir recentemente. Apenas
                        pessoas reais — contas verificadas e de marcas ficam de fora.
                      </p>
                      {following.kind === "loading" ? (
                        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Analisando…
                        </div>
                      ) : ready && ready.users.length > 0 ? (
                        <ul className="divide-y divide-border">
                          {ready.users.map((u, i) => (
                            <li key={u.username + i}>
                              <PersonRow
                                username={u.username}
                                displayName={u.displayName}
                                avatarUrl={u.avatarUrl}
                                blurred={locked}
                                right={
                                  <div className="flex items-center gap-2">
                                    {u.isVerified && !locked && (
                                      <BadgeCheck className="h-4 w-4 text-[#3897F0]" />
                                    )}
                                    <GenderBadge gender={u.gender} />
                                  </div>
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          Nada encontrado nesta leitura.
                        </p>
                      )}
                    </Panel>
                    {locked && (
                      <div className="mt-5">
                        <UpgradeCard username={state.data.username} />
                      </div>
                    )}
                  </div>
                )}

                {tab === "interacoes" && (
                  <div className="mt-5">
                    {paid && ready ? (
                      <ProDashboard
                        username={state.data.username}
                        displayName={state.data.displayName}
                        avatarUrl={state.data.avatarUrl}
                        followersCount={state.data.followersCount}
                        followingCount={state.data.followingCount}
                        counts={ready.counts}
                        interactions={interactions.items}
                        following={ready.users}
                        recent={ready.recent}
                        loggedIn={loggedIn}
                        showHistory={false}
                        proExtras={isPro}
                      />
                    ) : (
                      <div className="space-y-5">
                        <OtherInteractions
                          people={others}
                          locked
                          username={state.data.username}
                        />
                        <UpgradeCard username={state.data.username} />
                      </div>
                    )}
                  </div>
                )}

                {isRaioX(tab) && (
                  <div className="mt-5">
                    <RaioX
                      key={tab}
                      username={state.data.username}
                      section={tab}
                      upgrade={<UpgradeCard username={state.data.username} />}
                    />
                  </div>
                )}

                {tab === "historico" && (
                  <div className="mt-5">
                    <HistoryPanel username={state.data.username} loggedIn={loggedIn} isPro={isPro} />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
      </div>
      {loggedIn && <NavSpacer />}
    </>
  );
}
