"use client";

import * as React from "react";
import {
  Crown, Heart, Loader2, MessageCircle, Sparkles, Trash2, UserMinus, UserPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HistoryPanel } from "@/components/history-panel";

export interface ProPerson {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  gender?: "f" | "m" | "u";
  count?: number;
}

export interface ProRecent extends ProPerson {
  detectedAt: string;
}

export interface ProActivity {
  liked: ProRecent[];
  unliked: ProRecent[];
  commented: ProRecent[];
  deletedComment: ProRecent[];
}

interface Props {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followersCount: number;
  followingCount: number;
  counts?: { girls: number; boys: number };
  interactions: ProPerson[];
  following: ProPerson[];
  recent?: { started: ProRecent[]; stopped: ProRecent[] };
  loggedIn: boolean;
}

function ago(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "";
  }
}

function genderLabel(g?: "f" | "m" | "u") {
  if (g === "f") return { text: "Menina", cls: "border-pink-400/50 bg-pink-100 text-pink-700" };
  if (g === "m") return { text: "Menino", cls: "border-blue-400/50 bg-blue-100 text-blue-700" };
  return { text: "—", cls: "border-border bg-muted text-muted-foreground" };
}

const PODIUM = [
  { ring: "border-amber-400/70", badge: "bg-amber-400 text-black", label: "1" },
  { ring: "border-zinc-400/70", badge: "bg-zinc-400 text-white", label: "2" },
  { ring: "border-orange-700/60", badge: "bg-orange-700 text-white", label: "3" },
];

function PodiumCard({ person, rank }: { person: ProPerson; rank: number }) {
  const style = PODIUM[rank] ?? PODIUM[2];
  const g = genderLabel(person.gender);
  return (
    <div className={`rounded-2xl border-2 bg-card p-4 ${style.ring}`}>
      <div className="flex items-center justify-between">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${style.badge}`}
        >
          {style.label}
        </span>
        {rank === 0 && <Crown className="h-5 w-5 text-amber-400" aria-hidden />}
      </div>

      <div className="mt-3 flex flex-col items-center text-center">
        <Avatar src={person.avatarUrl} name={person.displayName ?? person.username} size={56} />
        <span className="mt-2 w-full truncate text-sm font-semibold">
          {person.displayName ?? person.username}
        </span>
        <span className="w-full truncate text-xs text-muted-foreground">@{person.username}</span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-2 border-t border-border pt-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Interações</p>
          <p className="text-lg font-bold leading-tight tabular-nums">{person.count ?? 0}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${g.cls}`}>
          {g.text}
        </span>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  action,
  className = "",
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card ${className}`}>
      <header className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Icon className="h-4 w-4 text-accent" />
        <h2 className="font-semibold">{title}</h2>
        <span className="ml-auto">{action}</span>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function PersonRow({ p, right }: { p: ProPerson; right?: React.ReactNode }) {
  const g = genderLabel(p.gender);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar src={p.avatarUrl} name={p.displayName ?? p.username} size={36} />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">@{p.username}</span>
        {p.displayName && (
          <span className="block truncate text-xs text-muted-foreground">{p.displayName}</span>
        )}
      </div>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${g.cls}`}>{g.text}</span>
      {right}
    </li>
  );
}

function MiniColumn({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: React.ElementType;
  tone: string;
  items: ProRecent[];
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
              <Avatar src={u.avatarUrl} name={u.displayName ?? u.username} size={24} />
              <span className="min-w-0 flex-1 truncate text-xs">@{u.username}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{ago(u.detectedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProDashboard(props: Props) {
  const { username, counts, interactions, following, recent } = props;
  const top3 = interactions.slice(0, 3);
  const base = interactions.length ? interactions : following;

  // Filter: todos / mulheres / homens (automatic estimate, so "todos" is default).
  const [filter, setFilter] = React.useState<"all" | "f" | "m">("all");
  const ranking = filter === "all" ? base : base.filter((p) => p.gender === filter);

  // Expensive extras load only when asked — keeps provider credits low.
  const [firsts, setFirsts] = React.useState<{ state: "idle" | "loading" | "done"; items: ProPerson[] }>({
    state: "idle",
    items: [],
  });
  const [activity, setActivity] = React.useState<{
    state: "idle" | "loading" | "done";
    data: ProActivity;
  }>({ state: "idle", data: { liked: [], unliked: [], commented: [], deletedComment: [] } });

  async function loadFirsts() {
    setFirsts((f) => ({ ...f, state: "loading" }));
    try {
      const r = await fetch(`/api/first-follows?username=${encodeURIComponent(username)}`);
      const b = await r.json();
      setFirsts({ state: "done", items: b.items ?? [] });
    } catch {
      setFirsts({ state: "done", items: [] });
    }
  }

  async function loadActivity() {
    setActivity((a) => ({ ...a, state: "loading" }));
    try {
      const r = await fetch(`/api/post-activity?username=${encodeURIComponent(username)}`);
      const b = await r.json();
      setActivity({ state: "done", data: b.activity ?? activity.data });
    } catch {
      setActivity((a) => ({ ...a, state: "done" }));
    }
  }

  return (
    <div>
      {top3.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Pódio de interações</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {top3.map((p, i) => (
              <PodiumCard key={p.username} person={p} rank={i} />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Com base em marcações, coautorias e menções nos posts recentes. Sem contas verificadas.
          </p>
        </>
      )}

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-3">
      <Section
        title="Ranking geral"
        icon={Sparkles}
        className="xl:col-span-2"
        action={
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
            {([
              ["all", "Todos"],
              ["f", "Mulheres"],
              ["m", "Homens"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  filter === key
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">#</th>
                <th className="pb-2 pr-3 font-medium">Pessoa</th>
                <th className="pb-2 pr-3 font-medium">Perfil</th>
                <th className="pb-2 text-right font-medium">Interações</th>
              </tr>
            </thead>
            <tbody>
              {ranking.slice(0, 20).map((p, i) => {
                const g = genderLabel(p.gender);
                return (
                  <tr key={p.username + i} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={p.avatarUrl} name={p.displayName ?? p.username} size={30} />
                        <div className="min-w-0">
                          <span className="block truncate font-medium">@{p.username}</span>
                          {p.displayName && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {p.displayName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${g.cls}`}>
                        {g.text}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{p.count ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {ranking.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Nenhum perfil nesta categoria. A classificação é automática pelo nome e pode conter
            erros.
          </p>
        )}
      </Section>

      <div className="space-y-6">
      {recent && (recent.started.length > 0 || recent.stopped.length > 0) && (
        <Section title="Novos seguindo" icon={UserPlus}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <MiniColumn title="Novos seguindo" icon={UserPlus} tone="text-success" items={recent.started} />
            <MiniColumn title="Deixou de seguir" icon={UserMinus} tone="text-destructive" items={recent.stopped} />
          </div>
        </Section>
      )}

      <Section
        title="Primeiras contas que seguiu"
        icon={UserPlus}
        action={
          firsts.state === "idle" ? (
            <Button size="sm" variant="outline" onClick={loadFirsts}>
              Analisar
            </Button>
          ) : firsts.state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null
        }
      >
        {firsts.state === "idle" ? (
          <p className="text-xs text-muted-foreground">
            Do começo da conta — normalmente as pessoas mais próximas. Clique em Analisar (consome
            créditos apenas quando você pede).
          </p>
        ) : firsts.state === "loading" ? (
          <p className="text-xs text-muted-foreground">Percorrendo a lista…</p>
        ) : firsts.items.length ? (
          <ul className="divide-y divide-border">
            {firsts.items.map((p, i) => (
              <PersonRow key={p.username + i} p={p} />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Nada encontrado.</p>
        )}
      </Section>

      <Section
        title="Atividade nos posts"
        icon={Heart}
        action={
          activity.state === "idle" ? (
            <Button size="sm" variant="outline" onClick={loadActivity}>
              Analisar
            </Button>
          ) : activity.state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null
        }
      >
        {activity.state === "idle" ? (
          <p className="text-xs text-muted-foreground">
            Quem curtiu, descurtiu, comentou ou apagou comentário no post mais recente. Clique em
            Analisar.
          </p>
        ) : activity.state === "loading" ? (
          <p className="text-xs text-muted-foreground">Lendo curtidas e comentários…</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniColumn title="Curtiram" icon={Heart} tone="text-success" items={activity.data.liked} />
              <MiniColumn title="Descurtiram" icon={Heart} tone="text-destructive" items={activity.data.unliked} />
              <MiniColumn title="Comentaram" icon={MessageCircle} tone="text-accent" items={activity.data.commented} />
              <MiniColumn title="Apagaram comentário" icon={Trash2} tone="text-destructive" items={activity.data.deletedComment} />
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              A primeira leitura é o marco zero — as mudanças aparecem na próxima análise.
            </p>
          </>
        )}
      </Section>

      <HistoryPanel username={username} loggedIn={props.loggedIn} />
      </div>
      </div>
    </div>
  );
}
