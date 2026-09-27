import Link from "next/link";
import {
  ArrowRight,
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
import { Handnote } from "@/components/ui/handnote";
import { Reveal } from "@/components/ui/reveal";
import { FaroAIShowcase } from "@/components/landing/faro-ai-showcase";
import { Logo } from "@/components/ui/logo";
import { FloatingSearch } from "@/components/landing/floating-search";
import { GuideCards } from "@/components/landing/guide-cards";
import {
  AppMockup,
  HeroResult,
  StepAlert,
  StepFollows,
  StepSearch,
} from "@/components/landing/mockups";
import { FictionalNote } from "@/components/landing/people";
import { Mascot } from "@/components/ui/mascot";
import { SiteFooter } from "@/components/landing/site-footer";
import { PLANS, SINGLE_UNLOCK } from "@/lib/plans";
import { PlanosCards } from "@/components/planos-cards";
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
    body: "Quem o perfil segue, com a estimativa de garotas e garotos.",
  },
  {
    icon: Heart,
    title: "Interações",
    body: "Com quem ele interage bastante — e, no Farejador +, as curtidas nos posts dessa pessoa.",
  },
  {
    icon: CircleDot,
    title: "Stories e outras redes",
    body: "Os stories como no Instagram, e o mesmo @ no TikTok, X, Telegram e VSCO.",
  },
  {
    icon: History,
    title: "Mudanças",
    body: "No FarejAI: o que mudou, nos Rastros, e perguntas no Chat.",
  },
];

/** O que o FarejAI faz, curto — o "app" ao lado mostra cada um. */
const PRO_FUNCOES = [
  { icon: PawPrint, title: "Rastros", body: "Quem entrou e quem saiu, a cada coleta." },
  { icon: Sparkles, title: "Chat", body: "Pergunte e o FarejAI responde." },
  { icon: Bell, title: "Pistas", body: "Avisos e \"Me avise quando…\"." },
  { icon: CircleDot, title: "Stories", body: "Guardados 3 dias (Cão) ou 7 (Detetive)." },
];

const STEPS = [
  {
    n: "01",
    title: "Busque",
    body: "Digite o @, marque o perfil certo nas sugestões e toque em Farejar.",
    Mock: StepSearch,
  },
  {
    n: "02",
    title: "Descubra",
    body: "Garotas que segue, com quem interage bastante e o que começou a seguir.",
    Mock: StepFollows,
  },
  {
    n: "03",
    title: "Acompanhe",
    body: "No FarejAI, os Rastros avisam o que mudou e o Chat responde suas perguntas.",
    Mock: StepAlert,
  },
];

// The promises the hero and the final call make — all of them true today.
const TRUST = ["Resultado em segundos", "Sem login no Instagram", "A pessoa não é avisada"];

// Real facts about the product, in place of vanity numbers we don't have.
const FACTS = [
  { value: "0", label: "senhas pedidas" },
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
  { row: "Histórico de mudanças", farejo: "Com o FarejAI", manual: "Só se você anotar" },
  { row: "Aviso quando algo muda", farejo: "Com o FarejAI", manual: "Não existe" },
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
    a: "Buscar e ver a prévia é grátis. Com uma conta grátis você revela quem mais aparece nas interações de um perfil, uma vez. Para a análise completa de um perfil sem assinatura existe o Farejador; para acompanhar um perfil ao longo do tempo, o Faro de Cão e o Faro de Detetive.",
  },
  {
    q: "A contagem de mulheres e homens é exata?",
    a: "Não. É uma estimativa feita pelo nome de cada conta (e, quando o nome não resolve, por IA), então pode errar. Serve para dar uma ideia geral.",
  },
  {
    q: "Por que marcas e contas verificadas não aparecem?",
    a: "Porque o Farejo é sobre pessoas. Marcas, famosos e contas verificadas ficam de fora para você ver o que importa.",
  },
  {
    q: "Posso ver quem alguém começou a seguir?",
    a: "A análise mostra uma amostra de quem o perfil segue hoje, na ordem que o Instagram entrega. Com o FarejAI, cada coleta é comparada com a anterior: o que mudou vira uma pista.",
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

export function Landing({ demo }: { demo: boolean }) {

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
              FarejAI
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

          <div className="relative mt-20 w-full max-w-xl sm:mt-24">
            {/* FarejAI strolling along the top of the search field. */}
            <HeaderStroll ground={false} size={64} className="absolute inset-x-0 bottom-full h-16 sm:h-20" />
            {/* Recado à mão apontando o campo — só onde há espaço ao lado. */}
            <Handnote tone="accent" tilt={-8} className="pointer-events-none absolute -left-44 top-1 hidden text-right text-[1.7rem] leading-none lg:block">
              fareja aí
              <br />
              <span className="text-xl">digita um @ →</span>
            </Handnote>
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
            {/* O FarejAI cheirando a pista que acabou de achar. No celular ele fica
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

      {/* ——— Confiança, logo abaixo do topo: sem senha, grátis para começar, ninguém é avisado ——— */}
      <section className="bg-white">
        {/* Uma faixa só, com divisores: os quatro números lidos como um bloco. */}
        <dl className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-border px-2 py-4 sm:px-6">
          {FACTS.map((f, i) => (
            <Reveal key={f.label} delay={i * 120} className="px-2 py-8 text-center sm:px-4">
              <dt className="sr-only">{f.label}</dt>
              <dd className="text-4xl font-bold tracking-tight text-vinho">{f.value}</dd>
              <dd className="mt-1 text-sm text-foreground/60">{f.label}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ——— 02 · O produto, em uma seção só ———
          Antes eram duas ("Tudo em um só lugar" e "Um @ pode contar muita
          coisa") dizendo a mesma coisa em momentos diferentes. */}
      <section id="produto" className="scroll-mt-10 bg-background">
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
            <Handnote underline tilt={-3} className="mt-8 block">
              tudo numa tela só
            </Handnote>
          </Reveal>
        </div>
      </section>

      {/* ——— 04 · Como funciona ——— */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <Eyebrow>Como funciona</Eyebrow>
          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
            <SectionTitle>Comece pelo @.</SectionTitle>
            <Handnote tone="accent" tilt={-6} className="pb-1">
              leva segundos!
            </Handnote>
          </div>
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
        {/* O que antes era a seção "Comece com uma busca": uma linha basta. */}
        <Reveal className="mt-8 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
          <p className="text-muted-foreground">
            <b className="font-semibold text-foreground">Buscar e ver a prévia é grátis</b> — sem cartão, sem senha.
          </p>
          <a
            href="#buscar"
            className="inline-flex items-center gap-2 rounded-full bg-vinho px-5 py-2.5 text-sm font-semibold text-cream transition hover:opacity-90"
          >
            Experimentar grátis <ArrowRight className="h-4 w-4" />
          </a>
        </Reveal>
        </div>
      </section>

      {/* ——— 09 · Comparação ——— */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <Reveal className="text-center">
              <Eyebrow>Comparação</Eyebrow>
              <SectionTitle className="mt-4">Por que farejar em vez de procurar?</SectionTitle>
              <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
                Dá para descobrir quase tudo na mão, abrindo o Instagram. Só que leva horas.
              </p>
              <Handnote tone="accent" tilt={-4} className="mt-4">
                horas → segundos
              </Handnote>
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

      {/* ——— 07 · PRO ——— */}
      <section id="pro" className="scroll-mt-10 px-6 py-24 bg-white">
        <Reveal className="vinho-surface relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-12 sm:px-12 sm:py-14">
          {/* min-w-0 nas colunas: sem isso o conteúdo mais largo estica a coluna
              e o texto vaza para fora do painel no celular. */}
          {/* No celular: título → demonstração → funções e planos.
              No computador: texto à esquerda, demonstração à direita. */}
          <div className="relative grid gap-8 md:grid-cols-2 md:grid-rows-[auto_1fr] md:gap-x-14 md:gap-y-0">
            <div className="min-w-0 md:col-start-1 md:row-start-1">
              <Eyebrow dark>FarejAI</Eyebrow>
              <h2 className="mt-3 text-balance text-[1.9rem] font-bold leading-[1.08] tracking-tight sm:text-[2.6rem]">
                Você não volta todo dia. O FarejAI volta.
              </h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-cream/75">
                Coloque um perfil no FarejAI e veja <b className="font-semibold text-cream">só o que mudou</b>{" "}
                entre uma coleta e outra.
              </p>
            </div>

            {/* O FarejAI de verdade: Rastros, Chat, Pistas e Stories, trocando sozinhos. */}
            <div className="relative min-w-0 md:col-start-2 md:row-span-2 md:row-start-1 md:self-center">
              <Handnote tone="pink" tilt={-5} className="mb-3 block text-center text-[1.6rem]">
                toque nas abas ↓
              </Handnote>
              <FaroAIShowcase />
              <FictionalNote dark className="mt-5" />
            </div>

            <div className="min-w-0 md:col-start-1 md:row-start-2">
              {/* As quatro coisas que ele faz, em uma grade curta. */}
              <ul className="grid grid-cols-2 gap-2.5 md:mt-6">
                {PRO_FUNCOES.map((f, i) => (
                  <li
                    key={f.title}
                    className="rise rounded-2xl bg-cream/[0.06] p-3"
                    style={{ "--d": `${200 + i * 90}ms` } as React.CSSProperties}
                  >
                    <p className="flex items-center gap-1.5 text-sm font-bold">
                      <f.icon className="h-4 w-4 text-pink" /> {f.title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-cream/65">{f.body}</p>
                  </li>
                ))}
              </ul>

              {/* Os dois planos do FarejAI, lado a lado. */}
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {[
                  { nome: PLANS.CAO.name, preco: PLANS.CAO.priceMonthly, quando: "coleta a cada 3 dias" },
                  { nome: PLANS.DETETIVE.name, preco: PLANS.DETETIVE.priceMonthly, quando: "coleta todo dia" },
                ].map((p) => (
                  <div key={p.nome} className="rounded-2xl border border-cream/15 p-3">
                    <p className="text-[12px] font-semibold text-cream/70">{p.nome}</p>
                    <p className="mt-0.5 text-xl font-bold tracking-tight">
                      {brl(p.preco)}
                      <span className="text-xs font-medium text-cream/55">/mês</span>
                    </p>
                    <p className="text-[11.5px] text-cream/55">{p.quando}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                {/* Os planos ficam aqui mesmo, mais abaixo — sem trocar de página. */}
                <a
                  href="#planos"
                  className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-pink px-6 py-3 font-bold text-ink transition hover:opacity-90"
                >
                  Ver os planos <ArrowRight className="h-4 w-4" />
                </a>
                <p className="text-[13px] leading-snug text-cream/55">
                  Cancele quando quiser. Só um perfil?{" "}
                  <b className="font-semibold text-cream/80">{SINGLE_UNLOCK.name}, {brl(SINGLE_UNLOCK.price)}</b>.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ——— 10 · Planos ——— */}
      <section id="planos" className="scroll-mt-10 bg-background">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal className="text-center">
            <Eyebrow>Planos</Eyebrow>
            <SectionTitle className="mt-4">Escolha como farejar.</SectionTitle>
            <Handnote tilt={-3} heart className="mt-3">
              sem fidelidade, cancele quando quiser
            </Handnote>
          </Reveal>
          <PlanosCards className="mt-10" />
          <p className="mt-8 text-center text-sm text-muted-foreground">
            O Farejador libera <b className="text-foreground">um perfil</b> (o + dá mais por 7 dias); o Faro de Cão e o Detetive acompanham{" "}
            <b className="text-foreground">um perfil</b> ao longo do tempo. Todas as funcionalidades valem
            dentro das franquias de cada plano.
          </p>
          <TrustLine className="mt-2 text-center" />
        </div>
      </section>

      {/* ——— Perguntas frequentes ——— */}
      <section id="perguntas" className="bg-white scroll-mt-10">
        <div className="mx-auto max-w-3xl px-6 py-24">
        <Reveal className="text-center">
          <Eyebrow>Dúvidas</Eyebrow>
          <SectionTitle className="mt-4">Perguntas frequentes</SectionTitle>
          <Handnote tone="accent" tilt={-4} className="mt-3">
            a gente responde ♥
          </Handnote>
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
        </div>
      </section>

      {/* ——— Guias ——— */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Reveal>
              <Eyebrow>Guias</Eyebrow>
              <SectionTitle className="mt-4">Entenda os rastros.</SectionTitle>
              <Handnote tilt={-3} className="mt-2">
                leituras rapidinhas
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

      <SiteFooter />

      {/* A search that follows you down the page. */}
      {/* Sai de cena nos blocos densos: lá ela cobria texto, listas e cartões. */}
      <FloatingSearch hideWhenVisible={["comecar", "rodape", "pro", "planos", "perguntas"]} />
    </main>
  );
}
