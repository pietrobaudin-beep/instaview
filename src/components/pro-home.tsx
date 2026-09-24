import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpRight, PawPrint, Undo2, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Nose } from "@/components/ui/doodles";
import type { ProHome as ProHomeData } from "@/lib/pro-home";
import { BRAND, greeting, novidades, pistaHeadline, pistas } from "@/lib/voice";
import { Mascot } from "@/components/ui/mascot";
import { Panel } from "@/components/ui/brand";

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
 * Os cartões da home PRO são o `Panel` do resto do app — mesma moldura, mesmo
 * fundo, mesmo respiro. Antes tinham borda, sombra e padding próprios: lado a
 * lado com o /perfil ou com o Faro AI, pareciam de outra tela.
 *
 * O que sobra aqui é só o que a home precisa: altura cheia (os dois cartões
 * terminam na mesma linha) e um corpo que rola por dentro em vez de esticar.
 */
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
    <Panel
      className={`flex h-full flex-col ${className}`}
      // min-h-0 para o filho poder rolar em vez de empurrar o cartão.
      bodyClassName="min-h-0 flex-1"
      title={
        <h2 className="flex min-w-0 items-center gap-2 text-base font-bold tracking-tight">
          {icon}
          {title}
        </h2>
      }
      action={action}
    >
      {children}
    </Panel>
  );
}

/**
 * The Pro home: Farejo stops being a lookup tool and becomes something you open
 * every day — what Faro AI found since yesterday, who is in your Faro AI, and the
 * trail of recent changes.
 *
 * The Pro area wears the premium palette: deep plum, closed magenta, blush and
 * mint on white. Quieter than the landing's pink/purple/yellow, on purpose —
 * this is the screen a paying subscriber opens every morning.
 */
export function ProHome({
  data,
  hour,
  planName = "Faro AI",
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

  /*
   * Dois números, não três. O terceiro era "interações" — quem curtiu e
   * comentou os posts do perfil —, e o Faro AI deixou de colher isso em 24/09:
   * custava um terço do preço de vigiar um perfil para responder uma pergunta
   * que ninguém faz. Um contador parado em zero é pior que contador nenhum.
   */
  const cards = [
    { icon: UserPlus, value: data.follows, label: "novos follows", tone: "bg-blush text-plum" },
    { icon: Undo2, value: data.unfollows, label: "unfollows", tone: "bg-mint text-plum" },
  ];

  return (
    <div>
      {/* Header band: the one dark surface, where the day's news lives. */}
      <header className="overflow-hidden rounded-3xl bg-plum px-7 py-8 text-white sm:px-9 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
          {planName}
        </p>
        <h1 className="mt-3 text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl">
          {greeting(hour)}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">
          {found > 0 ? (
            <>
              Faro AI encontrou{" "}
              <b className="font-semibold text-white">{pistas(found)}</b> desde ontem.
              {data.follows > 0 && (
                <span className="mt-1.5 block font-semibold text-blush">
                  {BRAND.phrases.alguemNovo}
                </span>
              )}
            </>
          ) : (
            <>Faro AI pode descansar. Nenhuma mudança detectada desde ontem.</>
          )}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
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
          title="No seu Faro AI"
          action={
            <Link
              href="/rastros"
              className="text-xs font-semibold text-magenta transition hover:opacity-70"
            >
              Ver todos
            </Link>
          }
        >
          <ul className="max-h-[22rem] divide-y divide-border overflow-y-auto pr-1">
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
                Nada passou pelo Faro AI ainda. As pistas aparecem aqui assim que algo mudar.
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
