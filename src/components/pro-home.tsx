import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpRight, Heart, PawPrint, Undo2, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Nose } from "@/components/ui/doodles";
import type { ProHome as ProHomeData } from "@/lib/pro-home";
import { BRAND, greeting, novidades, pistaHeadline, pistas } from "@/lib/voice";
import { Mascot } from "@/components/ui/mascot";

const VERB = {
  follow: "começou a seguir",
  unfollow: "deixou de seguir",
  interaction: "interagiu com um post de",
} as const;

function ago(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "";
  }
}

/** Quiet card used across the Pro home — white, thin border, generous padding. */
function Card({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex h-full flex-col rounded-[1.75rem] border border-plum/10 bg-white p-6 shadow-[0_1px_2px_rgba(23,16,18,0.04),0_12px_32px_-24px_rgba(23,16,18,0.45)] ${className}`}
    >
      <header className="mb-5 flex shrink-0 items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-plum">
          {icon}
          {title}
        </h2>
        {action}
      </header>
      {/* min-h-0 para o filho poder rolar em vez de empurrar o cartão. */}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

/**
 * The Pro home: Farejo stops being a lookup tool and becomes something you open
 * every day — what Faro found since yesterday, who is in your Faro, and the
 * trail of recent changes.
 *
 * The Pro area wears the premium palette: deep plum, closed magenta, blush and
 * mint on white. Quieter than the landing's pink/purple/yellow, on purpose —
 * this is the screen a paying subscriber opens every morning.
 */
export function ProHome({
  data,
  hour,
  planName = "Farejo PRO",
  search,
}: {
  data: ProHomeData;
  hour: number;
  /** O nome do plano de quem está vendo — nada de "PRO" fixo na tela. */
  planName?: string;
  /** A busca entra entre a faixa e os cartões: farejar vem primeiro. */
  search?: React.ReactNode;
}) {
  const found = data.pistasSinceYesterday;

  const cards = [
    { icon: UserPlus, value: data.follows, label: "novos follows", tone: "bg-blush text-plum" },
    { icon: Undo2, value: data.unfollows, label: "unfollows", tone: "bg-mint text-plum" },
    { icon: Heart, value: data.interactions, label: "interações", tone: "bg-magenta text-white" },
  ];

  return (
    <div>
      {/* Header band: the one dark surface, where the day's news lives. */}
      <header className="overflow-hidden rounded-[2rem] bg-plum px-7 py-8 text-white sm:px-9 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
          {planName}
        </p>
        <h1 className="mt-3 text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl">
          {greeting(hour)}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">
          {found > 0 ? (
            <>
              Faro encontrou{" "}
              <b className="font-semibold text-white">{pistas(found)}</b> desde ontem.
              {data.follows > 0 && (
                <span className="mt-1.5 block font-semibold text-blush">
                  {BRAND.phrases.alguemNovo}
                </span>
              )}
            </>
          ) : (
            <>Faro pode descansar. Nenhuma mudança detectada desde ontem.</>
          )}
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          {cards.map((c) => (
            <div key={c.label} className={`rounded-2xl px-4 py-5 ${c.tone}`}>
              <c.icon className="h-[18px] w-[18px] opacity-70" />
              <div className="mt-3 text-[28px] font-bold leading-none tabular-nums sm:text-[32px]">
                {c.value}
              </div>
              <div className="mt-1.5 text-[13px] opacity-70">{c.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* items-stretch: os dois cartões terminam na mesma linha, e é o conteúdo
          que rola por dentro — antes o "Rastro recente" esticava a faixa toda. */}
      {search && <div className="mt-6">{search}</div>}

      <div className="mt-6 grid gap-5 lg:grid-cols-5 lg:items-stretch">
        <Card
          className="lg:col-span-2"
          icon={<PawPrint className="h-4 w-4 text-magenta" />}
          title="No seu Faro"
          action={
            <Link
              href="/rastros"
              className="text-xs font-semibold text-magenta transition hover:opacity-70"
            >
              Ver todos
            </Link>
          }
        >
          <ul className="max-h-[22rem] divide-y divide-plum/10 overflow-y-auto pr-1">
            {data.profiles.slice(0, 6).map((p) => (
              <li key={p.username}>
                <Link
                  href={`/p/${encodeURIComponent(p.username)}`}
                  className="flex items-center gap-3 py-3.5 transition hover:opacity-70"
                >
                  <div className="relative shrink-0">
                    <Avatar src={p.avatarUrl} name={p.displayName ?? p.username} size={40} />
                    <PawPrint className="absolute -right-1 -top-1 h-4 w-4 fill-blush text-magenta" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-plum">@{p.username}</p>
                    <p className="text-xs text-plum/50">
                      {p.level.emoji} {p.level.label}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
                      p.novidades > 0 ? "bg-magenta text-white" : "bg-plum/5 text-plum/50"
                    }`}
                  >
                    {novidades(p.novidades)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-3" icon={<Nose className="h-4 text-magenta" />} title="Rastro recente">
          {data.recent.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
              <Mascot pose="dormindo" className="h-14 text-plum/70" bob />
              <p className="max-w-xs text-sm text-plum/50">
                Nada passou pelo Faro ainda. As pistas aparecem aqui assim que algo mudar.
              </p>
            </div>
          ) : (
            <ol className="max-h-[22rem] space-y-4 overflow-y-auto pr-1">
              {data.recent.map((r) => {
                const h = pistaHeadline(r.kind);
                return (
                  <li key={r.id} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-base leading-none"
                      aria-hidden
                    >
                      {h.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-plum">{h.title}</p>
                      {/* Interactions are done by someone else ON the tracked profile. */}
                      <p className="text-sm text-plum/60">
                        <b className="font-semibold text-plum">
                          @{r.kind === "interaction" ? r.target : r.subject}
                        </b>{" "}
                        {VERB[r.kind]}{" "}
                        <b className="font-semibold text-plum">
                          @{r.kind === "interaction" ? r.subject : r.target}
                        </b>
                      </p>
                      <p className="mt-1 text-[11px] text-plum/40">{ago(r.detectedAt)}</p>
                    </div>
                    <Link
                      href={`/p/${encodeURIComponent(r.subject)}`}
                      aria-label={`Abrir @${r.subject}`}
                      className="shrink-0 text-plum/30 transition hover:text-magenta"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
