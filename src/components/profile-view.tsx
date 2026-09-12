"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, ArrowLeft, BadgeCheck, Check, Lock, Loader2, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

interface Preview {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  followersCount: number;
}

interface FollowUser {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

// Fake but realistic-looking rows for the blurred (free) teaser.
const FAKE: FollowUser[] = [
  { username: "lucas.silva", displayName: "Lucas Silva", avatarUrl: null, isVerified: false },
  { username: "amanda_souza", displayName: "Amanda Souza", avatarUrl: null, isVerified: true },
  { username: "joao.pedro", displayName: "João Pedro", avatarUrl: null, isVerified: false },
  { username: "marina.costa", displayName: "Marina Costa", avatarUrl: null, isVerified: false },
  { username: "rafa.dev", displayName: "Rafael Alves", avatarUrl: null, isVerified: false },
  { username: "bia.santos", displayName: "Beatriz Santos", avatarUrl: null, isVerified: true },
  { username: "th.ferreira", displayName: "Thiago Ferreira", avatarUrl: null, isVerified: false },
  { username: "carol.m", displayName: "Carolina Melo", avatarUrl: null, isVerified: false },
  { username: "gab.rocha", displayName: "Gabriel Rocha", avatarUrl: null, isVerified: false },
  { username: "duda.lima", displayName: "Eduarda Lima", avatarUrl: null, isVerified: false },
];

const STEPS = [
  "Conectando ao servidor seguro…",
  "Analisando dados do perfil…",
  "Configurando rotas com o Instagram…",
  "Verificando atividade recente…",
  "Processando seguidores…",
  "Finalizando análise…",
];

function Row({ u }: { u: FollowUser }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar src={u.avatarUrl} name={u.displayName ?? u.username} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">@{u.username}</span>
          {u.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-accent" />}
        </div>
        {u.displayName && <p className="truncate text-sm text-muted-foreground">{u.displayName}</p>}
      </div>
    </li>
  );
}

function CategoryChip({ tone, emoji, label }: { tone: "pink" | "blue"; emoji: string; label: string }) {
  const bg = tone === "pink" ? "bg-pink-500/15 border-pink-500/30" : "bg-blue-500/15 border-blue-500/30";
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border p-3 ${bg}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-lg">
        {emoji}
      </span>
      <span className="flex-1 font-semibold">{label}</span>
      <div className="flex items-center">
        <div className="flex -space-x-2 blur-[3px]" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-5 w-5 rounded-full border border-background bg-muted" />
          ))}
        </div>
        <Lock className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

export function ProfileView({ username }: { username: string }) {
  const [state, setState] = React.useState<
    { kind: "loading" } | { kind: "ok"; data: Preview; note?: string } | { kind: "error"; code: string }
  >({ kind: "loading" });
  const [following, setFollowing] = React.useState<
    { kind: "loading" } | { kind: "ready"; locked: boolean; users: FollowUser[] }
  >({ kind: "loading" });
  const [step, setStep] = React.useState(0);
  const [analyzing, setAnalyzing] = React.useState(true);

  // Staged "analysis" animation shown before the result (~5s).
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
    }, 850);
    return () => clearInterval(id);
  }, [username]);

  React.useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    const minimal: Preview = {
      username, displayName: null, avatarUrl: null, isVerified: false, isPrivate: false, followersCount: 0,
    };
    (async () => {
      try {
        const res = await fetch(`/api/profile-preview?username=${encodeURIComponent(username)}`);
        if (!alive) return;
        if (res.ok) setState({ kind: "ok", data: await res.json() });
        else if (res.status === 404) setState({ kind: "error", code: "not_found" });
        else if (res.status === 429)
          setState({ kind: "ok", data: minimal, note: "Free data limit reached today (resets 00:00 UTC)." });
        else setState({ kind: "ok", data: minimal, note: "Couldn't load the photo right now." });
      } catch {
        if (alive) setState({ kind: "ok", data: minimal, note: "Couldn't load the photo right now." });
      }
    })();
    return () => { alive = false; };
  }, [username]);

  React.useEffect(() => {
    let alive = true;
    setFollowing({ kind: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/following-preview?username=${encodeURIComponent(username)}`);
        if (!alive) return;
        const body = await res.json();
        // Real accounts (blurred when locked); fall back to placeholders if the
        // provider can't return following (e.g. not on HikerAPI yet).
        const users: FollowUser[] = body.following?.length ? body.following : FAKE;
        setFollowing({ kind: "ready", locked: !!body.locked || !body.real, users });
      } catch {
        if (alive) setFollowing({ kind: "ready", locked: true, users: FAKE });
      }
    })();
    return () => { alive = false; };
  }, [username]);

  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Activity className="h-4 w-4 text-accent" /> InstaView
        </div>
      </div>

      {(analyzing || state.kind === "loading") && (
        <div className="flex flex-col items-center gap-6 py-14">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-accent" />
            <Activity className="absolute inset-0 m-auto h-6 w-6 text-accent" />
          </div>
          <div className="w-full max-w-xs text-center">
            <p className="text-sm font-medium">{STEPS[step]}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
          <ul className="w-full max-w-xs space-y-2">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2 text-xs">
                {i < step ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                ) : i === step ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
                )}
                <span className={i <= step ? "text-muted-foreground" : "text-muted-foreground/40"}>
                  {s}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!analyzing && state.kind === "error" && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-medium">@{username} not found</p>
          <Link href="/"><Button variant="outline" size="sm">Try another @</Button></Link>
        </div>
      )}

      {!analyzing && state.kind === "ok" && (
        <>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <Avatar src={state.data.avatarUrl} name={state.data.displayName ?? state.data.username} size={72} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-xl font-semibold">@{state.data.username}</h1>
                  {state.data.isVerified && <BadgeCheck className="h-5 w-5 shrink-0 text-accent" />}
                </div>
                {state.data.displayName && (
                  <p className="truncate text-sm text-muted-foreground">{state.data.displayName}</p>
                )}
                {state.data.followersCount > 0 && (
                  <p className="mt-1 text-sm">
                    <b>{formatNumber(state.data.followersCount)}</b>{" "}
                    <span className="text-muted-foreground">followers</span>
                  </p>
                )}
                {state.note && <p className="mt-1 text-xs text-muted-foreground">{state.note}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-accent" />
                <h2 className="font-semibold">Contas que @{state.data.username} seguiu recentemente</h2>
              </div>

              {following.kind === "loading" && (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analisando…
                </div>
              )}

              {following.kind === "ready" && !following.locked && (
                <ul className="divide-y divide-border">
                  {following.users.map((u) => <Row key={u.username} u={u} />)}
                </ul>
              )}

              {following.kind === "ready" && following.locked && (
                <>
                  {/* Category chips — counts hidden (not fabricated) until unlock. */}
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <CategoryChip tone="pink" emoji="👩" label="Minas" />
                    <CategoryChip tone="blue" emoji="👨" label="Garotos" />
                  </div>

                  <div className="relative">
                    <ul className="divide-y divide-border select-none blur-[6px]" aria-hidden>
                      {following.users.map((u, i) => <Row key={u.username + i} u={u} />)}
                    </ul>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-background/30 to-background/95 p-6 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
                        <Lock className="h-5 w-5" />
                      </div>
                      <p className="font-semibold">Veja quem @{state.data.username} anda seguindo</p>
                      <ul className="space-y-1.5 text-left text-sm">
                        {[
                          "Descubra em segundos",
                          "Cancele quando quiser, sem compromisso",
                          "Alertas quando seguir alguém novo",
                        ].map((b) => (
                          <li key={b} className="flex items-center gap-2">
                            <Check className="h-4 w-4 shrink-0 text-success" />
                            <span className="text-muted-foreground">{b}</span>
                          </li>
                        ))}
                      </ul>
                      <Link href="/pricing" className="w-full max-w-[240px]">
                        <Button variant="accent" className="w-full">
                          <Lock className="h-4 w-4" /> Desbloquear agora
                        </Button>
                      </Link>
                      <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
                        já é assinante? entrar
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
