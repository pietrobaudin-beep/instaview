"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity, ArrowLeft, BadgeCheck, Check, Heart, Lock, Loader2, MessageCircle, Sparkles,
  Trash2, UserMinus, UserPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar } from "@/components/ui/avatar";
import { ProDashboard } from "@/components/pro-dashboard";
import { ProfileHeader } from "@/components/profile-header";
import { HistoryPanel } from "@/components/history-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

interface Preview {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  analyzedAt?: string | null;
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
      <span className="shrink-0 rounded-full border border-pink-400/50 bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-700">
        👩 Menina
      </span>
    );
  if (gender === "m")
    return (
      <span className="shrink-0 rounded-full border border-blue-400/50 bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
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

interface Interaction extends FollowUser {
  count: number;
}

/** Premium section: who the profile interacts with most (PRO). */
function InteractionSection({
  items,
  fallback,
  locked,
}: {
  items: Interaction[];
  fallback: FollowUser[];
  locked: boolean;
}) {
  const rows: (FollowUser & { count?: number })[] = locked ? fallback.slice(0, 5) : items;
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.count ?? 1), 1);

  return (
    <Card className="mt-4 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--pink))] via-accent to-[hsl(var(--maroon))]" />
      <CardContent className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="font-semibold">Com quem mais interage</h2>
          <span className="ml-auto rounded-full bg-[#FFD84D] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[hsl(var(--maroon))]">
            PRO
          </span>
        </div>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Com base em marcações, coautorias e menções nos posts recentes.
        </p>
        <ol className="space-y-2.5">
          {rows.map((u, i) => (
            <li
              key={u.username + i}
              className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                !locked && i === 0 ? "border-accent/50 bg-accent/5" : "border-border bg-muted/20"
              }`}
            >
              <span className="w-5 shrink-0 text-center text-sm font-bold text-muted-foreground">
                {i + 1}
              </span>
              <div className={locked ? "shrink-0 blur-[5px]" : "shrink-0"}>
                <Avatar src={u.avatarUrl} name={u.displayName ?? u.username} size={40} />
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
                      <p className="truncate text-xs text-muted-foreground">{u.displayName}</p>
                    )}
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.round(((u.count ?? 1) / max) * 100)}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
              <GenderBadge gender={u.gender} />
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

interface ActivityItem {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  detectedAt: string;
}

interface PostActivity {
  liked: ActivityItem[];
  unliked: ActivityItem[];
  commented: ActivityItem[];
  deletedComment: ActivityItem[];
}

function MiniList({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: React.ElementType;
  tone: string;
  items: ActivityItem[];
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${tone}`} />
        <span className="text-xs font-semibold">{title}</span>
        <span className="ml-auto text-[11px] text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-2 text-center text-[11px] text-muted-foreground">Nada ainda</p>
      ) : (
        <ul className="space-y-2">
          {items.map((u, i) => (
            <li key={u.username + i} className="flex items-center gap-2">
              <Avatar src={u.avatarUrl} name={u.displayName ?? u.username} size={26} />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">@{u.username}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{ago(u.detectedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** PRO-only: likes/unlikes and comments/deletions on the newest posts. */
function ActivityCard({ activity }: { activity: PostActivity }) {
  const total =
    activity.liked.length + activity.unliked.length +
    activity.commented.length + activity.deletedComment.length;
  return (
    <Card className="mt-4 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--pink))] via-accent to-[hsl(var(--maroon))]" />
      <CardContent className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <Heart className="h-4 w-4 text-accent" />
          <h2 className="font-semibold">Atividade nos posts</h2>
          <span className="ml-auto rounded-full bg-[#FFD84D] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--maroon))]">
            PRO
          </span>
        </div>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Curtidas e comentários nos 3 posts mais recentes, comparados com a leitura anterior.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <MiniList title="Curtiram" icon={Heart} tone="text-success" items={activity.liked} />
          <MiniList title="Descurtiram" icon={Heart} tone="text-destructive" items={activity.unliked} />
          <MiniList title="Comentaram" icon={MessageCircle} tone="text-accent" items={activity.commented} />
          <MiniList title="Apagaram comentário" icon={Trash2} tone="text-destructive" items={activity.deletedComment} />
        </div>
        {total === 0 && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Primeira leitura salva. As mudanças aparecem na próxima checagem.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ProfileView({ username, loggedIn }: { username: string; loggedIn: boolean }) {
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
  const [interactions, setInteractions] = React.useState<{ locked: boolean; items: Interaction[] }>({
    locked: true,
    items: [],
  });
  const [activity, setActivity] = React.useState<{ locked: boolean; data: PostActivity }>({
    locked: true,
    data: { liked: [], unliked: [], commented: [], deletedComment: [] },
  });
  const [firstFollows, setFirstFollows] = React.useState<{ locked: boolean; items: FollowUser[] }>({
    locked: true,
    items: [],
  });
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
      username, displayName: null, avatarUrl: null, bio: null, isVerified: false, isPrivate: false,
      followersCount: 0, followingCount: 0, analyzedAt: null,
    };
    (async () => {
      try {
        const res = await fetch(`/api/profile-preview?username=${encodeURIComponent(username)}`);
        if (!alive) return;
        if (res.ok) setState({ kind: "ok", data: await res.json() });
        else if (res.status === 404) setState({ kind: "error", code: "not_found" });
        else if (res.status === 429)
          setState({ kind: "ok", data: minimal, note: "Limite de análises de hoje atingido. Tente novamente mais tarde." });
        else setState({ kind: "ok", data: minimal, note: "Não foi possível carregar os dados do perfil agora." });
      } catch {
        if (alive) setState({ kind: "ok", data: minimal, note: "Não foi possível carregar os dados do perfil agora." });
      }
    })();
    return () => { alive = false; };
  }, [username]);



  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/interactions?username=${encodeURIComponent(username)}`);
        const b = await r.json();
        if (alive) setInteractions({ locked: !!b.locked, items: b.items ?? [] });
      } catch {
        /* keep locked */
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

  const wide = following.kind === "ready" && !following.locked;

  return (
    <main className={`mx-auto px-6 py-8 ${wide ? "max-w-7xl" : "max-w-lg"}`}>
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Logo className="h-5" />
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
          <p className="font-medium">@{username} não foi encontrado</p>
          <Link href="/"><Button variant="outline" size="sm">Tentar outro @</Button></Link>
        </div>
      )}

      {!analyzing && state.kind === "ok" && (
        <>
          <ProfileHeader
            profile={state.data}
            counts={following.kind === "ready" ? following.counts : undefined}
            premium={following.kind === "ready" && !following.locked}
            note={state.note}
            wide={wide}
          />

          {following.kind === "ready" && !following.locked && (
            <ProDashboard
              username={state.data.username}
              displayName={state.data.displayName}
              avatarUrl={state.data.avatarUrl}
              followersCount={state.data.followersCount}
              followingCount={state.data.followingCount}
              counts={following.counts}
              interactions={interactions.items}
              following={following.users}
              recent={following.recent}
              loggedIn={loggedIn}
            />
          )}

          {(following.kind !== "ready" || following.locked) && (
          <Card className="mt-4">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-accent" />
                <h2 className="font-semibold">Novos seguindo</h2>
              </div>
              <p className="-mt-2 mb-4 text-[11px] text-muted-foreground">
                Perfis que @{state.data.username} começou a seguir recentemente. Apenas pessoas
                reais — contas verificadas e de marcas ficam de fora.
              </p>

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
          )}

          {following.kind === "ready" && following.locked && (
            <InteractionSection
              items={interactions.items}
              fallback={following.users}
              locked={interactions.locked || following.locked}
            />
          )}



          {following.kind === "ready" && following.locked && following.recent && (
            <>
              <RecentSection
                title="Novos seguindo"
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
            </>
          )}

          {/* PRO renders its own history inside the dashboard. */}
          {following.kind === "ready" && following.locked && (
            <HistoryPanel username={state.data.username} loggedIn={loggedIn} className="mt-4" />
          )}
        </>
      )}
    </main>
  );
}
