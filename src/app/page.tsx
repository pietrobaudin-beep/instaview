import Link from "next/link";
import { BarChart3, Heart, History, Sparkles, UserPlus } from "lucide-react";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { SearchBlock } from "@/components/search-block";
import { Logo } from "@/components/ui/logo";
import { SniffingDog } from "@/components/ui/dog";
import { StatusPill } from "@/components/ui/brand";
import { CurvedArrow, StickerNote } from "@/components/ui/doodles";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// The brand board's feature row: each card on its own colour.
const FEATURES = [
  {
    icon: UserPlus,
    title: "Novos seguindo",
    body: "Descubra quem essa pessoa começou a seguir.",
    tone: "bg-pink",
  },
  {
    icon: Heart,
    title: "Quem deixou de seguir",
    body: "Veja quem saiu da lista desde a última análise.",
    tone: "bg-purple",
  },
  {
    icon: Sparkles,
    title: "Interações",
    body: "Os perfis que mais aparecem em curtidas e comentários.",
    tone: "bg-card",
  },
  {
    icon: BarChart3,
    title: "Relatórios",
    body: "Informações completas, de forma simples.",
    tone: "bg-yellow",
  },
  {
    icon: History,
    title: "Histórico",
    body: "Compare seguidores e seguindo ao longo do tempo.",
    tone: "bg-pink",
  },
];

export default async function Home() {
  const user = await getCurrentUser();

  // Signed in: the app's search screen, with the tab bar.
  if (user) {
    return (
      <>
        <AppNav />
        <main className="mx-auto max-w-4xl px-6 py-12">
          {env.INSTAGRAM_PROVIDER === "mock" && (
            <StatusPill tone="yellow" className="mb-6">
              Modo demonstração · dados simulados
            </StatusPill>
          )}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Quem você quer farejar hoje?
            </h1>
            <CurvedArrow className="mt-2 hidden h-12 shrink-0 text-accent sm:block" />
          </div>
          <div className="mt-7">
            <SearchBlock />
          </div>
        </main>
        <NavSpacer />
      </>
    );
  }

  // Signed out: the landing page.
  return (
    <main className="relative min-h-screen">
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

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="brand-panel rounded-[2.5rem] px-6 py-14 text-center sm:px-12 sm:py-20">
          <div className="mx-auto flex max-w-2xl flex-col items-center">
            {env.INSTAGRAM_PROVIDER === "mock" && (
              <StatusPill tone="dark" className="mb-6">
                Modo demonstração · dados simulados
              </StatusPill>
            )}
            <StickerNote className="mb-6">curiosidade também é resposta ♥</StickerNote>
            <h1 className="text-balance text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
              Stalkeie sem esforço.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg opacity-80">
              Busque qualquer @ do Instagram e descubra quem essa pessoa começou a seguir, com
              quem interage e o que mudou no perfil.
            </p>
            <div className="mx-auto mt-8 w-full max-w-lg">
              <SearchBlock onPink />
            </div>
            <p className="mt-4 text-xs opacity-70">
              Sem senha do Instagram. Analise apenas dados públicos disponíveis.
            </p>
            <SniffingDog className="mt-10 h-20 sm:h-24" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-5">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`rounded-[1.75rem] border border-border/60 p-6 text-ink ${f.tone}`}
          >
            <f.icon className="h-7 w-7" />
            <h3 className="mt-5 text-lg font-bold leading-tight">{f.title}</h3>
            <p className="mt-1.5 text-sm opacity-75">{f.body}</p>
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
