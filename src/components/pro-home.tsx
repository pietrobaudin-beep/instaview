import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpRight, Heart, PawPrint, Pin, Undo2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/brand";
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

/**
 * The Pro home: Farejo stops being a lookup tool and becomes something you open
 * every day — what Faro found since yesterday, who is in your Faro, and the
 * trail of recent changes.
 */
export function ProHome({ data, hour }: { data: ProHomeData; hour: number }) {
  const found = data.pistasSinceYesterday;

  const cards = [
    { icon: PawPrint, value: data.follows, label: "novos follows", tone: "bg-pink" },
    { icon: Undo2, value: data.unfollows, label: "unfollows", tone: "bg-purple" },
    { icon: Heart, value: data.interactions, label: "interações", tone: "bg-yellow" },
  ];

  return (
    <div>
      <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
        {greeting(hour)}
      </h1>
      <p className="mt-3 text-lg">
        {found > 0 ? (
          <>
            Faro encontrou <b>{pistas(found)}</b> desde ontem.
            {data.follows > 0 && (
              <span className="mt-1 block text-base font-semibold text-accent">
                {BRAND.phrases.alguemNovo}
              </span>
            )}
          </>
        ) : (
          <>😴 Faro pode descansar. Nenhuma mudança detectada desde ontem.</>
        )}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-3xl p-5 text-ink ${c.tone}`}>
            <c.icon className="h-5 w-5" />
            <div className="mt-3 text-3xl font-bold tabular-nums">{c.value}</div>
            <div className="text-sm opacity-75">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-5">
        <Panel
          className="lg:col-span-2"
          title={
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Pin className="h-4 w-4 text-accent" /> No seu Faro
            </h2>
          }
          action={
            <Link href="/rastros" className="text-xs font-semibold text-accent hover:underline">
              Ver todos
            </Link>
          }
        >
          <ul className="divide-y divide-border">
            {data.profiles.slice(0, 6).map((p) => (
              <li key={p.username}>
                <Link
                  href={`/p/${encodeURIComponent(p.username)}`}
                  className="flex items-center gap-3 py-3 transition hover:opacity-80"
                >
                  <div className="relative shrink-0">
                    <Avatar src={p.avatarUrl} name={p.displayName ?? p.username} size={40} />
                    <Pin className="absolute -right-1 -top-1 h-4 w-4 fill-pink text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">@{p.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.level.emoji} {p.level.label}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      p.novidades > 0 ? "bg-pink text-ink" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {novidades(p.novidades)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          className="lg:col-span-3"
          title={
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Nose className="h-4" /> Rastro recente
            </h2>
          }
        >
          {data.recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Mascot pose="dormindo" className="h-20 text-vinho" bob />
              <p className="text-sm text-muted-foreground">
                Nada passou pelo Faro ainda. As pistas aparecem aqui assim que algo mudar.
              </p>
            </div>
          ) : (
            <ol className="space-y-4">
              {data.recent.map((r) => {
                const h = pistaHeadline(r.kind);
                return (
                  <li key={r.id} className="flex items-start gap-3">
                    <span className="mt-0.5 text-lg leading-none" aria-hidden>
                      {h.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{h.title}</p>
                      {/* Interactions are done by someone else ON the tracked profile. */}
                      <p className="text-sm text-muted-foreground">
                        <b className="text-foreground">
                          @{r.kind === "interaction" ? r.target : r.subject}
                        </b>{" "}
                        {VERB[r.kind]}{" "}
                        <b className="text-foreground">
                          @{r.kind === "interaction" ? r.subject : r.target}
                        </b>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {ago(r.detectedAt)}
                      </p>
                    </div>
                    <Link
                      href={`/p/${encodeURIComponent(r.subject)}`}
                      aria-label={`Abrir @${r.subject}`}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
