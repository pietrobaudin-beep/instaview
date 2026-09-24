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
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { HeaderStroll } from "@/components/header-stroll";
import { SearchBlock } from "@/components/search-block";
import { SniffingDog } from "@/components/ui/dog";
import { Handnote } from "@/components/ui/handnote";
import { Reveal } from "@/components/ui/reveal";
import { SwipeDeck } from "@/components/ui/swipe-deck";
import { FaroWatching } from "@/components/landing/faro-watching";
import { Logo } from "@/components/ui/logo";
import { FloatingSearch } from "@/components/landing/floating-search";
import { GuideCards } from "@/components/landing/guide-cards";
import {
  AccountMockup,
  AppMockup,
  FaroMockup,
  HeroResult,
  ProNarrative,
  StepAlert,
  StepFollows,
  StepSearch,
} from "@/components/landing/mockups";
import { FictionalNote } from "@/components/landing/people";
import { Mascot } from "@/components/ui/mascot";
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

/** O que a assinatura entrega, dito como a pessoa entenderia. */
const PRO_PROMISES = [
  "Um farejo por dia em cada perfil da sua lista",
  "Quem entrou e quem saiu da lista de seguidos, sem censura",
  "Histórico do que mudou, desde o dia em que você colocou no Faro AI",
  "Aviso quando o Faro AI encontrar algo novo",
];

const PRO_FEATURES = [
  { icon: PawPrint, label: "Colocar no Faro AI" },
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
    body: "Com o PRO, coloque perfis no seu Faro AI.",
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
    a: "Você pode analisar 1 perfil de graça, com os nomes em prévia. Para ver um perfil completo sem assinatura, existe o uso único. O PRO revela tudo e acompanha os perfis que você colocar no Faro AI.",
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

/** A mesma garantia, numa linha só, para andar junto dos botões. */
function TrustLine({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <p className={`text-[13px] ${dark ? "text-cream/55" : "text-muted-foreground"} ${className}`}>
      Sem senha · dados públicos · ninguém é avisado
    </p>
  );
}

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
  "Colocar perfis no Faro AI",
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
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-16 pt-8 text-center sm:pb-24 sm:pt-14">
          {demo && (
            <span className="mb-5 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              Modo demonstração · dados simulados
            </span>
          )}
          {/* No celular o título entra primeiro: nada acima dele. */}
          <h1 className="text-balance text-[2.5rem] font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Entenda melhor as conexões ao seu redor.
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:mt-6 sm:text-lg">
            Pesquise um perfil e visualize informações e mudanças de forma simples e organizada.
          </p>

          <div className="relative mt-14 w-full max-w-xl sm:mt-20">
            {/* Faro AI strolling along the top of the search field. */}
            {/* Menor e discreto: quem tem que chamar atenção aqui é o campo. */}
            <HeaderStroll ground={false} size={40} className="absolute inset-x-0 bottom-full h-12 sm:h-14" />
            <SearchBlock
              buttonLabel="Farejar perfil"
              placeholder="usuário do Instagram"
              showRecent={false}
              autoFocus={false}
            />
          </div>

          {/* O resultado fica preso ao campo por um fio: lê-se "digito um @ e
              vejo isto", sem precisar de legenda. */}
          <span aria-hidden className="mt-3 block h-5 w-px bg-border" />
          <Reveal delay={200} className="relative mt-3 w-full max-w-md">
            <HeroResult />
            {/* O Faro AI cheirando a pista que acabou de achar. No celular ele fica
                encostado na borda do cartão, para não sair da tela. */}
            <Mascot
              pose="cheirando"
              className="pointer-events-none absolute -bottom-8 -right-2 h-12 text-vinho sm:-bottom-5 sm:-right-14 sm:h-16"
              decorative
            />
          </Reveal>
          <FictionalNote className="mt-6" />

          <TrustChecks className="mt-6 text-muted-foreground" />
          <p className="mt-5 text-sm font-semibold tracking-wide text-muted-foreground sm:mt-6">
            {BRAND.signature}
          </p>
        </div>
      </section>

      {/* ——— 02 · O produto, em uma seção só ———
          Antes eram duas ("Tudo em um só lugar" e "Um @ pode contar muita
          coisa") dizendo a mesma coisa em momentos diferentes. */}
      <section id="produto" className="scroll-mt-10">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:grid-cols-2">
          <Reveal>
            <AppMockup />
            <FictionalNote className="mt-4" />
          </Reveal>
          <Reveal delay={150}>
            <Eyebrow>O produto</Eyebrow>
            <SectionTitle className="mt-4">Um @ pode contar muita coisa.</SectionTitle>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              O Farejo organiza o que está público num perfil e mostra as conexões, as atividades e o que
              mudou — tudo numa tela só.
            </p>
            <ul className="mt-8 space-y-5">
              {WHAT.map((w, i) => (
                <li
                  key={w.title}
                  className="rise flex items-start gap-4"
                  style={{ "--d": `${250 + i * 120}ms` } as React.CSSProperties}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pink/50">
                    <w.icon className="h-5 w-5 text-vinho" />
                  </span>
                  <div>
                    <h3 className="font-bold">{w.title}</h3>
                    <p className="text-muted-foreground">{w.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ——— Fatos ——— */}
      <section className="border-y border-border">
        {/* Uma faixa só, com divisores: os quatro números lidos como um bloco. */}
        <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-border px-6 py-4 md:grid-cols-4 md:divide-y-0">
          {FACTS.map((f, i) => (
            <Reveal key={f.label} delay={i * 120} className="px-4 py-8 text-center">
              <dt className="sr-only">{f.label}</dt>
              <dd className="text-4xl font-bold tracking-tight text-vinho">{f.value}</dd>
              <dd className="mt-1 text-sm text-foreground/60">{f.label}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ——— 04 · Como funciona ——— */}
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
      </section>

      {/* ——— 05 · Gratuito ——— */}
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

      {/* ——— 06 · Colocar no Faro AI ——— */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:grid-cols-2">
        <Reveal delay={150} className="md:order-2">
          <Eyebrow>O diferencial</Eyebrow>
          <SectionTitle className="mt-4">Coloque no Faro AI.</SectionTitle>
          <p className="mt-5 text-lg text-muted-foreground">
            Você escolhe o perfil. O Farejo acompanha as mudanças disponíveis e organiza tudo para você.
          </p>
        </Reveal>
        <Reveal className="md:order-1">
          <FaroMockup />
          <FictionalNote className="mt-6" />
        </Reveal>
      </section>

      {/* ——— 07 · PRO ——— */}
      <section id="pro" className="scroll-mt-10 px-6 py-24">
        <Reveal className="vinho-surface relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-12 sm:rounded-3xl sm:px-14 sm:py-20">
          {/* min-w-0 nas colunas: sem isso o conteúdo mais largo estica a coluna
              e o texto vaza para fora do painel no celular. */}
          {/* Colunas alinhadas pelo topo: centralizadas, o texto "flutuava" em
              relação ao cartão sempre que uma das duas crescia. */}
          <div className="relative grid gap-12 md:grid-cols-2 md:items-start md:gap-16">
            <div className="min-w-0">
              {/* No celular já existe o Faro AI espiando o cartão: um só basta. */}
              <SniffingDog className="mb-6 hidden h-12 text-pink sm:mb-8 sm:block" />
              <Eyebrow dark>Farejo PRO</Eyebrow>
              <h2 className="mt-4 text-balance text-[1.9rem] font-bold leading-[1.08] tracking-tight sm:text-5xl">
                Você não precisa voltar todo dia. O Faro AI volta.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-cream/75 sm:text-lg">
                {pro.maxProfiles === 1
                  ? "Coloque a pessoa que importa no Faro AI. Todo dia ele relê o perfil e mostra"
                  : `Coloque até ${pro.maxProfiles} perfis no Faro AI. Todo dia ele relê cada um e mostra`}{" "}
                <b className="font-semibold text-cream">só o que mudou</b> desde a última vez.
              </p>

              {/* O que a assinatura entrega, em frases — não em rótulos soltos. */}
              <ul className="mt-8 space-y-3">
                {PRO_PROMISES.map((t, i) => (
                  <li
                    key={t}
                    className="rise flex items-start gap-3 text-sm leading-relaxed text-cream/85 sm:text-[15px]"
                    style={{ "--d": `${250 + i * 110}ms` } as React.CSSProperties}
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>

              {/* Preço na cara, separado por um fio de quem chega aqui já quer
                  saber quanto é. */}
              <hr className="mt-8 border-cream/12" />
              <p className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-3xl font-bold tracking-tight">{brl(pro.priceMonthly)}</span>
                <span className="text-cream/60">por mês</span>
                <span className="text-cream/40">·</span>
                <span className="text-sm text-cream/60">cancele quando quiser</span>
              </p>

              {/* No celular os botões ocupam a linha inteira, um sob o outro. */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-pink px-6 py-3 font-bold text-ink transition hover:opacity-90"
                >
                  Assinar o PRO <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#planos"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-cream/25 px-6 py-3 font-semibold text-cream transition hover:border-cream/50"
                >
                  Ver todos os planos
                </a>
              </div>
              <TrustLine dark className="mt-4" />
              <p className="mt-3 text-[13px] leading-relaxed text-cream/55 sm:text-sm">
                Só quer ver um perfil? O <b className="font-semibold text-cream/80">uso único</b> libera um @
                sem assinatura.
              </p>
              <Handnote tone="pink" heart className="mt-7 block">
                deixe o Farejo acompanhar por você
              </Handnote>
            </div>

            {/* O benefício visto em segundos: a linha do tempo e o aviso. */}
            <div className="relative min-w-0 pb-16 pt-12 md:pt-6">
              {/* O Faro AI trabalhando atrás do cartão: espia, se liga, avisa, comemora. */}
              <FaroWatching className="absolute right-4 top-0 z-0 h-20 w-28 sm:right-6 sm:h-24 sm:w-32" />
              <div className="relative z-10">
                <ProNarrative />
              </div>
            </div>
          </div>

          {/* As pílulas repetem o que as promessas já dizem: só do tablet para cima. */}
          <hr className="relative mt-16 hidden border-cream/12 sm:block" />
          <ul className="relative mt-8 hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            {PRO_FEATURES.map((f, i) => (
              <li
                key={f.label}
                className="rise flex items-center gap-2.5 rounded-2xl border border-cream/10 bg-cream/[0.04] px-4 py-3.5 text-sm"
                style={{ "--d": `${300 + i * 90}ms` } as React.CSSProperties}
              >
                <f.icon className="h-4 w-4 shrink-0 text-pink" />
                <span className="font-medium">{f.label}</span>
              </li>
            ))}
          </ul>
          <FictionalNote dark className="mt-10 hidden sm:block" />
        </Reveal>
      </section>

      {/* ——— 08 · Sua própria conta ——— */}
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
          </Reveal>
          <Reveal delay={150}>
            <AccountMockup />
          </Reveal>
        </div>
      </section>

      {/* ——— 09 · Comparação ——— */}
      {/* Sem fundo: entre "sua conta" e "planos", três seções claras seguidas
          achatavam a página. */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <Reveal className="text-center">
              <Eyebrow>Comparação</Eyebrow>
              <SectionTitle className="mt-4">Por que farejar em vez de procurar?</SectionTitle>
              <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
                Dá para descobrir quase tudo na mão, abrindo o Instagram. Só que leva horas.
              </p>
            </Reveal>
            <Reveal className="relative mt-12">
              <div className="overflow-hidden rounded-3xl border border-border bg-card">
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
        </div>
      </section>

      {/* ——— 10 · Planos ——— */}
      <section id="planos" className="scroll-mt-10 border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal className="text-center">
            <Eyebrow>Planos</Eyebrow>
            <SectionTitle className="mt-4">Escolha como farejar.</SectionTitle>
          </Reveal>
          {/* No celular: um cartão de cada vez, arrastando para o lado. */}
          <SwipeDeck className="mt-12" label="Planos do Farejo">
            <Reveal className="relative flex h-full flex-col rounded-3xl border border-border bg-card p-8">
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

            {/* Uso único: a compra de quem só quer resolver uma curiosidade. */}
            <Reveal delay={100} className="relative flex h-full flex-col rounded-3xl border-2 border-pink bg-card p-8">
              <h3 className="text-2xl font-bold">Uso único</h3>
              <p className="mt-1 text-muted-foreground">Para uma curiosidade pontual.</p>
              <p className="mt-6 text-4xl font-bold">
                {brl(SINGLE_UNLOCK.price)}
                <span className="text-lg font-medium text-muted-foreground"> uma vez</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">sem assinatura, sem renovação</p>
              <ul className="mt-6 flex-1 space-y-3">
                {SINGLE_UNLOCK.features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <Check className="h-5 w-5 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#buscar"
                className="mt-8 rounded-full bg-pink px-6 py-3 text-center font-bold text-ink transition hover:opacity-90"
              >
                Liberar um perfil
              </a>
            </Reveal>

            <Reveal delay={200} className="vinho-surface flex h-full flex-col rounded-3xl p-8">
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
              <p className="mt-1 text-sm text-cream/60">
                ou {brl(PLANS.AGENCY.priceYearly ?? 0)} por ano no{" "}
                <b className="font-semibold text-cream/80">{PLANS.AGENCY.name}</b>
              </p>
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
          </SwipeDeck>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            O uso único libera <b className="text-foreground">um perfil</b>; o PRO acompanha{" "}
            <b className="text-foreground">
              {pro.maxProfiles === 1 ? "um perfil todo dia" : `até ${pro.maxProfiles}`}
            </b>{" "}
            ao longo do tempo.
          </p>
          <TrustLine className="mt-2 text-center" />
        </div>
      </section>

      {/* ——— Perguntas frequentes ——— */}
      <section id="perguntas" className="mx-auto max-w-3xl scroll-mt-10 px-6 py-24">
        <Reveal className="text-center">
          <Eyebrow>Dúvidas</Eyebrow>
          <SectionTitle className="mt-4">Perguntas frequentes</SectionTitle>
        </Reveal>
        <Reveal className="mt-12 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
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

      {/* ——— 13 · CTA final ——— */}
      <section id="comecar" className="px-6 py-24">
        <Reveal className="brand-panel relative mx-auto flex max-w-4xl flex-col items-center rounded-3xl px-6 py-16 text-center sm:px-12">
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
              buttonLabel="Farejar perfil"
              placeholder="usuário"
              showRecent={false}
              autoFocus={false}
            />
          </div>
          <TrustChecks className="mt-6" />
          <p className="mt-4 text-sm font-semibold tracking-wide opacity-70">{BRAND.signature}</p>
        </Reveal>
      </section>

      <SiteFooter />

      {/* A search that follows you down the page. */}
      {/* Sai de cena nos blocos densos: lá ela cobria texto, listas e cartões. */}
      <FloatingSearch hideWhenVisible={["comecar", "rodape", "pro", "planos", "perguntas"]} />
    </main>
  );
}
