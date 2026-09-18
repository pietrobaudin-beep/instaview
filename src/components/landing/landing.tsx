import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  CircleDot,
  Heart,
  History,
  PawPrint,
  Pin,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { HeaderStroll } from "@/components/header-stroll";
import { SearchBlock } from "@/components/search-block";
import { SniffingDog } from "@/components/ui/dog";
import { Handnote } from "@/components/ui/handnote";
import { Reveal } from "@/components/ui/reveal";
import { Logo } from "@/components/ui/logo";
import { FloatingSearch } from "@/components/landing/floating-search";
import { GuideCards } from "@/components/landing/guide-cards";
import {
  AccountMockup,
  AppMockup,
  FaroMockup,
  StepAlert,
  StepFollows,
  StepSearch,
} from "@/components/landing/mockups";
import { FictionalNote } from "@/components/landing/people";
import { SiteFooter } from "@/components/landing/site-footer";
import { PLANS, SINGLE_UNLOCK } from "@/lib/plans";
import { BRAND } from "@/lib/voice";

/**
 * The public landing page.
 *
 * Direction: a technology / social-intelligence brand, not a "stalk app". It
 * sells trust and product; the cheeky lines live in social media and in the
 * app's notifications. So: cream, light pink and vinho for ~90% of the page,
 * roxo and amarelo only as accents, very little decoration, and the mascot on
 * three occasions only (hero, Pro, final call).
 */

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-[0.2em] ${dark ? "text-pink" : "text-accent"}`}>
      {children}
    </p>
  );
}

function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl ${className}`}>
      {children}
    </h2>
  );
}

const WHAT = [
  {
    icon: Users,
    title: "Conexões",
    body: "Entenda melhor quem faz parte das conexões de um perfil.",
  },
  {
    icon: Heart,
    title: "Interações",
    body: "Veja quais contas aparecem com mais frequência.",
  },
  {
    icon: History,
    title: "Mudanças",
    body: "Acompanhe como essas conexões evoluem.",
  },
];

const PRO_FEATURES = [
  { icon: Pin, label: "Colocar no Faro" },
  { icon: Bell, label: "Alertas de mudanças" },
  { icon: PawPrint, label: "Histórico" },
  { icon: Heart, label: "Interações" },
  { icon: ArrowUpRight, label: "Novos follows" },
  { icon: ArrowDownLeft, label: "Unfollows" },
  { icon: CircleDot, label: "Análises adicionais" },
];

const STEPS = [
  { n: "01", title: "Busque", body: "Encontre o perfil que deseja analisar.", Mock: StepSearch },
  { n: "02", title: "Descubra", body: "Explore as informações disponíveis.", Mock: StepFollows },
  {
    n: "03",
    title: "Acompanhe",
    body: "Com o PRO, coloque perfis no seu Faro.",
    Mock: StepAlert,
  },
];

// The promises the hero and the final call make — all of them true today.
const TRUST = ["Resultado em segundos", "Sem login no Instagram", "A pessoa não é avisada"];

// Real facts about the product, in place of vanity numbers we don't have.
const FACTS = [
  { value: "0", label: "senhas pedidas" },
  { value: "100%", label: "dados públicos" },
  { value: "R$ 0", label: "para começar" },
  { value: "0", label: "avisos para quem é pesquisado" },
];

// Farejo against doing it by hand on Instagram — the honest comparison.
const COMPARE: { row: string; farejo: string; manual: string; manualOk?: boolean }[] = [
  { row: "Precisa entrar no Instagram", farejo: "Não", manual: "Sim, com a sua conta" },
  { row: "Lista de seguidos organizada", farejo: "Em segundos", manual: "Rolar a lista inteira" },
  { row: "Só pessoas (sem marcas e verificados)", farejo: "Automático", manual: "Separar um por um" },
  { row: "Mulheres e homens", farejo: "Contagem pronta", manual: "Contar na mão" },
  { row: "Quem mais interage", farejo: "Ranking pronto", manual: "Abrir post por post" },
  { row: "Histórico de mudanças", farejo: "Com o PRO", manual: "Só se você anotar" },
  { row: "Aviso quando algo muda", farejo: "Com o PRO", manual: "Não existe" },
  { row: "A pessoa fica sabendo", farejo: "Não", manual: "Não", manualOk: true },
];

const FAQ = [
  {
    q: "Como o Farejo funciona?",
    a: "Você digita um @ e o Farejo lê as informações públicas daquele perfil: quem ele segue, a divisão entre mulheres e homens e quem mais interage nos posts públicos. Tudo organizado numa tela só.",
  },
  {
    q: "Preciso da minha senha do Instagram?",
    a: "Não. O Farejo nunca pede senha, nem a sua nem a de ninguém, e não entra em nenhuma conta.",
  },
  {
    q: "A pessoa fica sabendo que eu pesquisei?",
    a: "Não. O Farejo não segue, não curte, não comenta e não envia nada para o perfil pesquisado.",
  },
  {
    q: "Funciona com perfil privado?",
    a: "Não. Perfis privados continuam privados: nesses casos, o Farejo só mostra que a conta é fechada.",
  },
  {
    q: "O Farejo é grátis?",
    a: "Você pode analisar 1 perfil de graça, com os nomes em prévia. Para ver um perfil completo sem assinatura, existe o uso único. O PRO revela tudo e acompanha os perfis que você colocar no Faro.",
  },
  {
    q: "A contagem de mulheres e homens é exata?",
    a: "É uma estimativa feita pelo primeiro nome de cada conta, então pode ter erros. Serve para dar uma ideia geral.",
  },
  {
    q: "Por que marcas e contas verificadas não aparecem?",
    a: "Porque o Farejo é sobre pessoas. Marcas, famosos e contas verificadas ficam de fora para você ver o que importa.",
  },
  {
    q: "Posso ver quem alguém começou a seguir?",
    a: "Sim. A análise mostra quem o perfil segue hoje, e com o PRO cada nova leitura é comparada com a anterior: o que mudou vira uma pista.",
  },
];

function TrustChecks({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium ${className}`}>
      {TRUST.map((t) => (
        <li key={t} className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15">
            <Check className="h-3 w-3 text-emerald-600" strokeWidth={3} />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}

// What the free plan really delivers: one analysis, with names blurred.
const FREE_INCLUDES = [
  "Busca por @",
  "Distribuição dos perfis seguidos",
  "Prévia das principais conexões",
  "Prévia das interações disponíveis",
];

const PRO_INCLUDES = [
  "Tudo do Free, sem censura",
  "Colocar perfis no Faro",
  "Histórico",
  "Alertas",
  "Mudanças nas conexões",
  "Recursos para conta conectada",
];

export function Landing({ demo }: { demo: boolean }) {
  const pro = PLANS.PRO;

  return (
    <main className="relative overflow-x-clip">
      {/* ——— Header ——— */}
      <header className="mx-auto max-w-6xl px-6 pt-6">
        <div className="flex items-center justify-between">
          <Logo className="h-7" />
          <nav className="flex items-center gap-6 text-sm">
            <a
              href="#produto"
              className="hidden font-medium text-muted-foreground hover:text-foreground md:inline"
            >
              Produto
            </a>
            <a
              href="#pro"
              className="hidden font-medium text-muted-foreground hover:text-foreground md:inline"
            >
              PRO
            </a>
            <a
              href="#planos"
              className="hidden font-medium text-muted-foreground hover:text-foreground md:inline"
            >
              Planos
            </a>
            <Link href="/login" className="font-medium text-muted-foreground hover:text-foreground">
              Entrar
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-vinho px-4 py-2 font-semibold text-cream transition hover:opacity-90"
            >
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      {/* ——— 01 · Hero ——— */}
      <section id="buscar" className="relative scroll-mt-10">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
          style={{
            background:
              "radial-gradient(ellipse 60% 70% at 50% 0%, hsl(var(--pink) / 0.35), transparent 70%)",
          }}
        />
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-12 text-center sm:pt-16">
          {demo && (
            <span className="mb-6 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              Modo demonstração · dados simulados
            </span>
          )}
          <Reveal delay={250} className="mb-6 self-center sm:mb-8 sm:mr-2 sm:self-end">
            <Handnote heart tilt={-6} className="text-3xl sm:text-4xl">
              algumas respostas precisam ser farejadas
            </Handnote>
          </Reveal>
          <h1 className="text-balance text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">
            Entenda melhor as conexões ao seu redor.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
            Pesquise um perfil e visualize informações e mudanças de forma simples e organizada.
          </p>

          <div className="relative mt-20 w-full max-w-xl">
            {/* Faro strolling along the top of the search field. */}
            <HeaderStroll ground={false} size={56} className="absolute inset-x-0 bottom-full h-20" />
            <SearchBlock
              buttonLabel="Buscar perfil"
              placeholder="usuário do Instagram"
              showRecent={false}
              autoFocus={false}
            />
          </div>
          <TrustChecks className="mt-6 text-muted-foreground" />
          <p className="mt-6 text-sm font-semibold tracking-wide text-muted-foreground">{BRAND.signature}</p>
        </div>
      </section>

      {/* ——— Fatos ——— */}
      <section className="border-t border-border">
        <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-y-8 px-6 py-12 md:grid-cols-4">
          {FACTS.map((f, i) => (
            <Reveal key={f.label} delay={i * 120} className="text-center">
              <dt className="sr-only">{f.label}</dt>
              <dd className="text-4xl font-bold tracking-tight text-vinho">{f.value}</dd>
              <dd className="mt-1 text-sm text-muted-foreground">{f.label}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ——— 02 · O que é ——— */}
      <section id="produto" className="scroll-mt-10 border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal className="max-w-2xl">
            <Eyebrow>O que é o Farejo</Eyebrow>
            <SectionTitle className="mt-4">Um @ pode contar muita coisa.</SectionTitle>
            <p className="mt-5 text-lg text-muted-foreground">
              O Farejo organiza informações de perfis e transforma dados dispersos em uma experiência simples
              de entender.
            </p>
            <Handnote underline className="mt-6">
              toda curiosidade deixa um rastro
            </Handnote>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {WHAT.map((w, i) => (
              <Reveal key={w.title} delay={i * 140} className="rounded-3xl border border-border bg-card p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink/50">
                  <w.icon className="h-5 w-5 text-vinho" />
                </span>
                <h3 className="mt-6 text-xl font-bold">{w.title}</h3>
                <p className="mt-2 text-muted-foreground">{w.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ——— 03 · Demonstração ——— */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:grid-cols-2">
        <Reveal>
          <AppMockup />
          <FictionalNote className="mt-4" />
        </Reveal>
        <Reveal delay={150}>
          <Eyebrow>O produto</Eyebrow>
          <SectionTitle className="mt-4">Tudo em um só lugar.</SectionTitle>
          <p className="mt-5 text-lg text-muted-foreground">
            Uma visão mais clara das conexões, atividades e mudanças que importam para você.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Seguindo", "Interações", "Histórico", "Alertas"].map((c) => (
              <span
                key={c}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold"
              >
                {c}
              </span>
            ))}
          </div>
          <Handnote heart className="mt-8">
            um @. muitas pistas.
          </Handnote>
        </Reveal>
      </section>

      {/* ——— 04 · Gratuito ——— */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-24 md:grid-cols-2 md:items-center">
          <Reveal>
            <Eyebrow>Farejo gratuito</Eyebrow>
            <SectionTitle className="mt-4">Comece com uma busca.</SectionTitle>
            <p className="mt-5 text-lg text-muted-foreground">
              No Farejo, você pode pesquisar um @ e conhecer melhor as conexões daquele perfil.
            </p>
            <a
              href="#buscar"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-vinho px-6 py-3 font-semibold text-cream transition hover:opacity-90"
            >
              Experimentar Farejo <ArrowRight className="h-4 w-4" />
            </a>
          </Reveal>
          <Reveal delay={150} className="relative rounded-3xl border border-border bg-card p-8">
            <Handnote tilt={6} className="absolute -top-5 right-6 bg-cream px-2">
              você pergunta. o Farejo encontra.
            </Handnote>
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              No plano gratuito
            </p>
            <ul className="mt-5 space-y-3">
              {FREE_INCLUDES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-lg">
                  <Check className="h-5 w-5 shrink-0 text-accent" />
                  {f}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ——— 05 · PRO ——— */}
      <section id="pro" className="scroll-mt-10 px-6 py-24">
        <Reveal className="vinho-surface relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] px-8 py-16 sm:px-14">
          <div className="relative grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <SniffingDog className="mb-8 h-12 text-pink" />
              <Eyebrow dark>Farejo PRO</Eyebrow>
              <h2 className="mt-4 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                De uma busca para um acompanhamento.
              </h2>
              <p className="mt-5 text-lg text-cream/75">
                Escolha os perfis que importam para você e acompanhe as mudanças disponíveis ao longo do
                tempo.
              </p>
              <Link
                href="/pricing"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-pink px-6 py-3 font-bold text-ink transition hover:opacity-90"
              >
                Conhecer o PRO <ArrowRight className="h-4 w-4" />
              </Link>
              <Handnote tone="pink" heart className="mt-8 block">
                deixe o Farejo acompanhar por você
              </Handnote>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {PRO_FEATURES.map((f, i) => (
                <li
                  key={f.label}
                  className="rise flex items-center gap-3 rounded-2xl border border-cream/10 bg-cream/[0.04] px-4 py-3.5"
                  style={{ "--d": `${300 + i * 90}ms` } as React.CSSProperties}
                >
                  <f.icon className="h-5 w-5 shrink-0 text-pink" />
                  <span className="font-medium">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ——— 06 · Colocar no Faro ——— */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:grid-cols-2">
        <Reveal delay={150} className="md:order-2">
          <Eyebrow>O diferencial</Eyebrow>
          <SectionTitle className="mt-4">Coloque no Faro.</SectionTitle>
          <p className="mt-5 text-lg text-muted-foreground">
            Você escolhe o perfil. O Farejo acompanha as mudanças disponíveis e organiza tudo para você.
          </p>
          <Handnote underline className="mt-6">
            nada passa despercebido.
          </Handnote>
        </Reveal>
        <Reveal className="md:order-1">
          <FaroMockup />
          <FictionalNote className="mt-6" />
        </Reveal>
      </section>

      {/* ——— 07 · Sua própria conta ——— */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:grid-cols-2">
          <Reveal>
            <Eyebrow>Sua conta</Eyebrow>
            <SectionTitle className="mt-4">O Farejo também olha para você.</SectionTitle>
            <p className="mt-5 text-lg text-muted-foreground">
              Conecte sua própria conta e tenha uma visão mais completa da sua audiência e das suas conexões.
            </p>
            <Link
              href="/connect"
              className="mt-8 inline-flex items-center gap-2 font-semibold text-vinho underline-offset-4 hover:underline"
            >
              Conectar minha conta <ArrowRight className="h-4 w-4" />
            </Link>
            <Handnote className="mt-8 block">você não é curioso. só presta atenção. 👀</Handnote>
          </Reveal>
          <Reveal delay={150}>
            <AccountMockup />
          </Reveal>
        </div>
      </section>

      {/* ——— 08 · Como funciona ——— */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <Eyebrow>Como funciona</Eyebrow>
          <SectionTitle className="mt-4">Comece pelo @.</SectionTitle>
        </Reveal>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal
              as="li"
              key={s.n}
              delay={i * 160}
              className="rounded-3xl border border-border bg-card p-5"
            >
              <s.Mock />
              <span className="mt-6 block px-2 text-sm font-bold tabular-nums text-accent">{s.n}</span>
              <h3 className="mt-3 px-2 text-2xl font-bold">{s.title}</h3>
              <p className="mt-2 px-2 pb-2 text-muted-foreground">{s.body}</p>
            </Reveal>
          ))}
        </ol>
        <Reveal delay={500} className="mt-8">
          <Handnote heart className="text-4xl sm:text-5xl">
            só isso.
          </Handnote>
        </Reveal>
      </section>

      {/* ——— Comparação ——— */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-4xl px-6 py-24">
          <Reveal className="text-center">
            <Eyebrow>Comparação</Eyebrow>
            <SectionTitle className="mt-4">Por que farejar em vez de procurar?</SectionTitle>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Dá para descobrir quase tudo na mão, abrindo o Instagram. Só que leva horas.
            </p>
          </Reveal>
          <Reveal className="relative mt-12">
            <Handnote tilt={5} className="mb-4 ml-auto block w-fit text-right sm:absolute sm:-right-6 sm:-top-16 sm:mb-0 sm:whitespace-nowrap">
              spoiler: sem o Farejo leva horas
            </Handnote>
            <div className="overflow-hidden rounded-[2rem] border border-border bg-card">
              <div className="grid grid-cols-[1.4fr_1fr_1fr] items-center border-b border-border px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:px-8">
                <span>Recurso</span>
                <span className="text-center">
                  <Logo className="mx-auto h-4 text-accent" />
                </span>
                <span className="text-center">Na mão</span>
              </div>
              {COMPARE.map((c, i) => (
                <div
                  key={c.row}
                  className="rise grid grid-cols-[1.4fr_1fr_1fr] items-center gap-2 border-b border-border px-5 py-3.5 text-sm last:border-0 sm:px-8"
                  style={{ "--d": `${150 + i * 80}ms` } as React.CSSProperties}
                >
                  <span className="font-semibold">{c.row}</span>
                  <span className="flex items-center justify-center gap-1.5 rounded-full bg-pink/35 px-2 py-1.5 text-center text-xs font-bold text-vinho">
                    <Check className="hidden h-3.5 w-3.5 shrink-0 sm:block" strokeWidth={3} />
                    {c.farejo}
                  </span>
                  <span
                    className={`flex items-center justify-center gap-1.5 px-2 text-center text-xs ${c.manualOk ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                  >
                    {!c.manualOk && (
                      <X className="hidden h-3.5 w-3.5 shrink-0 text-rose-500 sm:block" strokeWidth={3} />
                    )}
                    {c.manual}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ——— 09 · Planos ——— */}
      <section id="planos" className="scroll-mt-10 border-t border-border bg-card/40">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <Reveal className="text-center">
            <Eyebrow>Planos</Eyebrow>
            <SectionTitle className="mt-4">Escolha como farejar.</SectionTitle>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <Reveal className="relative flex flex-col rounded-[2rem] border border-border bg-card p-8">
              <Handnote heart tilt={-7} className="absolute -top-6 right-6 bg-cream px-2">
                comece de graça
              </Handnote>
              <h3 className="text-2xl font-bold">Farejo Free</h3>
              <p className="mt-1 text-muted-foreground">Para matar aquela curiosidade.</p>
              <p className="mt-6 text-4xl font-bold">R$ 0</p>
              <ul className="mt-6 flex-1 space-y-3">
                {FREE_INCLUDES.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <Check className="h-5 w-5 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#buscar"
                className="mt-8 rounded-full border-2 border-vinho px-6 py-3 text-center font-semibold text-vinho transition hover:bg-vinho hover:text-cream"
              >
                Começar grátis
              </a>
            </Reveal>

            <Reveal delay={150} className="vinho-surface flex flex-col rounded-[2rem] p-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Farejo PRO</h3>
                <span className="rounded-full bg-yellow px-2.5 py-1 text-[11px] font-bold text-ink">
                  Recomendado
                </span>
              </div>
              <p className="mt-1 text-cream/70">Para quem quer acompanhar.</p>
              <p className="mt-6 text-4xl font-bold">
                {brl(pro.priceMonthly)}
                <span className="text-lg font-medium text-cream/60">/mês</span>
              </p>
              {pro.priceYearly && (
                <p className="mt-1 text-sm text-cream/60">ou {brl(pro.priceYearly)} por ano</p>
              )}
              <ul className="mt-6 flex-1 space-y-3">
                {PRO_INCLUDES.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <Check className="h-5 w-5 shrink-0 text-pink" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="mt-8 rounded-full bg-pink px-6 py-3 text-center font-bold text-ink transition hover:opacity-90"
              >
                Quero o PRO
              </Link>
            </Reveal>
          </div>
          <p className="mt-8 text-center text-muted-foreground">
            Só quer ver um perfil? <b className="text-foreground">Uso único por {brl(SINGLE_UNLOCK.price)}</b>
            , sem assinatura.{" "}
            <a href="#buscar" className="font-semibold text-vinho underline-offset-4 hover:underline">
              Buscar o perfil
            </a>
          </p>
        </div>
      </section>

      {/* ——— Perguntas frequentes ——— */}
      <section id="perguntas" className="mx-auto max-w-3xl scroll-mt-10 px-6 py-24">
        <Reveal className="text-center">
          <Eyebrow>Dúvidas</Eyebrow>
          <SectionTitle className="mt-4">Perguntas frequentes</SectionTitle>
          <Handnote className="mt-4">ficou alguma dúvida? a gente responde.</Handnote>
        </Reveal>
        <Reveal className="mt-12 divide-y divide-border overflow-hidden rounded-[2rem] border border-border bg-card">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-6 sm:px-8">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-semibold transition hover:text-vinho [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition group-open:rotate-180" />
              </summary>
              <p className="-mt-1 pb-6 text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* ——— Guias ——— */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Reveal>
              <Eyebrow>Guias</Eyebrow>
              <SectionTitle className="mt-4">Entenda os rastros.</SectionTitle>
              <Handnote underline className="mt-4">
                o Instagram mostra. o Farejo conecta os pontos.
              </Handnote>
            </Reveal>
            <Link
              href="/guias"
              className="inline-flex items-center gap-2 font-semibold text-vinho underline-offset-4 hover:underline"
            >
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Reveal delay={150} className="mt-12">
            <GuideCards />
          </Reveal>
        </div>
      </section>

      {/* ——— 10 · CTA final ——— */}
      <section id="comecar" className="px-6 py-24">
        <Reveal className="brand-panel relative mx-auto flex max-w-4xl flex-col items-center rounded-[2.5rem] px-6 py-16 text-center sm:px-12">
          <Handnote
            tone="ink"
            underline
            tilt={-8}
            className="absolute left-6 top-8 hidden text-left sm:block"
          >
            seu faro
            <br />
            estava certo
          </Handnote>
          <SniffingDog className="h-20 text-vinho" animated />
          <h2 className="mt-8 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            Ficou curioso?
            <br />
            Comece com um @.
          </h2>
          <div className="mt-10 w-full max-w-lg">
            <SearchBlock
              onPink
              buttonLabel="Farejar →"
              placeholder="usuário"
              showRecent={false}
              autoFocus={false}
            />
          </div>
          <TrustChecks className="mt-6" />
          <Handnote tone="ink" heart className="mt-8">
            siga as pistas
          </Handnote>
          <p className="mt-4 text-sm font-semibold tracking-wide opacity-70">{BRAND.signature}</p>
        </Reveal>
      </section>

      <SiteFooter />

      {/* A search that follows you down the page. */}
      <FloatingSearch hideWhenVisible={["comecar", "rodape"]} />
    </main>
  );
}
