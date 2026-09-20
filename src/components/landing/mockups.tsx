import { Bell, Heart, Pin, UserPlus } from "lucide-react";
import { FakeAvatar, PEOPLE, type Person } from "@/components/landing/people";
export { StepSearch } from "@/components/landing/step-search";
import { cn } from "@/lib/utils";

/**
 * Product mockups for the landing page, drawn with the app's own styles rather
 * than screenshots so they stay crisp and match the real product. The people in
 * them are fictional and drawn (see people.tsx), never real photos, and each
 * mockup is captioned as a demonstration.
 */

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-border bg-card p-5 shadow-[0_30px_80px_-30px_hsl(var(--vinho)/0.35)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Bar({ label, value, pct, fill }: { label: string; value: number; pct: number; fill: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 shrink-0 font-medium">{label}</span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("grow block h-full rounded-full", fill)}
          style={{ width: `${pct}%`, "--d": "400ms" } as React.CSSProperties}
        />
      </span>
      <span className="w-6 shrink-0 text-right font-bold tabular-nums">{value}</span>
    </div>
  );
}

function PersonRow({ person, tag, d = 0 }: { person: Person; tag?: string; d?: number }) {
  return (
    <div className="rise flex items-center gap-3" style={{ "--d": `${d}ms` } as React.CSSProperties}>
      <FakeAvatar person={person} size={34} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{person.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">@{person.handle}</p>
      </div>
      {tag && (
        <span className="shrink-0 rounded-full bg-pink/60 px-2 py-0.5 text-[10px] font-bold text-vinho">
          {tag}
        </span>
      )}
    </div>
  );
}

/** 03 — the analysis screen, as the product shows it. */
export function AppMockup() {
  const j = PEOPLE.julia;
  return (
    <Frame className="mx-auto w-full max-w-sm">
      <div className="flex items-center gap-4">
        <span className="rounded-full p-0.5 ring-2 ring-pink">
          <FakeAvatar person={j} size={60} />
        </span>
        <div>
          <p className="font-bold">@{j.handle}</p>
          <p className="text-xs text-muted-foreground">{j.name} · perfil público</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 text-center">
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
      <div className="mt-5 flex gap-1.5">
        {["Visão geral", "Seguindo", "Interações"].map((t, i) => (
          <span
            key={t}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold",
              i === 0 ? "bg-pink text-ink" : "bg-muted text-muted-foreground",
            )}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-border p-4">
        <p className="mb-3 text-sm font-bold">Quem essa pessoa segue</p>
        <div className="space-y-2.5">
          <Bar label="Mulheres" value={28} pct={56} fill="bg-pink" />
          <Bar label="Homens" value={22} pct={44} fill="bg-purple" />
        </div>
      </div>
      <div className="mt-3 space-y-3 rounded-2xl border border-border p-4">
        <p className="text-sm font-bold">Começou a seguir</p>
        <PersonRow person={PEOPLE.lucas} tag="novo" d={700} />
        <PersonRow person={PEOPLE.bia} tag="novo" d={900} />
        <PersonRow person={PEOPLE.rafa} d={1100} />
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border p-4">
        <FakeAvatar person={PEOPLE.marina} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Mais interação com</p>
          <p className="truncate text-sm font-semibold">@{PEOPLE.marina.handle}</p>
        </div>
        <Heart className="h-4 w-4 shrink-0 fill-pink text-pink" />
      </div>
    </Frame>
  );
}

/** A small notification, as it appears around the Faro mockup. */
function Notice({
  icon: Icon,
  title,
  body,
  person,
  className,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  /** Shown instead of the icon when the notice is about someone. */
  person?: Person;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex max-w-[260px] items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-[0_16px_40px_-20px_hsl(var(--vinho)/0.4)]",
        className,
      )}
    >
      {person ? (
        <span className="relative shrink-0">
          <FakeAvatar person={person} size={32} />
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink ring-2 ring-card">
            <Icon className="h-2.5 w-2.5 text-vinho" />
          </span>
        </span>
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink/60">
          <Icon className="h-4 w-4 text-vinho" />
        </span>
      )}
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/**
 * 06 — a profile placed "no Faro", with the notifications it produces. The
 * notifications sit beside the card, gently staggered, so they never cover the
 * profile and the "No seu Faro" badge the section is about.
 */
export function FaroMockup() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 sm:flex-row">
      <Frame className="w-full max-w-[220px] shrink-0 text-center">
        <span className="relative mx-auto block w-fit">
          <span className="block rounded-full p-1 ring-2 ring-pink">
            <FakeAvatar person={PEOPLE.julia} size={72} />
          </span>
          <span className="absolute -right-1 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-pink">
            <Pin className="h-3.5 w-3.5 fill-vinho text-vinho" />
          </span>
        </span>
        <p className="mt-3 font-bold">@{PEOPLE.julia.handle}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-pink px-3.5 py-1.5 text-xs font-bold text-ink">
          <Pin className="h-3.5 w-3.5" /> No seu Faro
        </span>
      </Frame>

      <div className="w-full space-y-3">
        <div className="rise" style={{ "--d": "500ms" } as React.CSSProperties}>
          <Notice
            icon={UserPlus}
            person={PEOPLE.theo}
            title="Faro encontrou alguém novo."
            body={`@${PEOPLE.julia.handle} começou a seguir @${PEOPLE.theo.handle}.`}
            className="sm:translate-x-3"
          />
        </div>
        <div className="rise" style={{ "--d": "1100ms" } as React.CSSProperties}>
          <Notice
            icon={Heart}
            person={PEOPLE.duda}
            title="Rolou interação."
            body={`@${PEOPLE.duda.handle} curtiu 3 posts de @${PEOPLE.julia.handle}.`}
            className="sm:-translate-x-2"
          />
        </div>
        <div className="rise" style={{ "--d": "1700ms" } as React.CSSProperties}>
          <Notice
            icon={Bell}
            title="Resumo do dia"
            body="4 novas atividades encontradas."
            className="sm:translate-x-5"
          />
        </div>
      </div>
    </div>
  );
}

/** 07 — the connected-account view. Only metrics the feature really provides. */
export function AccountMockup() {
  const stats = [
    { value: "+24", label: "Novos seguidores", tone: "text-emerald-600" },
    { value: "−7", label: "Deixaram de seguir", tone: "text-rose-600" },
    { value: "1.832", label: "Seguidores", tone: "" },
    { value: "893", label: "Seguindo", tone: "" },
  ];
  return (
    <Frame className="mx-auto w-full max-w-md">
      <div className="flex items-center justify-between">
        <p className="font-bold">Sua conta</p>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          últimos 7 dias
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border p-4">
            <div className={cn("text-2xl font-bold tabular-nums", s.tone)}>{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ——— "Como funciona" mini screens ——— */

function Mini({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-36 flex-col justify-center gap-2 rounded-2xl bg-muted/60 p-4">{children}</div>
  );
}

/** Step 2 — who the profile follows. */
export function StepFollows() {
  return (
    <Mini>
      {[PEOPLE.lucas, PEOPLE.bia, PEOPLE.rafa].map((p, i) => (
        <div
          key={p.handle}
          className="loop-in flex items-center gap-2 rounded-xl bg-card px-2 py-1.5"
          style={{ "--d": `${i * 450}ms` } as React.CSSProperties}
        >
          <FakeAvatar person={p} size={24} />
          <span className="truncate text-xs font-semibold">@{p.handle}</span>
          {i < 2 && (
            <span className="ml-auto rounded-full bg-pink/60 px-1.5 text-[9px] font-bold text-vinho">
              novo
            </span>
          )}
        </div>
      ))}
    </Mini>
  );
}

/** Step 3 — the Faro telling you something changed. */
export function StepAlert() {
  return (
    <Mini>
      <div
        className="loop-in flex items-start gap-2 rounded-xl bg-card p-2.5 shadow-sm"
        style={{ "--d": "300ms" } as React.CSSProperties}
      >
        <FakeAvatar person={PEOPLE.theo} size={28} />
        <div className="min-w-0">
          <p className="text-xs font-bold">🐶 Faro encontrou alguém novo.</p>
          <p className="truncate text-[10px] text-muted-foreground">
            @{PEOPLE.julia.handle} seguiu @{PEOPLE.theo.handle}
          </p>
        </div>
      </div>
      <div
        className="loop-in flex items-start gap-2 rounded-xl bg-card/70 p-2.5"
        style={{ "--d": "1100ms" } as React.CSSProperties}
      >
        <FakeAvatar person={PEOPLE.duda} size={28} />
        <div className="min-w-0">
          <p className="text-xs font-bold">❤️ Rolou interação.</p>
          <p className="truncate text-[10px] text-muted-foreground">@{PEOPLE.duda.handle} curtiu 3 posts</p>
        </div>
      </div>
    </Mini>
  );
}

/**
 * Hero — o resultado, logo abaixo do campo de busca.
 *
 * A pessoa entende o produto antes de ler: um perfil, a pista que o Faro achou
 * e quando. Gente fictícia e desenhada, como em todos os mockups.
 */
export function HeroResult() {
  return (
    <Frame className="mx-auto w-full max-w-md text-left">
      <div className="flex items-center gap-3">
        <span className="block rounded-full p-0.5 ring-2 ring-pink">
          <FakeAvatar person={PEOPLE.julia} size={44} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold leading-tight">@{PEOPLE.julia.handle}</p>
          <p className="truncate text-xs text-muted-foreground">{PEOPLE.julia.name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-[11px] font-bold text-vinho">
          público
        </span>
      </div>

      <div
        className="rise mt-4 flex items-center gap-3 rounded-2xl bg-muted/70 px-3 py-2.5"
        style={{ "--d": "700ms" } as React.CSSProperties}
      >
        <FakeAvatar person={PEOPLE.theo} size={30} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">
            começou a seguir @{PEOPLE.theo.handle}
          </p>
          <p className="text-[11px] text-muted-foreground">há 2 horas</p>
        </div>
        <span className="shrink-0 rounded-full bg-yellow px-2 py-0.5 text-[10px] font-bold text-ink">
          novo
        </span>
      </div>

      <div
        className="rise mt-2 flex items-center gap-3 rounded-2xl px-3 py-2"
        style={{ "--d": "1300ms" } as React.CSSProperties}
      >
        <FakeAvatar person={PEOPLE.duda} size={26} />
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          curtiu 3 publicações desta semana
        </p>
      </div>
    </Frame>
  );
}

/**
 * PRO — a narrativa visual do bloco vinho: a linha do tempo do que mudou e o
 * aviso que chega, um em cima do outro, com o Faro espiando por trás.
 */
export function ProNarrative() {
  const events = [
    { person: PEOPLE.theo, text: "começou a seguir", when: "hoje, 08h", tag: "novo" },
    { person: PEOPLE.marina, text: "deixou de seguir", when: "ontem", tag: undefined },
    { person: PEOPLE.duda, text: "curtiu 3 posts", when: "seg", tag: undefined },
  ];
  return (
    <div className="relative">
      <div className="rounded-[2rem] border border-cream/12 bg-cream/[0.06] p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-cream">O que mudou em @{PEOPLE.julia.handle}</p>
          <span className="rounded-full bg-cream/10 px-2.5 py-1 text-[10px] font-semibold text-cream/70">
            últimos 7 dias
          </span>
        </div>
        <ol className="mt-5 space-y-3">
          {events.map((e, i) => (
            <li
              key={e.person.handle}
              className="rise flex items-center gap-3 rounded-2xl bg-cream/[0.06] px-3.5 py-3"
              style={{ "--d": `${400 + i * 260}ms` } as React.CSSProperties}
            >
              <FakeAvatar person={e.person} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-cream">
                  {e.text} @{e.person.handle}
                </p>
                <p className="text-[11px] text-cream/50">{e.when}</p>
              </div>
              {e.tag && (
                <span className="shrink-0 rounded-full bg-yellow px-2 py-0.5 text-[10px] font-bold text-ink">
                  {e.tag}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* O aviso que chega, sobreposto ao cartão. */}
      <div
        className="rise mt-4 w-full rounded-2xl bg-cream p-3.5 text-ink shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] sm:absolute sm:-bottom-12 sm:-left-10 sm:mt-0 sm:w-[15rem]"
        style={{ "--d": "1500ms" } as React.CSSProperties}
      >
        <p className="flex items-center gap-2 text-[13px] font-bold">
          <Bell className="h-3.5 w-3.5 text-accent" /> Faro encontrou algo novo
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          @{PEOPLE.julia.handle} começou a seguir alguém.
        </p>
      </div>
    </div>
  );
}
