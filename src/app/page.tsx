import Link from "next/link";
import { History, Sparkles, UserPlus } from "lucide-react";
import { TrackForm } from "@/components/track-form";
import { Logo } from "@/components/ui/logo";
import { env } from "@/lib/env";

const FEATURES = [
  {
    icon: UserPlus,
    title: "Novos seguindo",
    body: "Descubra quais perfis foram seguidos desde a última análise.",
  },
  {
    icon: Sparkles,
    title: "Interações recentes",
    body: "Veja perfis que aparecem com mais frequência em curtidas e comentários.",
  },
  {
    icon: History,
    title: "Histórico de mudanças",
    body: "Compare seguidores, seguindo e alterações no perfil ao longo do tempo.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo className="h-8" />
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="font-medium text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      {/* Hero — the solid pink block from the brand screens. */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="brand-panel relative overflow-hidden rounded-[2.5rem] px-6 py-16 text-center sm:px-12 sm:py-20">
          <div className="relative mx-auto flex max-w-2xl flex-col items-center">
            {env.INSTAGRAM_PROVIDER === "mock" && (
              <span className="mb-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Modo demonstração · dados simulados
              </span>
            )}
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] opacity-70">
              Curiosidade também é resposta ♥
            </p>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Veja quem essa pessoa começou a seguir no Instagram.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg opacity-80">
              Digite um @username. Acompanhe novos seguindo, interações e mudanças no perfil ao
              longo do tempo.
            </p>
            <div className="mt-8 flex w-full justify-center">
              <TrackForm onPink />
            </div>
            <p className="mt-4 text-xs opacity-70">
              Sem senha do Instagram. Analise apenas dados públicos disponíveis.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-24 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-[1.75rem] border border-border bg-card p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--pink))] text-[hsl(var(--maroon))]">
              <f.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-foreground/70">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Logo className="h-6 opacity-80" />
          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:text-right">
            <span className="font-semibold uppercase tracking-wider">Curiosidade conecta.</span>
            <span className="text-xs">
              Analisamos apenas informações públicas. Não pedimos senha e não acessamos contas.
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
