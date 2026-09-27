"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { FakeAvatar, PEOPLE, type Person } from "@/components/landing/people";
import { FakePhoto, type Cena } from "@/components/landing/fake-photos";
import { cn } from "@/lib/utils";

/**
 * "O produto" — a tela da análise, como o produto mostra hoje. As abas trocam
 * de verdade (Visão geral → Seguindo → Interações), sozinhas, e param quando o
 * mouse passa por cima; tocar numa aba também troca. Gente fictícia e desenhada.
 */

type Aba = "geral" | "seguindo" | "interacoes";
const ABAS: { id: Aba; label: string }[] = [
  { id: "geral", label: "Visão geral" },
  { id: "seguindo", label: "Seguindo" },
  { id: "interacoes", label: "Interações" },
];
const TEMPO = 3800;
/** A Visão geral mostra os dois pares de redes, então fica um pouco mais. */
const tempoDa = (a: Aba) => (a === "geral" ? 5000 : TEMPO);

function StoryRing({ person, size }: { person: Person; size: number }) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center rounded-full p-[3px]">
      <span className="lp-story absolute inset-0 rounded-full bg-[conic-gradient(from_200deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75)]" />
      <span className="relative rounded-full bg-card p-[2px]">
        <FakeAvatar person={person} size={size} />
      </span>
    </span>
  );
}

function Entra({ d, className, children }: { d: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("sc-in", className)} style={{ "--d": `${d}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}

export function AppMockup() {
  const j = PEOPLE.julia;
  const [aba, setAba] = React.useState<Aba>("geral");
  const [pausa, setPausa] = React.useState(false);
  const [calmo, setCalmo] = React.useState(false);

  React.useEffect(() => {
    setCalmo(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);
  React.useEffect(() => {
    if (pausa || calmo) return;
    const t = window.setTimeout(() => {
      setAba((a) => ABAS[(ABAS.findIndex((x) => x.id === a) + 1) % ABAS.length].id);
    }, tempoDa(aba));
    return () => window.clearTimeout(t);
  }, [aba, pausa, calmo]);

  const idx = ABAS.findIndex((a) => a.id === aba);

  return (
    <div
      className="mx-auto w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-[0_30px_80px_-30px_hsl(var(--vinho)/0.35)]"
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
    >
      <div className="flex items-center gap-4">
        <StoryRing person={j} size={56} />
        <div className="min-w-0">
          <p className="font-bold">@{j.handle}</p>
          <p className="text-xs text-muted-foreground">{j.name} · perfil público</p>
          <p className="mt-1 text-[10px] font-semibold text-accent">story novo · toque para ver</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 text-center">
        {[
          ["432", "publicações"],
          ["12,4 mil", "seguidores"],
          ["893", "seguindo"],
        ].map(([v, l]) => (
          <div key={l}>
            <div className="font-bold tabular-nums">{v}</div>
            <div className="text-[11px] text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>

      {/* As abas: o destaque rosa desliza até a aba ativa. */}
      <div className="relative mt-4 grid grid-cols-3 rounded-full bg-muted p-1 text-center text-[11px] font-semibold" role="tablist">
        <span
          className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-pink transition-transform duration-500 ease-[cubic-bezier(.6,0,.3,1)]"
          style={{ transform: `translateX(${idx * 100}%)` }}
        />
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={a.id === aba}
            onClick={() => setAba(a.id)}
            className="relative py-1"
          >
            {a.label}
          </button>
        ))}
      </div>

      <div key={aba} className="mt-3 h-[268px]">
        {aba === "geral" && <Geral />}
        {aba === "seguindo" && <Seguindo />}
        {aba === "interacoes" && <Interacoes />}
      </div>
    </div>
  );
}

const REDES = [
  { rede: "TikTok", cor: "bg-ink text-white", sigla: "♪", info: "3,2 mil seguidores" },
  { rede: "X", cor: "bg-black text-white", sigla: "𝕏", info: "418 seguidores" },
  { rede: "Telegram", cor: "bg-[#2AABEE] text-white", sigla: "✈", info: "canal público" },
  { rede: "VSCO", cor: "bg-[#F2F2F2] text-ink ring-1 ring-ink/15", sigla: "◎", info: "86 fotos" },
];

/** Duas redes por vez; a cada 1,8 s entra o outro par. */
function OutrasContas() {
  const [par, setPar] = React.useState(0);
  React.useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setPar((p) => (p + 1) % 2), 1800);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div key={par} className="mt-2 space-y-1.5">
      {REDES.slice(par * 2, par * 2 + 2).map((r, i) => (
        <Entra key={r.rede} d={i * 120} className="flex items-center gap-2.5">
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold", r.cor)}>
            {r.sigla}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold">@{PEOPLE.julia.handle}</p>
            <p className="text-[10px] text-muted-foreground">
              {r.rede} · {r.info}
            </p>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[9.5px] font-bold">ver</span>
        </Entra>
      ))}
    </div>
  );
}

function Geral() {
  const garotas = [PEOPLE.bia, PEOPLE.marina, PEOPLE.duda, PEOPLE.julia];
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <Entra d={0} className="rounded-2xl bg-pink/70 p-3">
          <p className="text-2xl font-bold leading-none text-vinho">28</p>
          <p className="mt-0.5 text-[11px] font-semibold text-vinho">garotas que segue</p>
          <div className="mt-2 flex -space-x-2">
            {garotas.map((p) => (
              <span key={p.handle} className="rounded-full ring-2 ring-pink/70">
                <FakeAvatar person={p} size={22} />
              </span>
            ))}
          </div>
        </Entra>
        <Entra d={150} className="rounded-2xl border border-border p-3">
          <p className="text-[11px] text-muted-foreground">Interage bastante com</p>
          <div className="mt-2 flex items-center gap-2">
            <FakeAvatar person={PEOPLE.marina} size={30} />
            <p className="min-w-0 truncate text-[12px] font-bold">@{PEOPLE.marina.handle}</p>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-accent">
            <Heart className="lp-heart h-3 w-3 fill-accent" /> 14 interações
          </p>
        </Entra>
      </div>

      {/* As outras contas da pessoa, com o mesmo @ — duas por vez, trocando. */}
      <Entra d={300} className="rounded-2xl border border-border p-3">
        <p className="text-[11px] font-bold">Outras contas de @{PEOPLE.julia.handle}</p>
        <OutrasContas />
      </Entra>
    </div>
  );
}

function Seguindo() {
  const lista: { p: Person; novo?: boolean }[] = [
    { p: PEOPLE.lucas, novo: true },
    { p: PEOPLE.bia, novo: true },
    { p: PEOPLE.rafa },
    { p: PEOPLE.duda },
    { p: PEOPLE.theo },
  ];
  return (
    <div>
      <Entra d={0} className="flex items-center justify-between rounded-xl bg-muted/70 px-3 py-1.5 text-[10.5px] font-semibold">
        <span>893 seguindo</span>
        <span className="text-vinho">28 garotas · 22 garotos</span>
      </Entra>
      <div className="mt-2.5 space-y-2">
        {lista.map(({ p, novo }, i) => (
          <Entra key={p.handle} d={120 + i * 120} className="flex items-center gap-2.5">
            <FakeAvatar person={p} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold">{p.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">@{p.handle}</p>
            </div>
            {novo && (
              <span className="shrink-0 rounded-full bg-yellow px-2 py-0.5 text-[9.5px] font-bold text-ink">
                começou a seguir
              </span>
            )}
          </Entra>
        ))}
      </div>
    </div>
  );
}

function Interacoes() {
  const ranking: { p: Person; n: number }[] = [
    { p: PEOPLE.marina, n: 14 },
    { p: PEOPLE.duda, n: 9 },
    { p: PEOPLE.lucas, n: 5 },
  ];
  const posts: { cena: Cena; ok: boolean }[] = [
    { cena: "praia", ok: true },
    { cena: "cafe", ok: false },
  ];
  return (
    <div className="space-y-2.5">
      <Entra d={0} className="rounded-2xl border border-border p-3">
        <p className="text-[11px] font-bold">Quem mais aparece nos posts</p>
        <div className="mt-2 space-y-1.5">
          {ranking.map(({ p, n }, i) => (
            <Entra key={p.handle} d={100 + i * 120} className="flex items-center gap-2">
              <span className="w-3 text-[10px] font-bold text-muted-foreground">{i + 1}</span>
              <FakeAvatar person={p} size={22} />
              <p className="min-w-0 flex-1 truncate text-[11.5px] font-semibold">@{p.handle}</p>
              <span className="flex items-center gap-1 text-[10px] font-bold text-accent">
                <Heart className="h-3 w-3 fill-accent" /> {n}
              </span>
            </Entra>
          ))}
        </div>
      </Entra>
      {/* O que ela curtiu nos posts de quem mais interage (Farejador +). */}
      <Entra d={450} className="rounded-2xl border border-border p-3">
        <p className="text-[11px] font-bold">Curtidas em @{PEOPLE.marina.handle}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {posts.map((p, i) => (
            <div key={i} className="relative h-[60px] overflow-hidden rounded-xl">
              <FakePhoto cena={p.cena} className="absolute inset-0" />
              <span
                className={cn(
                  "sc-in absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                  p.ok ? "bg-card text-accent" : "bg-card/85 text-muted-foreground",
                )}
                style={{ "--d": `${800 + i * 250}ms` } as React.CSSProperties}
              >
                {p.ok ? "❤ Curtiu" : "Não apareceu"}
              </span>
            </div>
          ))}
        </div>
      </Entra>
    </div>
  );
}
