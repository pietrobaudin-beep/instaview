"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, ArrowLeft, BadgeCheck, Check, Lock, Loader2, UserMinus, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  followingCount: number;
}

interface FollowUser {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  gender?: "f" | "m" | "u";
}

// Fake but realistic-looking rows for the blurred (free) teaser.
const FAKE: FollowUser[] = [
  { username: "lucas.silva", displayName: "Lucas Silva", avatarUrl: null, isVerified: false, gender: "m" },
  { username: "amanda_souza", displayName: "Amanda Souza", avatarUrl: null, isVerified: true, gender: "f" },
  { username: "joao.pedro", displayName: "João Pedro", avatarUrl: null, isVerified: false, gender: "m" },
  { username: "marina.costa", displayName: "Marina Costa", avatarUrl: null, isVerified: false, gender: "f" },
  { username: "rafa.dev", displayName: "Rafael Alves", avatarUrl: null, isVerified: false, gender: "m" },
  { username: "bia.santos", displayName: "Beatriz Santos", avatarUrl: null, isVerified: true, gender: "f" },
  { username: "th.ferreira", displayName: "Thiago Ferreira", avatarUrl: null, isVerified: false, gender: "m" },
  { username: "carol.m", displayName: "Carolina Melo", avatarUrl: null, isVerified: false, gender: "f" },
  { username: "gab.rocha", displayName: "Gabriel Rocha", avatarUrl: null, isVerified: false, gender: "m" },
  { username: "duda.lima", displayName: "Eduarda Lima", avatarUrl: null, isVerified: false, gender: "f" },
];

const STEPS = [
  "Conectando ao servidor seguro…",
  "Analisando dados do perfil…",
  "Configurando rotas com o Instagram…",
  "Processando seguidores…",
  "Finalizando análise…",
];

function GenderBadge({ gender }: { gender?: "f" | "m" | "u" }) {
  if (gender === "f")
    return (
      <span className="shrink-0 rounded-full border border-pink-500/40 bg-pink-500/15 px-2 py-0.5 text-[11px] font-medium text-pink-300">
        👩 Menina
      </span>
    );
  if (gender === "m")
    return (
      <span className="shrink-0 rounded-full border border-blue-500/40 bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-300">
        👨 Menino
      </span>
    );
  return null;
}

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
      <GenderBadge gender={u.gender} />
    </li>
  );
}

/** Censored row: real (blurred) photo + hidden name + visible gender tag. */
function LockedRow({ u }: { u: FollowUser }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="shrink-0 blur-[5px]">
        <Avatar src={u.avatarUrl} name={u.username} size={40} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5" aria-hidden>
        <div className="h-3 w-28 max-w-full rounded bg-muted" />
        <div className="h-2.5 w-20 max-w-full rounded bg-muted/60" />
      </div>
      <GenderBadge gender={u.gender} />
    </li>
  );
}

interface RecentItem extends FollowUser {
  detectedAt: string;
}

function ago(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "";
  }
}

/** "Seguiu recentemente" / "Deixou de seguir" — last 5, revealed only when paid. */
function RecentSection({
  title,
  tone,
  items,
  locked,
}: {
  title: string;
  tone: "green" | "red";
  items: RecentItem[];
  locked: boolean;
}) {
  if (!items.length) return null;
  const Icon = tone === "green" ? UserPlus : UserMinus;
  return (
    <Card className="mt-4">
      <CardContent className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <Icon className={`h-4 w-4 ${tone === "green" ? "text-success" : "text-destructive"}`} />
          <h2 className="font-semibold">{title}</h2>
        </div>
        <ul className="divide-y divide-border">
          {items.map((u, i) => (
            <li key={u.username + i} className="flex items-center gap-3 py-2.5">
              <div className={locked ? "shrink-0 blur-[5px]" : "shrink-0"}>
                <Avatar src={u.avatarUrl} name={u.displayName ?? u.username} size={36} />
              </div>
              <div className="min-w-0 flex-1">
                {locked ? (
                  <div className="space-y-1.5" aria-hidden>
                    <div className="h-3 w-24 max-w-full rounded bg-muted" />
                    <div className="h-2.5 w-16 max-w-full rounded bg-muted/60" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">@{u.username}</span>
                      {u.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-accent" />}
                    </div>
                    {u.displayName && (
                      <p className="truncate text-sm text-muted-foreground">{u.displayName}</p>
                    )}
                  </>
                )}
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{ago(u.detectedAt)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function StatChip({
  tone,
  emoji,
  label,
  value,
}: {
  tone: "pink" | "blue";
  emoji: string;
  label: string;
  value: number;
}) {
  const bg = tone === "pink" ? "bg-pink-500/15 border-pink-500/30" : "bg-blue-500/15 border-blue-500/30";
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border p-3 ${bg}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-lg">
        {emoji}
      </span>
      <div className="min-w-0">
        <div className="text-lg font-bold leading-none tabular-nums">{formatNumber(value)}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function ProfileView({ username }: { username: string }) {
  const [state, setState] = React.useState<
    { kind: "loading" } | { kind: "ok"; data: Preview; note?: string } | { kind: "error"; code: string }
  >({ kind: "loading" });
  const [following, setFollowing] = React.useState<
    | { kind: "loading" }
    | { kind: "private" }
    | {
        kind: "ready";
        locked: boolean;
        users: FollowUser[];
        real: boolean;
        counts?: { girls: number; boys: number };
        recent?: { started: RecentItem[]; stopped: RecentItem[] };
      }
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
    }, 3300);
    return () => clearInterval(id);
  }, [username]);

  React.useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    const minimal: Preview = {
      username, displayName: null, avatarUrl: null, isVerified: false, isPrivate: false,
      followersCount: 0, followingCount: 0,
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
        if (body.private) {
          setFollowing({ kind: "private" });
          return;
        }
        // Real accounts (blurred when locked); fall back to placeholders if the
        // provider can't return following (e.g. not on HikerAPI yet).
        const users: FollowUser[] = body.following?.length ? body.following : FAKE;
        setFollowing({
          kind: "ready",
          locked: !!body.locked || !body.real,
          users,
          real: !!body.real,
          counts: body.counts,
          recent: body.recent,
        });
      } catch {
        if (alive) setFollowing({ kind: "ready", locked: true, users: FAKE, real: false });
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

              {following.kind === "ready" && following.real && following.counts && (
                <>
                  <div className="mb-1.5 grid grid-cols-2 gap-3">
                    <StatChip tone="pink" emoji="👩" label="Meninas" value={following.counts.girls} />
                    <StatChip tone="blue" emoji="👨" label="Meninos" value={following.counts.boys} />
                  </div>
                  <p className="mb-4 text-[11px] text-muted-foreground">
                    Estimativa pelo nome, com base nas contas que seguiu recentemente.
                  </p>
                </>
              )}

              {following.kind === "loading" && (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analisando…
                </div>
              )}

              {following.kind === "private" && (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/40 p-6 text-center">
                  <Lock className="h-6 w-6 text-muted-foreground" />
                  <p className="font-semibold">Esta conta é privada</p>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    O Instagram só mostra quem uma conta privada segue para os seguidores aprovados
                    dela. Não é possível analisar @{state.data.username}.
                  </p>
                  <Link href="/"><Button variant="outline" size="sm">Buscar outro @</Button></Link>
                </div>
              )}

              {following.kind === "ready" && !following.locked && (
                <ul className="divide-y divide-border">
                  {following.users.map((u) => <Row key={u.username} u={u} />)}
                </ul>
              )}

              {following.kind === "ready" && following.locked && (
                <>
                  {/* Censored list: real blurred photos + visible gender tags. */}
                  <ul className="divide-y divide-border">
                    {following.users.map((u, i) => (
                      <LockedRow key={u.username + i} u={u} />
                    ))}
                  </ul>

                  {/* CTA right below the list. */}
                  <div className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <Lock className="h-5 w-5" />
                    </div>
                    <p className="font-semibold">Veja quem @{state.data.username} anda seguindo</p>
                    <ul className="mx-auto mt-3 max-w-[280px] space-y-1.5 text-left text-sm">
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
                    <Link
                      href={`/pricing?next=${encodeURIComponent(`/p/${state.data.username}`)}`}
                      className="mt-4 block"
                    >
                      <Button variant="accent" className="w-full">
                        <Lock className="h-4 w-4" /> Ver sem censura
                      </Button>
                    </Link>
                    <Link
                      href={`/login?next=${encodeURIComponent(`/p/${state.data.username}`)}`}
                      className="mt-2 inline-block text-xs text-muted-foreground hover:text-foreground"
                    >
                      já é assinante? entrar
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {following.kind === "ready" && following.recent && (
            <>
              <RecentSection
                title="Seguiu recentemente"
                tone="green"
                items={following.recent.started}
                locked={following.locked}
              />
              <RecentSection
                title="Deixou de seguir"
                tone="red"
                items={following.recent.stopped}
                locked={following.locked}
              />
              {!following.recent.started.length && !following.recent.stopped.length && (
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Primeira análise salva. Volte mais tarde para ver quem @{state.data.username}
                  {" "}seguiu ou deixou de seguir desde agora.
                </p>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
