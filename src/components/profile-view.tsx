"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Loader2, Lock, PawPrint, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
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

/**
 * The upgrade block shown to free visitors: two honest options — see only this
 * profile once ("uso único"), or subscribe to follow it over time (PRO).
 */
function UpgradeCard({ username }: { username: string }) {
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
          "📌 Coloque perfis no Faro AI",
          "🐾 Veja quem entrou e quem saiu, sem censura",
          "❤️ Interações públicas organizadas",
          "🔔 Alertas quando o Faro AI encontrar algo novo",
        ].map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="text-foreground/80">{b}</span>
          </li>
        ))}
      </ul>
      <Link href={`/pricing?next=${encodeURIComponent(`/p/${username}`)}`} className="mt-5 block">
        <Button variant="accent" size="lg" className="w-full sm:w-auto">
          Farejo PRO <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <Link
        href={`/login?next=${encodeURIComponent(`/p/${username}`)}`}
        className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground"
      >
        já é assinante? entrar
      </Link>
    </div>
    </div>
  );
}

export function ProfileView({
  username,
  loggedIn,
  planoPro = false,
}: {
  username: string;
  loggedIn: boolean;
  /** A pessoa que está olhando assina. Vem da sessão, no servidor. */
  planoPro?: boolean;
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
      }
  >({ kind: "loading" });

  const [interactions, setInteractions] = React.useState<{ locked: boolean; items: Person[] }>({
    locked: true,
    items: [],
  });

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

    fetch(`/api/elsewhere?username=${encodeURIComponent(username)}&pagas=1`)
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
        if (alive) setInteractions({ locked: !!b.locked, items: b.items ?? [] });
      } catch {
        /* stays locked */
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  React.useEffect(() => {
    let alive = true;
    setFollowing({ kind: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/following-preview?username=${encodeURIComponent(username)}`);
        if (!alive) return;
        const body = await res.json();
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
          counts: body.counts,
          recent: body.recent,
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
  const isPro = planoPro || ready?.access === "pro";

  async function startTracking() {
    if (!loggedIn) {
      router.push(`/signup?next=${encodeURIComponent(`/p/${username}`)}`);
      return;
    }
    // Not a subscriber: this is the Pro moment, not an error.
    if (!isPro) {
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
  const topInteraction = interactions.items[0] ?? ready?.users[0];
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
            const t = isPro ? "pro" : (ready?.access ?? "free");
              if (t === "pro") return <StatusPill tone="yellow">PRO</StatusPill>;
              if (t === "single") return <StatusPill tone="dark">DESBLOQUEADO</StatusPill>;
              return <StatusPill tone="pink">GRÁTIS</StatusPill>;
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
                      ? "Você já usou as análises novas deste mês"
                      : "Sua análise gratuita já foi usada"}
                  </h1>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {planoPro ? (
                      <>
                        Seu plano inclui um número de <b>perfis novos</b> por mês, e ele acabou.
                        Reabrir um @ que você já analisou <b>continua livre</b> — e os perfis do
                        seu Faro AI seguem sendo lidos todo dia.
                      </>
                    ) : (
                      <>
                        O plano grátis inclui <b>1 perfil</b>. Veja só este perfil com um pagamento
                        único, ou assine o PRO para farejar mais.
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
                      {planoPro ? "Ir para o meu Faro AI" : "Conhecer o Farejo PRO"}{" "}
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
                    já é assinante? entrar
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
                premium={isPro}
                note={state.note}
                tracking={tracking}
                locked={!isPro}
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
                      />
                      <TopInteraction
                        person={topInteraction}
                        locked={locked}
                        username={state.data.username}
                      />
                    </div>
                    <OtherInteractions
                      people={others}
                      locked={locked}
                      username={state.data.username}
                    />
                    </>
                    )}
                    {locked && !carregandoAnalise && <UpgradeCard username={state.data.username} />}
                  </div>
                )}

                {tab === "seguindo" && (
                  <div className="mt-5">
                    <Panel title="Novos seguindo">
                      <p className="-mt-1 mb-3 text-[11px] text-muted-foreground">
                        Os {MAX_SEGUINDO} perfis mais recentes que @{state.data.username} começou
                        a seguir. Apenas pessoas reais — contas verificadas e de marcas ficam de
                        fora.
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
                        <UpgradeCard username={state.data.username} />
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
                        <UpgradeCard username={state.data.username} />
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
                      upgrade={<UpgradeCard username={state.data.username} />}
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
                <OtherNetworks username={state.data.username} destaque inicial={redes} />
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
