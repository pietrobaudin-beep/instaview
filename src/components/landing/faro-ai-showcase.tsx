"use client";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BellRing,
  Bookmark,
  Check,
  Clock,
  Heart,
  MessageCircle,
  PawPrint,
  Sparkles,
} from "lucide-react";
import { FakeAvatar, PEOPLE, type Person } from "@/components/landing/people";
import { FakePhoto, type Cena } from "@/components/landing/fake-photos";
import { cn } from "@/lib/utils";

/**
 * A apresentação do FarejAI na landing: um "app" de verdade, com as quatro
 * coisas que ele faz — Rastros, Chat, Pistas e Stories. As abas trocam sozinhas
 * (param quando a pessoa passa o mouse ou toca). Gente fictícia e desenhada, como em todos os mockups.
 */

type Aba = "rastros" | "chat" | "pistas" | "stories";

const ABAS: { id: Aba; label: string; icon: React.ElementType }[] = [
  { id: "rastros", label: "Rastros", icon: PawPrint },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "pistas", label: "Pistas", icon: Bell },
  { id: "stories", label: "Stories", icon: Bookmark },
];

const TEMPO = 6500;
/** Stories conta uma história maior (salvar → expirou), então fica mais tempo. */
const TEMPO_DA: Partial<Record<Aba, number>> = { stories: 9000 };
const tempoDa = (a: Aba) => TEMPO_DA[a] ?? TEMPO;

export function FaroAIShowcase() {
  const [aba, setAba] = React.useState<Aba>("rastros");
  const [pausa, setPausa] = React.useState(false);
  const [calmo, setCalmo] = React.useState(false);
  const [volta, setVolta] = React.useState(0); // reinicia a barrinha de tempo

  React.useEffect(() => {
    setCalmo(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  React.useEffect(() => {
    if (pausa || calmo) return;
    const t = window.setTimeout(() => {
      setAba((a) => ABAS[(ABAS.findIndex((x) => x.id === a) + 1) % ABAS.length].id);
      setVolta((v) => v + 1);
    }, tempoDa(aba));
    return () => window.clearTimeout(t);
  }, [aba, pausa, calmo, volta]);

  return (
    <div
      className="relative mx-auto w-full max-w-[400px]"
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
    >
      <div className="relative z-10 overflow-hidden rounded-[2rem] bg-cream text-ink shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
        {/* Topo do app: o perfil acompanhado e a próxima coleta. */}
        <div className="flex items-center gap-3 border-b border-ink/10 px-5 pb-3 pt-5">
          <span className="relative inline-flex rounded-full p-[2.5px]">
            <span className="lp-story absolute inset-0 rounded-full bg-[conic-gradient(from_200deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75)]" />
            <span className="relative rounded-full bg-cream p-[2px]">
              <FakeAvatar person={PEOPLE.julia} size={36} />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">@{PEOPLE.julia.handle}</p>
            <p className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-ink/55">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="truncate">coleta em 14h</span>
            </p>
          </div>
          <span className="rounded-full bg-pink px-2.5 py-1 text-[10px] font-bold">Detetive</span>
        </div>

        {/* As abas, com a barrinha de tempo embaixo da ativa. */}
        <div className="grid grid-cols-4 gap-1 px-3 pt-3" role="tablist" aria-label="O que o FarejAI faz">
          {ABAS.map((a) => {
            const on = a.id === aba;
            return (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setAba(a.id);
                  setVolta((v) => v + 1);
                }}
                className={cn(
                  "relative flex flex-col items-center gap-1 overflow-hidden rounded-2xl px-1 py-2 text-[11px] font-semibold transition",
                  on ? "bg-vinho text-cream" : "text-ink/55 hover:bg-ink/5",
                )}
              >
                <a.icon className="h-4 w-4" />
                {a.label}
                {a.id === "pistas" && (
                  <span className="absolute right-3 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                    3
                  </span>
                )}
                {on && !calmo && (
                  <span
                    key={volta}
                    className="sc-tempo absolute bottom-0 left-0 h-0.5 bg-pink"
                    style={{ animationDuration: `${tempoDa(a.id)}ms`, animationPlayState: pausa ? "paused" : "running" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div key={aba + volta} className="h-[300px] px-4 pb-5 pt-4" role="tabpanel">
          {aba === "rastros" && <Rastros />}
          {aba === "chat" && <Chat calmo={calmo} />}
          {aba === "pistas" && <Pistas />}
          {aba === "stories" && <Stories calmo={calmo} />}
        </div>
      </div>
    </div>
  );
}

function Entra({ d, className, children }: { d: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("sc-in", className)} style={{ "--d": `${d}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}

function Rastros() {
  const itens: { person: Person; icon: React.ElementType; tone: string; text: string; tag?: string }[] = [
    { person: PEOPLE.theo, icon: ArrowUpRight, tone: "bg-emerald-500", text: `começou a seguir @${PEOPLE.theo.handle}`, tag: "novo" },
    { person: PEOPLE.lucas, icon: ArrowUpRight, tone: "bg-emerald-500", text: `começou a seguir @${PEOPLE.lucas.handle}`, tag: "novo" },
    { person: PEOPLE.marina, icon: ArrowDownLeft, tone: "bg-rose-500", text: `deixou de seguir @${PEOPLE.marina.handle}` },
    { person: PEOPLE.duda, icon: Heart, tone: "bg-accent", text: `interage bastante com @${PEOPLE.duda.handle}` },
  ];
  return (
    <div className="space-y-2">
      <Entra d={0}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">Na coleta de hoje</p>
      </Entra>
      {itens.map((it, i) => (
        <Entra key={it.text} d={150 + i * 220}>
          <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
            <span className="relative shrink-0">
              <FakeAvatar person={it.person} size={30} />
              <span className={cn("absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white", it.tone)}>
                <it.icon className="h-2.5 w-2.5 text-white" strokeWidth={3} />
              </span>
            </span>
            <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{it.text}</p>
            {it.tag && (
              <span className="shrink-0 rounded-full bg-yellow px-2 py-0.5 text-[10px] font-bold">{it.tag}</span>
            )}
          </div>
        </Entra>
      ))}
      <Entra d={1150}>
        <p className="pt-1 text-center text-[11px] text-ink/50">Comparado com a coleta anterior · 2 novos, 1 saiu</p>
      </Entra>
    </div>
  );
}

function Chat({ calmo }: { calmo: boolean }) {
  const [passo, setPasso] = React.useState(calmo ? 2 : 0);
  React.useEffect(() => {
    if (calmo) return;
    const a = window.setTimeout(() => setPasso(1), 700);
    const b = window.setTimeout(() => setPasso(2), 2300);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [calmo]);
  return (
    <div className="flex h-full flex-col gap-2.5">
      <Entra d={0} className="ml-auto max-w-[80%]">
        <p className="rounded-2xl rounded-br-md bg-vinho px-3.5 py-2.5 text-[13px] text-cream">
          Quem ela começou a seguir essa semana?
        </p>
      </Entra>
      {passo >= 1 && (
        <div className="sc-in flex items-end gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[30%] bg-[#e79fc8]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascote/poses/faro-normal.svg" alt="" className="h-[82%] w-[82%] object-contain" />
          </span>
          {passo === 1 ? (
            <span className="lp-dots-live rounded-2xl rounded-bl-md bg-white px-3.5 py-3 shadow-sm">
              <i />
              <i />
              <i />
            </span>
          ) : (
            <div className="max-w-[82%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[13px] leading-snug shadow-sm">
              <p>
                <b>2 pessoas:</b> @{PEOPLE.theo.handle} e @{PEOPLE.lucas.handle}. E ela deixou de seguir @
                {PEOPLE.marina.handle}.
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-[10.5px] text-ink/50">
                <Sparkles className="h-3 w-3" /> Das coletas que o FarejAI guardou
              </p>
            </div>
          )}
        </div>
      )}
      {passo === 2 && (
        <Entra d={300} className="mt-auto">
          <div className="flex flex-wrap gap-1.5">
            {["Resuma a semana", "Postou story hoje?", "Quem mais aparece?"].map((s) => (
              <span key={s} className="rounded-full border border-ink/15 bg-white px-2.5 py-1 text-[11px] font-medium">
                {s}
              </span>
            ))}
          </div>
        </Entra>
      )}
    </div>
  );
}

function Pistas() {
  const itens = [
    { icon: PawPrint, title: "FarejAI encontrou alguém novo", body: `@${PEOPLE.julia.handle} começou a seguir @${PEOPLE.theo.handle}`, novo: true },
    { icon: BellRing, title: "Me avise quando… postar story", body: `@${PEOPLE.julia.handle} postou 2 stories`, novo: true },
    { icon: Sparkles, title: "Resumo da semana pronto", body: "3 mudanças e 5 stories guardados", novo: true },
    { icon: Heart, title: "Rolou interação", body: `@${PEOPLE.duda.handle} aparece em 4 posts`, novo: false },
  ];
  return (
    <div className="space-y-2">
      {itens.map((it, i) => (
        <Entra key={it.title} d={i * 220}>
          <div className={cn("flex items-start gap-3 rounded-2xl px-3 py-2.5", it.novo ? "bg-white shadow-sm" : "bg-ink/[0.04]")}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink">
              <it.icon className="h-4 w-4 text-vinho" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold">{it.title}</p>
              <p className="truncate text-[11px] text-ink/55">{it.body}</p>
            </div>
            {it.novo && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
          </div>
        </Entra>
      ))}
    </div>
  );
}

/**
 * Stories em três tempos: o leque aparece, alguém toca em "Salvar story", e
 * depois o mesmo story lado a lado — expirado no Instagram, guardado no FarejAI.
 */
function Stories({ calmo }: { calmo: boolean }) {
  const [passo, setPasso] = React.useState(calmo ? 3 : 0);
  React.useEffect(() => {
    if (calmo) return;
    const ts = [
      window.setTimeout(() => setPasso(1), 1500), // o dedo toca
      window.setTimeout(() => setPasso(2), 1950), // salvo
      window.setTimeout(() => setPasso(3), 4000), // 24h depois
    ];
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, [calmo]);

  const cartas: { cena: Cena; rot: string; when: string }[] = [
    { cena: "montanha", rot: "-rotate-[9deg] -translate-x-[62%]", when: "ontem" },
    { cena: "cafe", rot: "rotate-[9deg] translate-x-[62%]", when: "há 5h" },
    { cena: "show", rot: "", when: "há 1h" },
  ];
  const salvo = passo >= 2;

  if (passo === 3) {
    return (
      <div className="flex h-full flex-col">
        <Entra d={0}>
          <p className="text-center text-[11px] font-bold uppercase tracking-wider text-ink/45">24 horas depois…</p>
        </Entra>
        <div className="mt-3 grid flex-1 grid-cols-2 gap-3">
          {/* No Instagram: sumiu. */}
          <Entra d={150} className="flex flex-col items-center">
            <p className="mb-1.5 text-[11px] font-bold text-ink/60">No Instagram</p>
            <div className="relative h-[160px] w-full max-w-[120px] overflow-hidden rounded-2xl ring-2 ring-white">
              <FakePhoto cena="show" className="absolute inset-0 grayscale" />
              <div className="sc-expira absolute inset-0 bg-ink/80 backdrop-grayscale" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center">
                <span className="sc-in flex h-9 w-9 items-center justify-center rounded-full bg-white/15" style={{ "--d": "700ms" } as React.CSSProperties}>
                  <Clock className="h-4 w-4 text-white" />
                </span>
                <p className="sc-in text-[11px] font-bold text-white" style={{ "--d": "800ms" } as React.CSSProperties}>
                  Expirou
                </p>
                <p className="sc-in text-[9.5px] leading-tight text-white/60" style={{ "--d": "900ms" } as React.CSSProperties}>
                  Este story não está mais disponível
                </p>
              </div>
            </div>
            <p className="sc-in mt-1.5 text-[10px] font-semibold text-ink/55" style={{ "--d": "1000ms" } as React.CSSProperties}>
              some em 24 horas
            </p>
          </Entra>
          {/* No FarejAI: continua lá. */}
          <Entra d={450} className="flex flex-col items-center">
            <p className="mb-1.5 text-[11px] font-bold text-vinho">No FarejAI</p>
            <div className="relative h-[160px] w-full max-w-[120px] overflow-hidden rounded-2xl shadow-lg ring-2 ring-pink">
              <FakePhoto cena="show" className="absolute inset-0" />
              <div className="absolute left-2 top-2.5 flex items-center gap-1.5">
                <FakeAvatar person={PEOPLE.julia} size={18} />
                <span className="text-[9px] font-bold text-white drop-shadow">ontem</span>
              </div>
              <span className="absolute inset-x-0 bottom-3 flex justify-center">
                <span className="sc-in inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-cream px-2.5 py-1 text-[10px] font-bold text-vinho shadow-sm" style={{ "--d": "1000ms" } as React.CSSProperties}>
                  <Check className="h-3 w-3" strokeWidth={3} /> Salvo
                </span>
              </span>
            </div>
            <p className="sc-in mt-1.5 text-[10px] font-semibold text-ink/55" style={{ "--d": "1100ms" } as React.CSSProperties}>
              guardado por 7 dias
            </p>
          </Entra>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center">
      <div className="relative mt-1 h-[190px] w-full">
        {cartas.map((c, i) => (
          <div
            key={i}
            className={cn("sc-leque absolute left-1/2 top-0 -ml-[55px] h-[185px] w-[110px]", c.rot)}
            style={{ "--d": `${i * 160}ms`, zIndex: i === 2 ? 3 : 1 } as React.CSSProperties}
          >
            <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-lg ring-2 ring-white">
              <FakePhoto cena={c.cena} className="absolute inset-0" />
              <div className="absolute inset-x-2 top-2 flex gap-1">
                {[0, 1, 2].map((k) => (
                  <span key={k} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/40">
                    {i === 2 && k === 0 && <span className="sc-story-bar block h-full bg-white" />}
                  </span>
                ))}
              </div>
              <div className="absolute left-2 top-4 flex items-center gap-1.5">
                <FakeAvatar person={PEOPLE.julia} size={18} />
                <span className="text-[9px] font-bold text-white drop-shadow">{c.when}</span>
              </div>
              {i === 2 && salvo && (
                // Centralizado pelo flex: a animação de entrada usa transform e
                // apagaria um translate de centralização.
                <span className="absolute inset-x-0 bottom-3 flex justify-center">
                  <span className="sc-in inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-cream px-2.5 py-1 text-[10px] font-bold text-vinho shadow-sm">
                    <Bookmark className="h-3 w-3 fill-vinho" /> Guardado
                  </span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <Entra d={600} className="relative mt-3 flex items-center gap-2">
        <span
          className={cn(
            "relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-bold transition duration-300",
            salvo ? "bg-emerald-600 text-white" : "bg-vinho text-cream",
            passo === 1 && "scale-95",
          )}
        >
          {salvo ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Bookmark className="h-3.5 w-3.5" />}
          {salvo ? "Story salvo" : "Salvar story"}
          {/* O "dedo" tocando no botão. */}
          {passo >= 1 && !salvo && <span className="sc-toque absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />}
        </span>
        <span className="whitespace-nowrap rounded-full bg-ink/5 px-3 py-2 text-[11px] font-semibold text-ink/60">
          {salvo ? "Guardado no FarejAI" : "some em 24h no Instagram"}
        </span>
      </Entra>
    </div>
  );
}
