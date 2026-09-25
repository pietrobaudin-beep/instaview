"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Loader2, Lock, PawPrint, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { Panel, PersonRow, StatusPill } from "@/components/ui/brand";
import {
  OtherNetworks,
  ProfileHero,
  type HeroProfile,
  type RedesIniciais,
} from "@/components/profile-hero";
import {
  FollowsBreakdown,
  OtherInteractions,
  TopInteraction,
  type Breakdown,
  type Person,
} from "@/components/follows-breakdown";
import { ProDashboard } from "@/components/pro-dashboard";
import { HistoryPanel } from "@/components/history-panel";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { AnalysisLoading, type RevealProfile } from "@/components/analysis-loading";
import { markSeen, wasSeenRecently } from "@/lib/seen-profiles";
import { BRAND, LOADING_LINES } from "@/lib/voice";
import { FaroUpsell } from "@/components/faro-upsell";
import { SingleUnlockButton } from "@/components/single-unlock-button";
import { NoteBox } from "@/components/ui/brand";
import { Mascot } from "@/components/ui/mascot";
import { guessGender } from "@/lib/gender";
import { AboutLine, RaioX } from "@/components/raio-x";
import { ProfileStories } from "@/components/story-viewer";
import type { Section } from "@/lib/raio-x";

interface RecentItem extends Person {
  detectedAt: string;
}

// Faro AI's loading lines. They cycle while the provider answers — the sequence
// ends when the profile arrives, not on a clock.
const STEPS = LOADING_LINES;
/** One line every ~2.4s while Faro AI searches. */
const STEP_MS = 2400;
/**
 * O mínimo que a cena de busca ocupa a tela.
 *
 * Era de **9 segundos**: o perfil chegava em 1s e a pessoa ficava olhando o
 * cachorro correr por mais 8. Agora é só o tempo de a cena não piscar — se a
 * resposta vier antes, ela aparece.
 */
const MIN_SEARCH_MS = 900;

/**
 * Quanto a cena de busca espera pelas outras redes antes de desistir.
 *
 * A tela só termina quando o "mesmo @ em outras redes" responde — **inteiro**,
 * com as fotos. Antes a espera cobria só as redes de graça, e a foto do TikTok
 * (que vem pelo Apify) chegava depois, com o perfil já montado: a linha pulava
 * de desenho para foto na frente de quem estava lendo.
 *
 * Mas espera **com teto**: rede lenta ou fora do ar não pode prender ninguém
 * olhando o cachorro correr. Estourado o prazo, a análise entra e o bloco se
 * completa sozinho quando chegar.
 *
 * 10s porque agora a espera inclui o Apify. O @ que já está no cache responde
 * em ~1,5s; o teto é para o @ novo, em que um ator pode demorar.
 */
const TETO_REDES_MS = 10000;

/**
 * Quanto a cena espera pela ANÁLISE antes de soltar a tela.
 *
 * Sem isto, a cena soltava em 10s (o teto das outras redes) e a análise ainda
 * estava no ar — medido em 24/09: de 5 a 11 segundos, mais desde que a IA
 * entrou no caminho. Nesse intervalo a tela mostrava o perfil no estado
 * **trancado**: cartões de "desbloqueie", listas borradas, nenhum painel. Quem
 * paga via a tela de quem não paga por alguns segundos e concluía, com razão,
 * que tinha quebrado.
 *
 * Maior que o das redes de propósito: as redes são um bloco a mais, a análise
 * é a tela inteira. Estourado o prazo, a tela entra assim mesmo e se completa
 * quando a resposta chegar — esperar para sempre seria pior.
 */
const TETO_ANALISE_MS = 18000;

/**
 * Quantas pessoas a lista de "Novos seguindo" mostra.
 *
 * A leitura traz as 50 mais recentes — e as 50 continuam valendo para a conta
 * de mulheres e homens, que é uma estatística. Mas cinquenta linhas seguidas
 * viram rolagem sem fim, e as últimas já são de meses atrás. Dez é o que se lê
 * de uma vez.
 */
const MAX_SEGUINDO = 10;

const TABS = [
  { value: "visao", label: "Visão geral" },
  // Stories não é aba: abre em tela cheia pela foto do perfil, como no
  // Instagram. A seção continua existindo na API, só não tem entrada aqui.
  //
  // Posts saiu da tela em 23/09, junto com Reels (21/09): as duas eram mais
  // uma leitura paga por dia em cada perfil do Faro AI, e o que a pessoa vem ver
  // aqui é o movimento — quem entrou, quem saiu, com quem anda. As seções
  // continuam existindo na API.
  { value: "seguindo", label: "Seguindo" },
  { value: "interacoes", label: "Interações" },
  { value: "tagged", label: "Marcações" },
  // Destaques saiu da tela em 23/09: a prévia do grátis era um punhado de
  // círculos vazios, e para quem paga era mais uma leitura por perfil. A
  // seção continua existindo na API.
  // Reposts e "Parecidos" saíram da tela: pouca gente abria e cada uma era
  // mais uma requisição paga. "Sobre" também deixou de ser aba — virou a linha
  // em letra miúda no rodapé de todas as seções. As três seguem na API.
  { value: "historico", label: "Rastro" },
] as const;

type Tab = (typeof TABS)[number]["value"];

// Tabs served by the Raio-X (one provider request each, fetched when opened).
const RAIO_X_TABS: readonly Section[] = ["stories", "posts", "reels", "tagged", "highlights", "reposts", "suggested", "about"];
const isRaioX = (t: Tab): t is Tab & Section => (RAIO_X_TABS as readonly string[]).includes(t);

/**
 * As abas da análise, todas numa faixa só.
 *
 * Antes eram cinco em linha e um menu "Mais" com o resto: com onze abas, as
 * pílulas lado a lado viravam um muro. Hoje são seis, e seis cabem — no
 * computador elas se acomodam em duas linhas, e no celular a faixa rola de
 * lado. Um menu escondendo metade das abas custava um toque a mais para
 * achar o que já cabia na tela.
 *
 * Cada aba continua valendo **uma** requisição, aberta só quando escolhida:
 * juntar seções numa aba só faria o clique custar o dobro.
 */
function Abas({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const faixa = React.useRef<HTMLDivElement>(null);

  /*
   * No celular a aba escolhida pode estar fora da vista — seja porque a pessoa
   * rolou a faixa, seja porque a escolha veio de outro lugar da tela. Trazê-la
   * para o centro é o que mostra, de quebra, que a faixa rola.
   *
   * `block: "nearest"` para a página não dar um pulo vertical junto.
   */
  const anterior = React.useRef(value);
  React.useEffect(() => {
    // Só quando a aba MUDA de verdade. Na montagem, não: a faixa costuma estar
    // abaixo da dobra, e `scrollIntoView` traria a PÁGINA até ela — quem abre o
    // perfil caía direto nas abas, sem ver a foto e os números.
    //
    // Comparar o valor, e não um "já montou": em desenvolvimento o React roda
    // cada efeito duas vezes, e uma bandeira de montagem escorrega na segunda.
    if (anterior.current === value) return;
    anterior.current = value;
    const ativa = faixa.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    ativa?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [value]);

  return (
    <div className="relative -mx-5 mt-3 sm:mx-0">
      <div
        ref={faixa}
        role="tablist"
        aria-label="O que você quer ver"
        className="sem-barra flex items-center gap-2 overflow-x-auto px-5 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={value === t.value}
            onClick={() => onChange(t.value)}
            className={`min-h-[44px] shrink-0 rounded-2xl px-4 text-sm font-semibold transition ${
              value === t.value
                ? "bg-pink text-ink"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* As dobras das pontas: sem barra de rolagem à vista, são elas que
          dizem que tem mais aba adiante — e que a faixa rola. Só no celular,
          e sem roubar o toque de quem passa por cima. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent sm:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden"
      />
    </div>
  );
}

/**
 * O fundo da tela de limite: a silhueta de uma análise, borrada.
 *
 * São barras e círculos cinzas — nenhum dado real, nenhum nome inventado. A
 * análise nem chegou a ser pedida ao provedor (é para isso que o limite
 * existe), então não há o que borrar de verdade. O papel desta peça é só
 * dizer, pela forma, que tem uma tela inteira do outro lado.
 */
function EsqueletoBorrado() {
  const linhas = [0, 1, 2, 3, 4];
  return (
    <div className="space-y-5 blur-[6px]">
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-40 max-w-full rounded bg-muted" />
            <div className="h-3 w-24 max-w-full rounded bg-muted/70" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-6 w-14 rounded bg-muted" />
              <div className="h-2.5 w-16 rounded bg-muted/70" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="h-4 w-44 max-w-full rounded bg-muted" />
        <ul className="mt-4 space-y-4">
          {linhas.map((i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3 w-32 max-w-full rounded bg-muted" />
                <div className="h-2.5 w-20 max-w-full rounded bg-muted/70" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GenderBadge({ gender }: { gender?: "f" | "m" | "u" }) {
  if (gender === "f")
    return (
      <span className="shrink-0 rounded-full border border-pink bg-pink/40 px-2 py-0.5 text-[11px] font-semibold text-accent">
        Mulher
      </span>
    );
  if (gender === "m")
    return (
      <span className="shrink-0 rounded-full border border-purple bg-purple/40 px-2 py-0.5 text-[11px] font-semibold text-[#5B47C4]">
        Homem
      </span>
    );
  return null;
}

/** Quem entrou e quem saiu da lista, pelas coletas do Faro AI. */
function MudancasDoFaro({
  username,
  recent,
}: {
  username: string;
  recent: { started: RecentItem[]; stopped: RecentItem[] };
}) {
  const Linha = ({ titulo, pessoas }: { titulo: string; pessoas: RecentItem[] }) => (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-plum/50">{titulo}</p>
      {pessoas.length ? (
        <ul className="sem-barra -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
          {pessoas.map((p) => (
            <li key={p.username} className="w-16 shrink-0 text-center">
              <a href={`/p/${encodeURIComponent(p.username)}`}>
                <PersonAvatar p={p} />
                <p className="mt-1 truncate text-[11px] font-semibold">@{p.username}</p>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-1 text-sm text-muted-foreground">Nada detectado ainda.</p>
      )}
    </div>
  );
  return (
    <Panel
      title="No seu Faro AI"
      action={
        <Link
          href={`/rastros/${encodeURIComponent(username)}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-accent"
        >
          Abrir o painel <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <div className="space-y-5">
        <Linha titulo="Começou a seguir" pessoas={recent.started} />
        <Linha titulo="Deixou de seguir" pessoas={recent.stopped} />
      </div>
    </Panel>
  );
}

function PersonAvatar({ p }: { p: RecentItem }) {
  return <Avatar src={p.avatarUrl} name={p.displayName ?? p.username} size={56} className="mx-auto" />;
}

type Pronto = {
  locked: boolean;
  precisaConfirmar?: boolean;
  analises?: { usados: number; limite: number; restam: number } | null;
  falhou?: string | null;
} | null;

/**
 * O que a Visão geral oferece quando a análise não está revelada — uma coisa
 * de cada vez, a certa para quem está olhando:
 *
 * - quem assina e ainda tem análise: **perguntar** antes de gastar;
 * - quem assina e acabou: dizer que acabou, sem vender o que já tem;
 * - Curioso sem conta: o convite para criar conta e revelar;
 * - Curioso com conta: a revelação grátis do destaque, e o Farejador.
 *
 * Por trás, a silhueta da análise — formas, não dados: nada foi coletado
 * para ser borrado, e nada é inventado para encher a tela.
 */
function Oferta({
  username,
  loggedIn,
  planoPro,
  ready,
  confirmando,
  onConfirmar,
  revelacao,
  revelado,
  semDados,
  onRevelar,
  temPrevia = false,
}: {
  /** A prévia real (números e seguidos borrados) já está na tela. */
  temPrevia?: boolean;
  username: string;
  loggedIn: boolean;
  planoPro: boolean;
  ready: Pronto;
  confirmando: boolean;
  onConfirmar: () => void;
  revelacao:
    | { kind: "idle" }
    | { kind: "busy" }
    | { kind: "usada"; em: string | null }
    | { kind: "sem_dados" }
    | { kind: "privado" };
  revelado: Person | null;
  semDados: boolean;
  onRevelar: () => void;
}) {
  const falhou: Record<string, string> = {
    privado: "O perfil é privado: a análise não mostra o que o Instagram fecha. Nada foi descontado.",
    nao_encontrado: "Não existe conta com esse @. Nada foi descontado.",
    indisponivel: "Não deu para ler o perfil agora. Nada foi descontado — tente de novo daqui a pouco.",
  };

  let corpo: React.ReactNode;
  if (ready?.falhou) {
    corpo = <p className="text-sm">{falhou[ready.falhou] ?? falhou.indisponivel}</p>;
  } else if (planoPro && ready?.precisaConfirmar && ready.analises) {
    corpo = (
      <>
        <h2 className="text-lg font-bold">Analisar @{username}?</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Usa <b>1</b> das análises do seu plano neste ciclo — restam{" "}
          <b>
            {ready.analises.restam} de {ready.analises.limite}
          </b>
          . Depois, reabrir este perfil não gasta nada.
        </p>
        <Button variant="accent" size="lg" onClick={onConfirmar} disabled={confirmando} className="mt-2">
          {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Usar 1 análise em @{username}
        </Button>
      </>
    );
  } else if (planoPro) {
    corpo = (
      <>
        <h2 className="text-lg font-bold">As análises novas deste ciclo acabaram.</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Elas renovam no próximo ciclo. Reabrir um perfil que você já analisou continua livre.
        </p>
        <Link href={`/pricing?next=${encodeURIComponent(`/p/${username}`)}`} className="mt-2">
          <Button variant="outline">Ver os planos</Button>
        </Link>
      </>
    );
  } else if (!loggedIn) {
    corpo = (
      <>
        <h2 className="text-lg font-bold">
          Crie sua conta grátis para ver com quem @{username} mais interage.
        </h2>
        <Link
          href={`/signup?next=${encodeURIComponent(`/p/${username}?revelar=1`)}`}
          className="mt-2"
        >
          <Button variant="accent" size="lg">
            Criar conta e revelar <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link
          href={`/login?next=${encodeURIComponent(`/p/${username}?revelar=1`)}`}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          já tenho conta
        </Link>
      </>
    );
  } else {
    const jaRevelou = !!revelado || semDados;
    corpo = (
      <>
        {revelado ? (
          <h2 className="text-lg font-bold">Desbloqueie todas as informações de @{username}.</h2>
        ) : semDados || revelacao.kind === "sem_dados" ? (
          <p className="max-w-sm text-sm">
            Ainda não temos informações suficientes para revelar esta pista. Sua revelação grátis
            continua disponível.
          </p>
        ) : revelacao.kind === "usada" ? (
          <p className="max-w-sm text-sm">
            Sua revelação grátis já foi usada
            {revelacao.em ? (
              <>
                {" "}
                em{" "}
                <Link href={`/p/${encodeURIComponent(revelacao.em)}`} className="font-bold underline">
                  @{revelacao.em}
                </Link>
              </>
            ) : null}
            . Ela vale uma vez por conta.
          </p>
        ) : revelacao.kind === "privado" ? (
          <p className="max-w-sm text-sm">O perfil é privado — não há interações públicas para revelar.</p>
        ) : (
          <>
            <h2 className="text-lg font-bold">Revele quem mais aparece nas interações de @{username}.</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Grátis, uma vez por conta. É uma pista a partir de sinais públicos dos posts — não prova de
              relação.
            </p>
            <Button variant="accent" size="lg" onClick={onRevelar} disabled={revelacao.kind === "busy"} className="mt-2">
              {revelacao.kind === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Revelar grátis
            </Button>
          </>
        )}
        {(jaRevelou || revelacao.kind === "usada") && (
          <p className="max-w-sm text-sm text-muted-foreground">
            Veja o perfil inteiro com o Farejador, ou acompanhe com o Faro AI.
          </p>
        )}
      </>
    );
  }
  // Depois da pista grátis, o próximo passo é pagar — os dois caminhos de
  // antes, lado a lado: este perfil (Farejador) ou acompanhar (planos).
  const mostrarPagos =
    loggedIn && !planoPro && (!!revelado || semDados || revelacao.kind === "usada" || revelacao.kind === "sem_dados");

  // A prévia trancada à vista, e o convite EMBAIXO dela — sem tapar nada.
  // Com o destaque já revelado, o bloco "mais interação" aparece de verdade
  // lá em cima; aqui ele sai, para não repetir.
  return (
    <div className="space-y-5">
      {/* Com a prévia de verdade (números e seguidos borrados) lá em cima,
          as formas são dispensáveis. Sem ela — cota da prévia usada, lista
          fechada — as formas mostram o que existe do outro lado. */}
      {!temPrevia && <PreviaTrancada username={username} semDestaque />}
      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-pink bg-pink/15 px-5 py-8 text-center">
        {corpo}
      </div>
      {mostrarPagos && <UpgradeCard username={username} />}
    </div>
  );
}

/**
 * Os blocos da análise, trancados: mesmos títulos e mesmo desenho de quando
 * estão revelados, com o conteúdo borrado. São formas, não dados — nada foi
 * lido do provedor para ser borrado, e nada é inventado.
 */
function PreviaTrancada({ username, semDestaque = false }: { username: string; semDestaque?: boolean }) {
  const cadeado = (
    <Link
      href={`/pricing?next=${encodeURIComponent(`/p/${username}`)}`}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
    >
      <Lock className="h-3 w-3" /> Trancado
    </Link>
  );
  const Barra = ({ label, largura, cor }: { label: string; largura: string; cor: string }) => (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="blur-[5px]">00</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full blur-[2px] ${cor}`} style={{ width: largura }} />
      </div>
    </div>
  );
  const Pessoa = () => (
    <div className="flex items-center gap-3 blur-[5px]">
      <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-32 max-w-full rounded bg-muted" />
        <div className="h-3 w-20 max-w-full rounded bg-muted/70" />
      </div>
    </div>
  );

  return (
    <div aria-label="Prévia trancada da análise" className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Quem essa pessoa segue" action={cadeado}>
          <div className="space-y-3">
            <Barra label="Mulheres" largura="58%" cor="bg-pink" />
            <Barra label="Homens" largura="42%" cor="bg-purple" />
          </div>
        </Panel>
        {!semDestaque && (
          <Panel title="👀 Parece ter mais interação com" action={cadeado}>
            <Pessoa />
          </Panel>
        )}
      </div>
      <Panel title="Pessoas que aparecem bastante" action={cadeado}>
        <div className="flex justify-around gap-3 blur-[5px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-14 w-14 rounded-full bg-muted" />
              <div className="h-2.5 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/**
 * The upgrade block shown to free visitors: two honest options — see only this
 * profile once ("uso único"), or subscribe to follow it over time (PRO).
 */
function UpgradeCard({ username, planoPro = false }: { username: string; planoPro?: boolean }) {
  // Quem assina não compra Farejador: esta parte abre quando ele usa uma
  // análise do plano neste perfil — e isso é feito na Visão geral.
  if (planoPro) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-center">
        <p className="text-sm">
          Esta parte abre quando você usar <b>1 análise do seu plano</b> em @{username}. O botão fica
          na <b>Visão geral</b>.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
    <div className="flex flex-col rounded-3xl border border-border bg-card p-6 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Unlock className="h-5 w-5 text-vinho" />
      </span>
      <h2 className="text-lg font-bold">Só quer ver este perfil?</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
        Desbloqueie a análise completa de @{username}, sem censura, com um pagamento único.
      </p>
      <SingleUnlockButton username={username} className="mt-auto pt-5" />
    </div>
    <div className="rounded-3xl border-2 border-pink bg-pink/20 p-6 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink text-ink">
        <Lock className="h-5 w-5" />
      </span>
      <h2 className="text-lg font-bold">Quer acompanhar o que mudar daqui pra frente?</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {BRAND.phrases.naoProcure}
      </p>
      <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm">
        {[
          "📌 Faro de Cão: um perfil acompanhado a cada 3 dias",
          "🐾 Faro de Detetive: acompanhamento diário e todo o Faro AI",
          "🔔 Pistas quando o Faro AI detectar uma mudança",
        ].map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="text-foreground/80">{b}</span>
          </li>
        ))}
      </ul>
      <Link href={`/pricing?next=${encodeURIComponent(`/p/${username}`)}`} className="mt-5 block">
        <Button variant="accent" size="lg" className="w-full sm:w-auto">
          Conhecer os planos <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <Link
        href={`/login?next=${encodeURIComponent(`/p/${username}`)}`}
        className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground"
      >
        já tem conta? entrar
      </Link>
    </div>
    </div>
  );
}

export function ProfileView({
  username,
  loggedIn,
  planoPro = false,
  temFaro = false,
}: {
  username: string;
  loggedIn: boolean;
  /** A pessoa que está olhando assina. Vem da sessão, no servidor. */
  planoPro?: boolean;
  /** O plano dela acompanha perfis (Cão, Detetive, antigo, Admin). */
  temFaro?: boolean;
}) {
  const router = useRouter();

  const [state, setState] = React.useState<
    | { kind: "loading" }
    | { kind: "ok"; data: HeroProfile; note?: string }
    | { kind: "error" }
    | { kind: "limited"; spentOn: string | null }
  >({ kind: "loading" });

  const [following, setFollowing] = React.useState<
    | { kind: "loading" }
    | { kind: "private" }
    | {
        kind: "ready";
        /** Público, mas com a lista de "seguindo" fechada por quem é olhado. */
        seguindoOculto?: boolean;
        locked: boolean;
        access: "free" | "single" | "pro";
        users: Person[];
        real: boolean;
        counts?: Breakdown;
        recent?: { started: RecentItem[]; stopped: RecentItem[] };
        /** Quem assina e ainda não gastou análise NESTE perfil: perguntar antes. */
        precisaConfirmar?: boolean;
        analises?: { usados: number; limite: number; restam: number } | null;
        /** A coleta não entregou (privado, inexistente, fora do ar). Nada foi descontado. */
        falhou?: string | null;
        coletadoEm?: string | null;
        expiraEm?: string | null;
      }
  >({ kind: "loading" });
  /** Muda depois de uma análise gasta: as outras partes da tela releem. */
  const [versao, setVersao] = React.useState(0);
  const [confirmando, setConfirmando] = React.useState(false);

  const [interactions, setInteractions] = React.useState<{
    locked: boolean;
    items: Person[];
    /** Curioso com conta: o destaque revelado, ou `semDados`. */
    revelado?: Person | null;
    semDados?: boolean;
  }>({
    locked: true,
    items: [],
  });
  const [revelacao, setRevelacao] = React.useState<
    { kind: "idle" } | { kind: "busy" } | { kind: "usada"; em: string | null } | { kind: "sem_dados" } | { kind: "privado" }
  >({ kind: "idle" });

  const [tab, setTab] = React.useState<Tab>("visao");
  // Os stories abrem em tela cheia pela foto, não como aba.
  const [storiesAbertos, setStoriesAbertos] = React.useState(false);
  /**
   * Tem story? `null` = ainda não dá para saber.
   *
   * A pergunta só é feita ao **cache** (`cached=1`), que não custa nada. Saber
   * de verdade exigiria a requisição paga em todo perfil aberto, e o anel some
   * de qualquer jeito assim que uma abertura mostrar que não há nenhum.
   *
   * **Conta privada nunca tem.** O provedor recusa story de perfil privado
   * (`publicUser` lança `PRIVATE`), então o anel ali prometia uma coisa que
   * não ia acontecer: a pessoa tocava na foto e não vinha nada.
   */
  const [temStories, setTemStories] = React.useState<boolean | null>(null);
  const [step, setStep] = React.useState(0);
  const [analyzing, setAnalyzing] = React.useState(true);
  /** As outras redes, buscadas JUNTO com a análise — ver `TETO_REDES_MS`. */
  const [redes, setRedes] = React.useState<RedesIniciais | null>(null);
  const [redesProntas, setRedesProntas] = React.useState(false);
  /** Estourou o tempo de esperar a análise: entra do jeito que estiver. */
  const [analiseDemorou, setAnaliseDemorou] = React.useState(false);
  React.useEffect(() => {
    setAnaliseDemorou(false);
    const id = window.setTimeout(() => setAnaliseDemorou(true), TETO_ANALISE_MS);
    return () => window.clearTimeout(id);
  }, [username]);
  const [tracking, setTracking] = React.useState({ saved: false, busy: false });
  const [upsell, setUpsell] = React.useState(false);
  /**
   * "O Faro AI está cheio" — que NÃO é "você não tem plano".
   *
   * A rota devolve 402 nos dois casos: sem PRO (`code: "pro_required"`) e com
   * PRO mas sem vaga. A tela tratava os dois como falta de plano e abria o
   * convite "Desbloquear Farejo PRO" — para quem já assina e só precisava
   * abrir uma vaga. Aqui fica a mensagem do servidor, que já vem escrita.
   */
  const [faroCheio, setFaroCheio] = React.useState<string | null>(null);
  const [justPinned, setJustPinned] = React.useState(false);

  // Is this profile already in the user's Faro AI? DB read only — no provider call.
  // The answer also decides whether the search scene plays: a profile you
  // already follow is not a new discovery, so it opens straight away.
  const [inFaro, setInFaro] = React.useState<boolean | null>(loggedIn ? null : false);
  React.useEffect(() => {
    if (!loggedIn) {
      setInFaro(false);
      return;
    }
    let alive = true;
    setInFaro(null);
    fetch(`/api/profile-history?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((b) => {
        if (!alive) return;
        if (b.saved) setTracking({ saved: true, busy: false });
        setInFaro(!!b.saved);
      })
      .catch(() => alive && setInFaro(false));
    return () => {
      alive = false;
    };
  }, [loggedIn, username]);

  // Already seen this @ recently? Then skip the scene and go straight to the
  // result. Decided after mount (storage is client-only) and before anything
  // is drawn, so a revisit never flashes the pink screen.
  const [joined, setJoined] = React.useState<string | null>(null);
  const [searchedEnough, setSearchedEnough] = React.useState(false);
  const [intro, setIntro] = React.useState<"pending" | "play" | "skip">("pending");
  React.useEffect(() => {
    setIntro("pending");
    if (wasSeenRecently(username)) {
      setIntro("skip");
      return;
    }
    // Profiles in the Faro AI open straight away — you already farejou this one,
    // and the Faro AI reads it every day anyway.
    if (inFaro === true) {
      setIntro("skip");
      return;
    }
    if (inFaro === false) {
      setIntro("play");
      return;
    }
    // Still asking: start the scene anyway if the answer takes too long, so a
    // slow database never leaves the page blank.
    const id = window.setTimeout(() => setIntro("play"), 900);
    return () => window.clearTimeout(id);
  }, [username, inFaro]);

  // Pergunta ao cache se este perfil tinha story na última leitura. É grátis:
  // `cached=1` nunca chama o provedor. Miss = continua sem saber.
  React.useEffect(() => {
    let vivo = true;
    setTemStories(null);

    // Só pergunta depois de saber quem é o perfil: antes disso a resposta não
    // muda nada na tela, e para conta privada a pergunta nem faz sentido —
    // story de perfil privado não existe para nós.
    if (state.kind !== "ok") return;
    if (state.data.isPrivate) {
      setTemStories(false);
      return;
    }

    fetch(`/api/raio-x?username=${encodeURIComponent(username)}&section=stories&cached=1`)
      .then((r) => r.json())
      .then((b) => {
        if (!vivo) return;
        if (b?.status === "ok" && Array.isArray(b?.data?.items)) setTemStories(b.data.items.length > 0);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [username, state.kind, state.kind === "ok" && state.data.isPrivate]);

  // Remember it once the scene has played through to the result. Only then:
  // a skipped revisit must not push the 24h window forward, or someone coming
  // back every day would never see a fresh search play again.
  React.useEffect(() => {
    if (intro === "play" && !analyzing && state.kind === "ok") markSeen(username);
  }, [intro, analyzing, state.kind, username]);

  // Faro AI searching: the lines cycle while the provider is still answering. The
  // scene no longer runs on a fixed clock — it ends when the profile arrives.
  React.useEffect(() => {
    if (intro !== "play") {
      if (intro === "skip") setAnalyzing(false);
      return;
    }
    setStep(0);
    setAnalyzing(true);
    setSearchedEnough(false);
    const floor = window.setTimeout(() => setSearchedEnough(true), MIN_SEARCH_MS);
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % LOADING_LINES.length;
      setStep(i);
    }, STEP_MS);
    return () => {
      clearInterval(id);
      window.clearTimeout(floor);
    };
  }, [intro, username]);

  /*
   * As outras redes começam a ser buscadas no primeiro instante, em paralelo
   * com tudo.
   *
   * Duas coisas que custaram medição para descobrir:
   *
   * 1. Antes esta busca só começava quando o bloco entrava na tela — ou seja,
   *    **depois** da cena de carregamento. Agora corre junto, e o resultado é
   *    passado pronto para o bloco: uma requisição, não duas.
   * 2. Ela não espera o `intro` virar "play". Esperava, e isso a fazia
   *    arrancar só depois da checagem de "este perfil está no Faro AI?" — para um
   *    @ novo, tarde demais: a cena desistia no teto e o bloco aparecia 2,4s
   *    depois da análise, que é exatamente o que se queria evitar.
   */
  React.useEffect(() => {
    let vivo = true;
    setRedes(null);
    setRedesProntas(false);

    const teto = window.setTimeout(() => vivo && setRedesProntas(true), TETO_REDES_MS);

    // Só as redes de graça. TikTok e YouTube (pagas) são sob demanda, pelo
    // botão no bloco de outras redes — dentro da franquia do plano.
    fetch(`/api/elsewhere?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((b) => vivo && setRedes(b))
      .catch(() => {})
      .finally(() => vivo && setRedesProntas(true));

    return () => {
      vivo = false;
      window.clearTimeout(teto);
    };
  }, [username]);

  // The profile is in: hand the loading screen over to the reveal. The real
  // picture only ever exists from here on.
  const reveal: RevealProfile | null =
    intro === "play" &&
    analyzing &&
    searchedEnough &&
    redesProntas &&
    // A análise entra na conta: soltar a tela sem ela mostrava o perfil
    // trancado para quem paga.
    (following.kind !== "loading" || analiseDemorou) &&
    state.kind === "ok"
      ? {
          username: state.data.username,
          displayName: state.data.displayName,
          avatarUrl: state.data.avatarUrl,
          isPrivate: state.data.isPrivate,
          joined,
        }
      : null;

  // "No Instagram desde…" — only when it is already cached, so the reveal never
  // costs a provider request of its own.
  React.useEffect(() => {
    if (intro !== "play" || state.kind !== "ok") return;
    let alive = true;
    fetch(`/api/raio-x?username=${encodeURIComponent(username)}&section=about&cached=1`)
      .then((r) => r.json())
      .then((b) => {
        const j = b?.status === "ok" ? b.data?.about?.joined : null;
        // Free visitors get it masked; a row of dots is not worth showing.
        if (alive && typeof j === "string" && !j.includes("•")) setJoined(j);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [intro, state.kind, username]);

  // A missing @ has nothing to reveal — but Faro AI still gets his moment of
  // searching before giving up, or the pink screen just blinks.
  React.useEffect(() => {
    if (state.kind === "error" && (searchedEnough || intro !== "play")) setAnalyzing(false);
  }, [state.kind, searchedEnough, intro]);

  React.useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    const minimal: HeroProfile = {
      username,
      displayName: null,
      avatarUrl: null,
      bio: null,
      isVerified: false,
      isPrivate: false,
      followersCount: 0,
      followingCount: 0,
      analyzedAt: null,
    };
    (async () => {
      try {
        const res = await fetch(`/api/profile-preview?username=${encodeURIComponent(username)}`);
        if (!alive) return;
        if (res.ok) setState({ kind: "ok", data: await res.json() });
        else if (res.status === 404) setState({ kind: "error" });
        else if (res.status === 402) {
          const b = await res.json().catch(() => ({}));
          setState({ kind: "limited", spentOn: b.spentOn ?? null });
        }
        else if (res.status === 429)
          setState({
            kind: "ok",
            data: minimal,
            note: "Limite de análises de hoje atingido. Tente novamente mais tarde.",
          });
        else
          setState({
            kind: "ok",
            data: minimal,
            note: "Não foi possível carregar os dados do perfil agora.",
          });
      } catch {
        if (alive)
          setState({
            kind: "ok",
            data: minimal,
            note: "Não foi possível carregar os dados do perfil agora.",
          });
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  // Nothing to analyse if the free analysis is spent.
  React.useEffect(() => {
    if (state.kind === "limited") setAnalyzing(false);
  }, [state.kind]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/interactions?username=${encodeURIComponent(username)}`);
        const b = await r.json();
        if (alive)
          setInteractions({
            locked: !!b.locked,
            items: b.items ?? [],
            revelado: b.revelado ?? null,
            semDados: !!b.semDados,
          });
      } catch {
        /* stays locked */
      }
    })();
    return () => {
      alive = false;
    };
  }, [username, versao]);

  React.useEffect(() => {
    let alive = true;
    setFollowing({ kind: "loading" });
    (async () => {
      try {
        let res = await fetch(`/api/following-preview?username=${encodeURIComponent(username)}`);
        if (!alive) return;
        let body = await res.json();
        // Farejador comprado, perfil no Faro AI ou consulta de antes: a coleta
        // já está paga, então é pedida sem perguntar.
        if (body.coletarAgora) {
          res = await fetch(`/api/following-preview?username=${encodeURIComponent(username)}&confirmar=1`);
          if (!alive) return;
          body = await res.json();
          setVersao((v) => v + 1);
        }
        if (res.status === 402 || body.limited) {
          setState({ kind: "limited", spentOn: body.spentOn ?? null });
          return;
        }
        if (body.private) {
          setFollowing({ kind: "private" });
          return;
        }
        setFollowing({
          kind: "ready",
          seguindoOculto: !!body.seguindoOculto,
          /*
           * Quem decide o acesso é o SERVIDOR, não o tamanho da lista.
           *
           * Aqui havia `locked: !!body.locked || !body.real` e
           * `access: body.real ? ... : "free"`, onde `real` é só
           * "a lista de seguindo veio com gente". A consequência, em 24/09:
           * um perfil que FECHOU a lista de quem segue derrubava o plano de
           * quem estava olhando — selo "GRÁTIS", tudo borrado, cartão de
           * "desbloqueie" para quem já assina.
           *
           * Lista vazia é informação sobre o perfil olhado. Nunca sobre quem
           * paga.
           */
          locked: !!body.locked,
          access: body.access ?? (body.locked ? "free" : "pro"),
          users: body.following ?? [],
          real: !!body.real,
          counts: body.counts ?? undefined,
          recent: body.recent,
          precisaConfirmar: !!body.precisaConfirmar,
          analises: body.analises ?? null,
          falhou: body.falhou ?? null,
          coletadoEm: body.coletadoEm ?? null,
          expiraEm: body.expiraEm ?? null,
        });
      } catch {
        if (alive)
          setFollowing({ kind: "ready", locked: true, access: "free", users: [], real: false });
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  const ready = following.kind === "ready" ? following : null;
  const paid = !!ready && !ready.locked;
  /*
   * O plano é do servidor, não da leitura.
   *
   * Em 24/09 uma conta pública que fechou a lista de "seguindo" derrubou a
   * leitura, o `catch` devolveu `access: "free"` — e a tela concluiu que quem
   * estava olhando não tinha plano: selo "GRÁTIS", tudo borrado, e o botão
   * "Colocar no Faro AI" abrindo o convite para assinar o que a pessoa já
   * assina. Quem paga não pode depender de um perfil de terceiro responder.
   *
   * `planoPro` vem da sessão, pela página. `ready.access` refina para o caso
   * do desbloqueio avulso, que é por perfil.
   */
  /*
   * Desde 24/09 ter plano não revela perfil nenhum sozinho: revela a análise
   * gasta NESTE perfil (ou o Farejador comprado para ele). `planoPro` só
   * decide o que a tela oferece.
   */
  const revelado = !!ready && !ready.locked;
  const isPro = revelado && ready?.access === "pro";

  /** Gasta uma análise da franquia neste perfil — só depois do clique. */
  async function confirmarAnalise() {
    setConfirmando(true);
    try {
      const res = await fetch(`/api/following-preview?username=${encodeURIComponent(username)}&confirmar=1`);
      const body = await res.json();
      if (res.status === 402 || body.limited) {
        setFollowing((f) => (f.kind === "ready" ? { ...f, precisaConfirmar: false, analises: { usados: body.used ?? 0, limite: body.limit ?? 0, restam: 0 } } : f));
        return;
      }
      if (body.private) {
        setFollowing({ kind: "private" });
        return;
      }
      setFollowing({
        kind: "ready",
        seguindoOculto: !!body.seguindoOculto,
        locked: !!body.locked,
        access: body.access ?? "free",
        users: body.following ?? [],
        real: !!body.real,
        counts: body.counts ?? undefined,
        recent: body.recent,
        falhou: body.falhou ?? null,
        coletadoEm: body.coletadoEm ?? null,
        expiraEm: body.expiraEm ?? null,
      });
      setVersao((v) => v + 1);
    } finally {
      setConfirmando(false);
    }
  }

  /** Curioso com conta: a revelação grátis do destaque, uma por conta. */
  async function revelar() {
    setRevelacao({ kind: "busy" });
    try {
      const r = await fetch("/api/revelacao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const b = await r.json().catch(() => ({}));
      if (b.ok) {
        setInteractions((i) => ({ ...i, revelado: b.destaque ?? null, semDados: !b.destaque }));
        setRevelacao({ kind: "idle" });
      } else if (b.motivo === "ja_usada") setRevelacao({ kind: "usada", em: b.em ?? null });
      else if (b.motivo === "privado") setRevelacao({ kind: "privado" });
      else setRevelacao({ kind: "sem_dados" });
    } catch {
      setRevelacao({ kind: "idle" });
    }
  }

  // Voltou do cadastro com `?revelar=1`: entrega a pista prometida, sem outro clique.
  React.useEffect(() => {
    if (!loggedIn || planoPro) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("revelar") !== "1") return;
    url.searchParams.delete("revelar");
    window.history.replaceState(null, "", url.toString());
    revelar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, planoPro, username]);

  async function startTracking() {
    if (!loggedIn) {
      router.push(`/signup?next=${encodeURIComponent(`/p/${username}`)}`);
      return;
    }
    // O plano não acompanha perfis: é a hora de mostrar os que acompanham.
    if (!temFaro) {
      setUpsell(true);
      return;
    }
    setFaroCheio(null);
    setTracking({ saved: false, busy: true });
    try {
      const r = await fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (r.status === 402) {
        setTracking({ saved: false, busy: false });
        const corpo = (await r.json().catch(() => null)) as
          | { error?: string; code?: string }
          | null;
        // Sem plano → é a hora de oferecer. Com plano e sem vaga → é recado,
        // não venda.
        if (corpo?.code === "pro_required") setUpsell(true);
        else setFaroCheio(corpo?.error ?? "Seu Faro AI está cheio.");
        return;
      }
      setTracking({ saved: r.ok, busy: false });
      if (r.ok) {
        setJustPinned(true);
        // Takes the baseline from the page already cached — no provider cost.
        fetch(`/api/following-preview?username=${encodeURIComponent(username)}`).catch(() => {});
      }
    } catch {
      setTracking({ saved: false, busy: false });
    }
  }

  const locked = !paid;
  /*
   * A análise ainda está no ar.
   *
   * Importa porque `locked` é `!paid`, e `paid` só existe quando a resposta
   * chega: enquanto ela não chega, a tela é idêntica à de quem não pagou —
   * cartões de "desbloqueie", listas borradas, nenhum painel. Na primeira
   * visita a cena de carregamento esconde isso; na segunda ela é pulada, e
   * quem paga via a tela de quem não paga por alguns segundos.
   *
   * Carregando não é o mesmo que trancado. A tela passa a dizer qual dos dois.
   */
  const carregandoAnalise = following.kind === "loading";
  // O destaque revelado ao Curioso com conta entra no lugar do primeiro lugar.
  // Para quem não paga, "interage bastante" é o gancho: só aparece de verdade
  // depois da revelação da conta grátis. A lista de seguindo não entra aqui —
  // seguir não é interagir.
  const topInteraction = interactions.revelado ?? (locked ? undefined : interactions.items[0] ?? ready?.users[0]);
  const others = interactions.items.length > 1 ? interactions.items.slice(1) : ready?.users ?? [];

  return (
    <>
      {loggedIn && <AppNav />}
      {/* Clip at the SCREEN edge, not the content column: Faro AI peeks out beside
          the card, and clipping at the column cut him down to a sliver. */}
      <div className="overflow-x-clip">
      <main className={`mx-auto max-w-5xl px-6 py-8 ${loggedIn ? "md:pl-[15.5rem]" : ""}`}>
        {/* Tighter when the profile shows: Faro AI's peeking area sits just below. */}
        <div
          className={`flex items-center justify-between ${
            !analyzing && state.kind === "ok" ? "mb-2" : "mb-8"
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>

          {/*
            * O plano de quem está olhando, no canto — não colado no @ da
            * pessoa, onde lia como se fosse dela ("nasa PRO").
            *
            * Aqui ele responde "com o que eu estou vendo esta tela?", que é a
            * pergunta certa: para quem paga, confirma o acesso; para quem não
            * paga, é o aviso de que a tela está limitada.
            */}
          <div className="flex items-center gap-2">
            {(() => {
              // `isPro` primeiro: ele vem da sessão e não depende de nenhuma
            // leitura dar certo. `ready.access` só refina o caso do
            // desbloqueio avulso, que é por perfil.
            const t = revelado ? (ready?.access ?? "free") : "free";
              if (t === "pro") return <StatusPill tone="yellow">ANÁLISE COMPLETA</StatusPill>;
              if (t === "single") return <StatusPill tone="dark">DESBLOQUEADO</StatusPill>;
              return <StatusPill tone="pink">PRÉVIA</StatusPill>;
            })()}
            {!loggedIn && <Logo className="h-6" />}
          </div>
        </div>

        {intro === "play" && (analyzing || state.kind === "loading") && (
          <AnalysisLoading
            step={step}
            steps={STEPS}
            username={username}
            reveal={reveal}
            onRevealDone={() => setAnalyzing(false)}
          />
        )}

        {/* Revisit: no scene, just a quick beat while the (cached) data arrives. */}
        {intro === "skip" && state.kind === "loading" && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <Mascot pose="lupa" className="h-16 text-vinho" bob />
            <p className="text-sm text-muted-foreground">Abrindo @{username}…</p>
          </div>
        )}

        {!analyzing && state.kind === "limited" && (
          <div className="relative isolate min-h-[78vh]">
            {/* A prévia por trás do convite: formas, não dados. Não há o que
                mostrar aqui — a análise nem foi pedida ao provedor, que é o
                ponto do limite. O que vale é dizer, com a tela, que TEM coisa
                do outro lado; o que não vale é inventar nome de ninguém. */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <EsqueletoBorrado />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/75 to-background" />
            </div>

            <div className="mx-auto max-w-md px-1 pt-[12vh]">
              <Panel>
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Mascot pose="feliz" className="h-20 text-vinho" bob />
                  {/* Quem paga e bateu no teto do MÊS não pode ler "sua
                      análise gratuita já foi usada": ele não é do grátis, e a
                      frase faz parecer que o plano sumiu. São duas situações
                      diferentes e agora têm dois textos diferentes. */}
                  <h1 className="text-2xl font-bold">
                    {planoPro
                      ? "As consultas de perfil novas deste ciclo acabaram"
                      : "Você já usou a consulta grátis"}
                  </h1>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {planoPro ? (
                      <>
                        Abrir um perfil que ninguém consultou há pouco é uma leitura paga, e o seu
                        plano inclui algumas por ciclo. Reabrir um @ que você já analisou{" "}
                        <b>continua livre</b>.
                      </>
                    ) : (
                      <>
                        A experiência grátis inclui <b>uma</b> consulta de perfil. Digite o @ de um
                        perfil já consultado, veja este com o Farejador, ou conheça os planos.
                      </>
                    )}
                  </p>
                  {!planoPro && (
                    <SingleUnlockButton username={username} className="mt-2 w-full max-w-xs" />
                  )}
                  <Link
                    href={planoPro ? "/rastros" : `/pricing?next=${encodeURIComponent(`/p/${username}`)}`}
                    className="w-full max-w-xs"
                  >
                    <Button variant="outline" size="lg" className="w-full">
                      {planoPro ? "Ir para o meu Faro AI" : "Conhecer os planos"}{" "}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  {state.spentOn && state.spentOn !== username && (
                    <Link
                      href={`/p/${encodeURIComponent(state.spentOn)}`}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      voltar para @{state.spentOn}
                    </Link>
                  )}
                  <Link
                    href={`/login?next=${encodeURIComponent(`/p/${username}`)}`}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    já tem conta? entrar
                  </Link>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {!analyzing && state.kind === "error" && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Mascot pose="duvida" className="h-32 text-vinho" decorative />
            <p className="mt-2 max-w-sm text-lg font-bold">
              Não achei esse perfil. Confere o @ e tenta de novo.
            </p>
            <p className="text-sm text-muted-foreground">
              O Faro AI procurou, mas não existe nenhuma conta com o @{username}.
            </p>
            <Link href="/">
              <Button variant="outline" size="sm">
                Tentar outro @
              </Button>
            </Link>
          </div>
        )}

        {!analyzing && state.kind === "ok" && (
          <>
            {/* O Faro AI não fica mais aparecendo e sumindo em volta do cartão:
                no perfil, o que interessa é o perfil. Ele corre no topo das
                telas de entrada, onde há espaço para brincar. */}
            <div>
              <ProfileHero
                profile={state.data}
                premium={revelado}
                note={state.note}
                tracking={tracking}
                locked={!revelado}
                onVerStories={
                  state.data.isPrivate || temStories === false
                    ? undefined
                    : () => setStoriesAbertos(true)
                }
                onTrack={following.kind === "private" ? undefined : startTracking}
              />
            </div>

            {storiesAbertos && (
              <ProfileStories
                username={state.data.username}
                avatarUrl={state.data.avatarUrl}
                onClose={() => setStoriesAbertos(false)}
                onVazio={() => setTemStories(false)}
              />
            )}

            {/* Faro AI cheio: recado com a saída, não convite para comprar o
                que a pessoa já tem. */}
            {faroCheio && (
              <NoteBox className="mt-4" icon={<PawPrint className="h-4 w-4" />}>
                <p className="font-bold">Seu Faro AI está cheio.</p>
                <p className="mt-0.5 text-sm opacity-80">{faroCheio}</p>
                <Link
                  href="/rastros"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-accent hover:underline"
                >
                  Ver quem está no meu Faro AI <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </NoteBox>
            )}

            {justPinned && (
              <NoteBox className="mt-4 items-center" icon={<Mascot pose="feliz" className="h-10 text-ink" decorative />}>
                <p className="font-bold">@{state.data.username} está no seu Faro AI. 🐶</p>
                <p className="text-sm opacity-80">
                  A partir de agora você receberá alertas sobre as mudanças disponíveis nesse
                  perfil.
                </p>
              </NoteBox>
            )}

            <FaroUpsell open={upsell} onClose={() => setUpsell(false)} next={`/p/${username}`} />

            {following.kind === "private" ? (
              <>
                {/* Uma barra no meio: o Faro AI de um lado, o recado do outro.
                    Ela separa o perfil, acima, das outras redes, abaixo. */}
                <div className="mt-4 flex items-center gap-4 rounded-3xl border border-border bg-card p-4">
                  <Mascot pose="duvida" className="h-16 shrink-0 text-vinho" decorative />
                  <div className="min-w-0">
                    <p className="text-base font-bold leading-snug">
                      Encontrei o perfil, mas não consigo farejar além daqui.
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      O Instagram só mostra quem uma conta privada segue para os seguidores
                      aprovados dela.
                    </p>
                  </div>
                </div>

                {/* O caminho que sobra: o mesmo @ em outra rede, onde o perfil
                    pode estar aberto. Só aparece quando a conta existe mesmo. */}
                <OtherNetworks
                  username={state.data.username}
                  isPrivate
                  destaque
                  inicial={redes}
                />

                <div className="mt-6 flex justify-center">
                  <Link href="/">
                    <Button variant="outline" size="sm">
                      Buscar outro @
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-6 text-lg font-bold">{BRAND.phrases.achamosUmRastro} 👀</p>
                {/* A roda saiu: no celular ela escondia as opções e exigia
                    adivinhar o que vinha depois. Agora são abas visíveis que
                    rolam de lado, iguais no celular e no computador. */}
                <Abas value={tab} onChange={setTab} />

                {tab === "visao" && (
                  <div className="mt-5 space-y-5">
                    {/* Dizer o que aconteceu, em vez de sumir com o painel.
                        A lista fechada é escolha de quem está sendo olhado —
                        não é falha do Farejo nem falta de plano de quem olha. */}
                    {ready?.seguindoOculto && (
                      <NoteBox icon={<Lock className="h-4 w-4" />}>
                        <span>
                          <b className="font-semibold">@{state.data.username}</b> fechou a lista de
                          quem ela segue nas configurações do Instagram. Isso é possível mesmo em
                          conta pública, e nenhum site consegue ler. O resto da análise continua
                          aqui: stories, marcações e os outros @ dela.
                        </span>
                      </NoteBox>
                    )}
                    {carregandoAnalise && (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analisando @{state.data.username}…
                      </div>
                    )}

                    {!carregandoAnalise && (
                    <>
                    <div className="grid gap-5 lg:grid-cols-2">
                      <FollowsBreakdown
                        counts={ready?.counts}
                        locked={locked}
                        username={state.data.username}
                        generoDoPerfil={guessGender(state.data.displayName, state.data.username)}
                      />
                      <TopInteraction
                        person={topInteraction}
                        locked={locked && !interactions.revelado}
                        username={state.data.username}
                      />
                    {locked && !interactions.revelado && (
                      <Panel title="👀 Interage bastante com">
                        <div className="flex items-center gap-3 blur-[5px]">
                          <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="h-3.5 w-32 max-w-full rounded bg-muted" />
                            <div className="h-3 w-20 max-w-full rounded bg-muted/70" />
                          </div>
                        </div>
                      </Panel>
                    )}
                    </div>
                    {locked ? (
                      ready && ready.users.length > 0 && (
                        <Panel title="Algumas das contas que segue">
                          <ul className="divide-y divide-border">
                            {ready.users.slice(0, 5).map((u, i) => (
                              <li key={u.username + i}>
                                <PersonRow
                                  username={u.username}
                                  displayName={u.displayName}
                                  avatarUrl={u.avatarUrl}
                                  blurred
                                />
                              </li>
                            ))}
                          </ul>
                        </Panel>
                      )
                    ) : (
                      <OtherInteractions people={others} locked={locked} username={state.data.username} />
                    )}

                    {/* Perfil no Faro AI: o que ele detectou entre uma coleta e
                        outra, aqui mesmo — antes só aparecia na aba Interações. */}
                    {!locked && ready?.recent &&
                      (ready.recent.started.length > 0 || ready.recent.stopped.length > 0) && (
                        <MudancasDoFaro username={state.data.username} recent={ready.recent} />
                      )}
                    </>
                    )}
                    {locked && !carregandoAnalise && (
                      <Oferta
                        username={state.data.username}
                        loggedIn={loggedIn}
                        planoPro={planoPro}
                        ready={ready}
                        confirmando={confirmando}
                        onConfirmar={confirmarAnalise}
                        revelacao={revelacao}
                        revelado={interactions.revelado ?? null}
                        semDados={!!interactions.semDados}
                        onRevelar={revelar}
                        temPrevia={!!ready?.counts || (ready?.users.length ?? 0) > 0}
                      />
                    )}
                  </div>
                )}

                {tab === "seguindo" && (
                  <div className="mt-5">
                    {/* "Novos seguindo" só com base para isso: a análise pontual
                        lê UMA página da lista, na ordem que o Instagram entrega
                        — em geral as mais recentes primeiro, sem garantia. O
                        que é novo de verdade sai da comparação entre coletas
                        do Faro AI. */}
                    <Panel title="Quem segue — amostra">
                      <p className="-mt-1 mb-3 text-[11px] text-muted-foreground">
                        Até {MAX_SEGUINDO} contas que @{state.data.username} segue, na ordem em que o
                        Instagram entrega a lista (em geral, as mais recentes primeiro — a ordem não é
                        garantida). Contas verificadas ficam de fora. Para saber quem entrou e quem
                        saiu, o Faro AI compara uma coleta com a outra.
                      </p>
                      {following.kind === "loading" ? (
                        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Analisando…
                        </div>
                      ) : ready && ready.users.length > 0 ? (
                        <ul className="divide-y divide-border">
                          {ready.users.slice(0, MAX_SEGUINDO).map((u, i) => (
                            <li key={u.username + i}>
                              <PersonRow
                                username={u.username}
                                displayName={u.displayName}
                                avatarUrl={u.avatarUrl}
                                blurred={locked}
                                right={
                                  <div className="flex items-center gap-2">
                                    {u.isVerified && !locked && (
                                      <BadgeCheck className="h-4 w-4 text-[#3897F0]" />
                                    )}
                                    <GenderBadge gender={u.gender} />
                                  </div>
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      ) : ready?.seguindoOculto ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          @{state.data.username} fechou esta lista nas configurações do Instagram.
                          Nem o Farejo nem nenhum outro site consegue ler.
                        </p>
                      ) : (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          Nada encontrado nesta leitura.
                        </p>
                      )}
                    </Panel>
                    {locked && (
                      <div className="mt-5">
                        <UpgradeCard username={state.data.username} planoPro={planoPro} />
                      </div>
                    )}
                  </div>
                )}

                {tab === "interacoes" && (
                  <div className="mt-5">
                    {paid && ready ? (
                      <ProDashboard
                        username={state.data.username}
                        displayName={state.data.displayName}
                        avatarUrl={state.data.avatarUrl}
                        followersCount={state.data.followersCount}
                        followingCount={state.data.followingCount}
                        counts={ready.counts}
                        interactions={interactions.items}
                        following={ready.users}
                        recent={ready.recent}
                        loggedIn={loggedIn}
                        showHistory={false}
                        proExtras={isPro}
                      />
                    ) : (
                      <div className="space-y-5">
                        <OtherInteractions
                          people={others}
                          locked
                          username={state.data.username}
                        />
                        <UpgradeCard username={state.data.username} planoPro={planoPro} />
                      </div>
                    )}
                  </div>
                )}

                {isRaioX(tab) && (
                  <div className="mt-5">
                    <RaioX
                      key={tab}
                      username={state.data.username}
                      section={tab}
                      upgrade={<UpgradeCard username={state.data.username} planoPro={planoPro} />}
                    />
                  </div>
                )}

                {tab === "historico" && (
                  <div className="mt-5">
                    <HistoryPanel username={state.data.username} loggedIn={loggedIn} isPro={isPro} />
                  </div>
                )}

                {/* O "Sobre" em letra miúda, embaixo de qualquer aba. */}
                <div className="mt-3">
                  <AboutLine username={state.data.username} />
                </div>

                {/* O mesmo @ em outras redes também no perfil público, no fim
                    da página. Some sozinho quando não há nenhuma. */}
                <OtherNetworks
                  username={state.data.username}
                  destaque
                  inicial={redes}
                  podeBuscarPagas={revelado}
                />
              </>
            )}
          </>
        )}
      </main>
      </div>
      {loggedIn && <NavSpacer />}
    </>
  );
}
