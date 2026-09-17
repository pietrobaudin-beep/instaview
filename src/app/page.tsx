import Link from "next/link";
import { Activity, History, Sparkles, UserPlus } from "lucide-react";
import { TrackForm } from "@/components/track-form";
import { Badge } from "@/components/ui/badge";
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
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <Activity className="h-5 w-5 text-accent" />
          InstaView
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-grid absolute inset-0 -z-10" />
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-16 pt-16 text-center sm:pt-24">
          {env.INSTAGRAM_PROVIDER === "mock" && (
            <Badge variant="accent" className="mb-6">
              Modo demonstração · dados simulados
            </Badge>
          )}
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Veja quem essa pessoa começou a seguir no Instagram.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
            Digite um @username. Acompanhe novos seguindo, interações e mudanças no perfil ao longo
            do tempo.
          </p>
          <div className="mt-8 flex justify-center">
            <TrackForm />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sem senha do Instagram. Analise apenas dados públicos disponíveis.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-6">
            <f.icon className="h-5 w-5 text-accent" />
            <h3 className="mt-4 font-medium">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-8 text-sm text-muted-foreground">
          <span>InstaView · acompanhe perfis públicos do Instagram</span>
          <span className="text-xs">
            Analisamos apenas informações públicas. Não pedimos senha e não acessamos contas.
          </span>
        </div>
      </footer>
    </main>
  );
}
