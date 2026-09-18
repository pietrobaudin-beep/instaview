"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Loader2, Lock } from "lucide-react";
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
import { AnalysisLoading } from "@/components/analysis-loading";
import { SniffingDog } from "@/components/ui/dog";

interface RecentItem extends Person {
  detectedAt: string;
}

const STEPS = [
  "conectando com o Instagram…",
  "atualizando os dados do perfil…",
  "farejando quem começou a seguir…",
  "separando pessoas de marcas…",
  "farejando o que interessa…",
];

const TABS = [
  { value: "visao", label: "Visão geral" },
  { value: "seguindo", label: "Seguindo" },
  { value: "interacoes", label: "Interações" },
  { value: "historico", label: "Histórico" },
] as const;

type Tab = (typeof TABS)[number]["value"];

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

/** The upgrade block shown to free visitors. */
function UpgradeCard({ username }: { username: string }) {
  return (
    <div className="rounded-3xl border-2 border-pink bg-pink/20 p-6 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink text-ink">
        <Lock className="h-5 w-5" />
      </span>
      <h2 className="text-lg font-extrabold">Desbloqueie o Farejo completo.</h2>
      <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm">
        {[
          "Quem começou a seguir, sem censura",
          "Quem deixou de seguir",
          "Interações em posts específicos",
          "Alertas quando algo novo acontecer",
        ].map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span className="text-foreground/80">{b}</span>
          </li>
        ))}
      </ul>
      <Link href={`/pricing?next=${encodeURIComponent(`/p/${username}`)}`} className="mt-5 block">
        <Button variant="accent" size="lg" className="w-full sm:w-auto">
          Desbloquear Pro <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <Link
        href={`/login?next=${encodeURIComponent(`/p/${username}`)}`}
        className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground"
      >
        já é assinante? entrar
      </Link>
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

  // Staged "analysis" animation shown before the result.
  React.useEffect(() => {
    setStep(0);
    setAnalyzing(true);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i >= STEPS.length) {
        clearInterval(id);
        setStep(STEPS.length - 1);
        setAnalyzing(false);
      } else {
        setStep(i);
      }
    }, 3300);
    return () => clearInterval(id);
  }, [username]);

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

  // Nothing to analyse if the profile is missing or the free analysis is spent.
  React.useEffect(() => {
    if (state.kind === "limited" || state.kind === "error") setAnalyzing(false);
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
          users: body.following ?? [],
          real: !!body.real,
          counts: body.counts,
          recent: body.recent,
        });
      } catch {
        if (alive)
          setFollowing({ kind: "ready", locked: true, users: [], real: false });
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  async function startTracking() {
    if (!loggedIn) {
      router.push(`/signup?next=${encodeURIComponent(`/p/${username}`)}`);
      return;
    }
    setTracking({ saved: false, busy: true });
    try {
      const r = await fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      setTracking({ saved: r.ok, busy: false });
    } catch {
      setTracking({ saved: false, busy: false });
    }
  }

  const ready = following.kind === "ready" ? following : null;
  const paid = !!ready && !ready.locked;
  const locked = !paid;
  const topInteraction = interactions.items[0] ?? ready?.users[0];
  const others = interactions.items.length > 1 ? interactions.items.slice(1) : ready?.users ?? [];

  return (
    <>
      {loggedIn && <AppNav />}
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          {!loggedIn && <Logo className="h-6" />}
        </div>

        {(analyzing || state.kind === "loading") && (
          <AnalysisLoading step={step} steps={STEPS} username={username} />
        )}

        {!analyzing && state.kind === "limited" && (
          <div className="mx-auto max-w-lg">
            <Panel>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <SniffingDog className="h-20 text-ink" animated />
                <h1 className="text-2xl font-bold">Sua análise gratuita já foi usada</h1>
                <p className="max-w-sm text-sm text-muted-foreground">
                  O plano grátis inclui <b>1 perfil</b>. Assine o Pro para farejar quantos perfis
                  quiser, sem censura.
                </p>
                <Link
                  href={`/pricing?next=${encodeURIComponent(`/p/${username}`)}`}
                  className="mt-2 w-full sm:w-auto"
                >
                  <Button variant="accent" size="lg" className="w-full">
                    Desbloquear Pro <ArrowRight className="h-4 w-4" />
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
            <p className="font-bold">@{username} não foi encontrado</p>
            <Link href="/">
              <Button variant="outline" size="sm">
                Tentar outro @
              </Button>
            </Link>
          </div>
        )}

        {!analyzing && state.kind === "ok" && (
          <>
            <ProfileHero
              profile={state.data}
              premium={paid}
              note={state.note}
              tracking={tracking}
              onTrack={following.kind === "private" ? undefined : startTracking}
            />

            {following.kind === "private" ? (
              <Panel className="mt-6">
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Lock className="h-7 w-7 text-muted-foreground" />
                  <p className="text-lg font-bold">Esta conta é privada</p>
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
                <Chips options={TABS} value={tab} onChange={setTab} className="mt-6" />

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

                {tab === "historico" && (
                  <div className="mt-5">
                    <HistoryPanel username={state.data.username} loggedIn={loggedIn} />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
      {loggedIn && <NavSpacer />}
    </>
  );
}
