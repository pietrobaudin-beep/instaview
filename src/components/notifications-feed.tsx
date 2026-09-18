"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar } from "@/components/ui/avatar";
import { Chips, Panel } from "@/components/ui/brand";
import { pistaHeadline, type PistaKind } from "@/lib/voice";
import { Mascot } from "@/components/ui/mascot";

export type NotificationAction =
  | "comecou_a_seguir"
  | "deixou_de_seguir"
  | "curtiu_post"
  | "descurtiu_post"
  | "comentou"
  | "apagou_comentario";

export interface Notification {
  id: string;
  /** The tracked profile the change was detected on. */
  subject: string;
  subjectAvatarUrl: string | null;
  action: NotificationAction;
  /** The other account involved. */
  target: string;
  targetAvatarUrl: string | null;
  detectedAt: string;
}

const VERB: Record<NotificationAction, string> = {
  comecou_a_seguir: "começou a seguir",
  deixou_de_seguir: "deixou de seguir",
  curtiu_post: "curtiu um post de",
  descurtiu_post: "descurtiu um post de",
  comentou: "comentou no post de",
  apagou_comentario: "apagou um comentário no post de",
};

const FILTERS = [
  { value: "todas", label: "Todas" },
  { value: "seguindo", label: "Novos follows" },
  { value: "interacoes", label: "Interações" },
  { value: "deixou", label: "Rastros sumidos" },
] as const;

function kindOf(a: NotificationAction): PistaKind {
  if (a === "comecou_a_seguir") return "follow";
  if (a === "deixou_de_seguir") return "unfollow";
  return "interaction";
}

type Filter = (typeof FILTERS)[number]["value"];

function matches(n: Notification, f: Filter) {
  if (f === "todas") return true;
  if (f === "seguindo") return n.action === "comecou_a_seguir";
  if (f === "deixou") return n.action === "deixou_de_seguir";
  return (
    n.action === "curtiu_post" ||
    n.action === "descurtiu_post" ||
    n.action === "comentou" ||
    n.action === "apagou_comentario"
  );
}

function ago(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "";
  }
}

/** Group label: Hoje / Ontem / the date itself. */
function bucket(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

export function NotificationsFeed({ items }: { items: Notification[] }) {
  const [filter, setFilter] = React.useState<Filter>("todas");

  const visible = items.filter((n) => matches(n, filter));
  const groups: { label: string; rows: Notification[] }[] = [];
  for (const n of visible) {
    const label = bucket(n.detectedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(n);
    else groups.push({ label, rows: [n] });
  }

  return (
    <div>
      <Chips options={FILTERS} value={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <Panel className="mt-5">
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Mascot pose="dormindo" className="h-20 text-vinho" bob />
            <p className="font-bold">😴 Faro pode descansar.</p>
            <p className="text-sm text-muted-foreground">Nenhuma pista nesta categoria ainda.</p>
          </div>
        </Panel>
      ) : (
        <div className="mt-5 space-y-6">
          {groups.map((g) => (
            <div key={g.label}>
              <h2 className="mb-2 text-sm font-bold">{g.label}</h2>
              <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
                {g.rows.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/p/${encodeURIComponent(n.subject)}`}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/40"
                    >
                      <Avatar src={n.subjectAvatarUrl} name={n.subject} size={40} />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-bold">
                          {pistaHeadline(kindOf(n.action)).emoji}{" "}
                          {pistaHeadline(kindOf(n.action)).title}
                        </p>
                        {/* Follows are done BY the tracked profile; likes and comments are
                            done by someone else ON the tracked profile's post. */}
                        <p>
                          <span className="font-semibold">
                            @{kindOf(n.action) === "interaction" ? n.target : n.subject}
                          </span>{" "}
                          <span className="text-muted-foreground">{VERB[n.action]}</span>{" "}
                          <span className="font-semibold">
                            @{kindOf(n.action) === "interaction" ? n.subject : n.target}
                          </span>
                        </p>
                        <span className="block text-[11px] text-muted-foreground">
                          {ago(n.detectedAt)}
                        </span>
                      </div>
                      <Avatar src={n.targetAvatarUrl} name={n.target} size={32} />
                      <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
