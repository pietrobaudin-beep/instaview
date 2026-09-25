"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, Loader2, Search, Sparkles, Star } from "lucide-react";
import { Panel } from "@/components/ui/brand";
import { StoryViewer } from "@/components/story-viewer";
import { planFor } from "@/lib/plans";
import type { Plan } from "@prisma/client";

/**
 * Os stories que o Faro AI guardou.
 *
 * No Instagram eles somem em 24h. Aqui, enquanto o perfil está no Faro AI, a
 * miniatura foi copiada no momento em que o Faro AI a encontrou — e **continua
 * guardada enquanto o perfil estiver no Faro AI**, sem prazo (decidido em 21/09).
 * O prazo curto ficou só para o Farejador, que é consulta única.
 *
 * A tela diz isso com todas as letras: o que já expirou no Instagram leva o
 * aviso, para ninguém achar que ainda está no ar.
 */

export interface SavedStory {
  id: string;
  takenAt: string | null;
  detectedAt: string;
  thumbnailUrl: string | null;
  /** Story em vídeo: o link do Instagram (vence) e o tipo. */
  videoUrl?: string | null;
  midia?: "photo" | "video";
  mentions: string[];
}

const proxied = (url: string | null) =>
  url && /(?:\.fbcdn\.net|\.cdninstagram\.com)/i.test(url)
    ? `/api/img?url=${encodeURIComponent(url)}`
    : url;

function horas(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function quando(h: number): string {
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${Math.round(h)} h`;
  return `há ${Math.round(h / 24)} d`;
}

/** O giro de cada cartão do leque, em graus — alterna para parecer à mão. */
const GIROS = [-5, 3, -2, 5, -4, 2];

export function SavedStories({
  stories,
  plan,
  username,
  avatarUrl,
  profileId,
  salvosIniciais = [],
  cotaInicial = { usados: 0, limite: 0, restam: 0 },
  ferramentas = { resumos: true, buscaStories: true, storiesHours: null },
}: {
  stories: SavedStory[];
  plan: Plan;
  username: string;
  avatarUrl?: string | null;
  /** Sem ele não dá para marcar: é a chave da lista de salvos. */
  profileId?: string;
  /** Os ids já marcados, vindos do servidor. */
  salvosIniciais?: string[];
  /** Vagas de favorito (e o espaço delas) que o plano ainda permite. */
  cotaInicial?: { usados: number; limite: number; restam: number; mb?: number; limiteMb?: number };
  /**
   * O que o plano libera aqui. Vem do servidor: a janela dos stories já foi
   * aplicada lá, então esta lista só mostra o que vale.
   */
  ferramentas?: { resumos: boolean; buscaStories: boolean; storiesHours: number | null };
}) {
  const [aberto, setAberto] = React.useState(-1);
  /** O story em destaque no leque — o que a legenda descreve. */
  const [foco, setFoco] = React.useState(0);

  /*
   * Setas para os lados quando há mais stories do que cabem. Cada uma só
   * aparece se houver o que ver naquela direção.
   */
  const faixa = React.useRef<HTMLDivElement>(null);
  const [lados, setLados] = React.useState({ esq: false, dir: false });
  const medir = React.useCallback(() => {
    const el = faixa.current;
    if (!el) return;
    setLados({ esq: el.scrollLeft > 4, dir: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  React.useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir, stories.length]);
  const rolar = (sentido: 1 | -1) =>
    faixa.current?.scrollBy({ left: sentido * faixa.current.clientWidth * 0.8, behavior: "smooth" });
  const [salvos, setSalvos] = React.useState<string[]>(salvosIniciais);
  const [marcando, setMarcando] = React.useState<string | null>(null);
  /*
   * A cota vem do servidor, em vez de ser importada: o arquivo que a define
   * também importa o Prisma, e trazê-lo para cá arrastaria código de servidor
   * para o navegador.
   */
  const [cota, setCota] = React.useState(cotaInicial);
  const [semCota, setSemCota] = React.useState<null | "sem_cota" | "sem_espaco">(null);
  /** Stories que ficaram sem ler porque os resumos do ciclo acabaram. */
  const [semResumo, setSemResumo] = React.useState(0);

  /*
   * O que os stories disseram — assunto, texto na imagem e marcas.
   *
   * Chega em duas etapas de propósito: ao abrir, só o que JÁ foi lido (não
   * custa nada); o resto só quando alguém aperta "Resumir stories", porque
   * ler imagem é a parte cara da casa.
   */
  type Leitura = { id: string; assunto: string; texto: string | null; marcas: string[] };
  const [leituras, setLeituras] = React.useState<Record<string, Leitura>>({});
  const [lendo, setLendo] = React.useState(false);
  const [iaLigada, setIaLigada] = React.useState(false);
  const [busca, setBusca] = React.useState("");

  const guardar = React.useCallback((corpo: { ligada?: boolean; lidos?: Leitura[] }) => {
    setIaLigada(!!corpo.ligada);
    const mapa: Record<string, Leitura> = {};
    for (const l of corpo.lidos ?? []) mapa[l.id] = l;
    setLeituras((antes) => ({ ...antes, ...mapa }));
  }, []);

  React.useEffect(() => {
    let vivo = true;
    fetch(`/api/stories-resumo?username=${encodeURIComponent(username)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => vivo && b && guardar(b))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [username, guardar]);

  async function resumir() {
    setLendo(true);
    try {
      const r = await fetch("/api/stories-resumo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const b = await r.json().catch(() => null);
      if (r.ok && b) {
        guardar(b);
        setSemResumo(b.semFranquia ?? 0);
      } else if (r.status === 402) setSemResumo(-1);
    } catch {
      /* fica como está */
    } finally {
      setLendo(false);
    }
  }

  /**
   * Marca ou desmarca, mudando a tela antes da resposta.
   *
   * Marcar é um gesto pequeno e repetido; esperar o servidor a cada estrela
   * faria a lista piscar. Se o pedido falhar, volta como estava.
   */
  async function alternar(storyId: string) {
    if (!profileId) return;
    const estava = salvos.includes(storyId);
    setMarcando(storyId);
    setSemCota(null);
    setSalvos((atual) => (estava ? atual.filter((id) => id !== storyId) : [storyId, ...atual]));
    try {
      const r = await fetch("/api/stories-salvos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId, storyId, salvar: !estava }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(String(r.status));
      if (Array.isArray(b?.ids)) setSalvos(b.ids);
      if (b?.cota) setCota(b.cota);
      // Recusado por falta de cota: a tela volta atrás e diz por quê.
      if (b?.ok === false) {
        setSemCota(b.motivo === "sem_espaco" ? "sem_espaco" : "sem_cota");
        setSalvos((atual) => atual.filter((id) => id !== storyId));
      }
    } catch {
      setSalvos((atual) => (estava ? [storyId, ...atual] : atual.filter((id) => id !== storyId)));
    } finally {
      setMarcando(null);
    }
  }

  if (!stories.length) return null;

  const janela = ferramentas.storiesHours;
  const prazo =
    janela == null
      ? "Guardados enquanto o perfil estiver no Faro AI."
      : `Visíveis por ${janela % 24 === 0 ? `${janela / 24} dia${janela === 24 ? "" : "s"}` : `${janela} horas`} contados da publicação, pelo seu plano.`;

  const marcados = stories.filter((s) => salvos.includes(s.id));
  /*
   * O prazo corta — a estrela protege. Antes a lista mostrava só o que estava
   * dentro do prazo do plano, e o story marcado sumia daqui junto com os
   * outros: parecia que a estrela não tinha guardado nada. Ela continuava
   * valendo (o story estava na página de salvos), mas o lugar onde a pessoa
   * clicou não dizia isso.
   */
  // A janela já foi aplicada no servidor (`acervo.ts`).
  const visiveis = stories;
  if (!visiveis.length) return null;

  /*
   * A busca corre sobre o que a IA leu: assunto, texto da imagem e marcas —
   * mais as menções, que já vinham do Instagram. É por isso que procurar
   * "cupom" acha um story onde a palavra nunca esteve na legenda: ela estava
   * ESCRITA na imagem.
   */
  const termo = busca.trim().toLowerCase();
  const casa = (s: SavedStory) => {
    if (!termo) return true;
    const l = leituras[s.id];
    const palheiro = [
      l?.assunto ?? "",
      l?.texto ?? "",
      ...(l?.marcas ?? []),
      ...s.mentions,
    ]
      .join(" ")
      .toLowerCase();
    return palheiro.includes(termo);
  };

  // A lista que a tela mostra de fato — é ela que o visualizador recebe, senão
  // clicar no terceiro com a busca ligada abriria o terceiro da lista inteira.
  const mostrados = visiveis.filter(casa);
  const quantosLidos = visiveis.filter((s) => leituras[s.id]).length;

  const paraViewer = (lista: SavedStory[]) =>
    lista.map((s) => ({
      id: s.id,
      imageUrl: proxied(s.thumbnailUrl),
      kind: s.midia,
      videoUrl: s.videoUrl ?? null,
      takenAt: s.takenAt ?? s.detectedAt,
      mentions: s.mentions,
      expirou: horas(s.detectedAt) >= 24,
    }));

  return (
    <Panel
      title="Stories guardados"
      action={
        iaLigada && ferramentas.resumos && quantosLidos < visiveis.length ? (
          <button
            type="button"
            onClick={resumir}
            disabled={lendo}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-2xl border border-border px-3 text-xs font-bold transition hover:bg-muted/50 disabled:opacity-60"
          >
            {lendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-accent" />}
            {lendo ? "Lendo…" : "Resumir stories"}
          </button>
        ) : null
      }
    >
      {/* A busca só aparece quando há o que buscar: sem leitura, ela olharia
          apenas as menções e prometeria mais do que entrega. */}
      {semResumo !== 0 && (
        <p className="mb-3 text-[11px] font-semibold text-destructive">
          {semResumo < 0
            ? "Os resumos de stories deste ciclo acabaram."
            : `${semResumo} story${semResumo === 1 ? "" : "s"} ficaram sem ler: os resumos deste ciclo acabaram.`}
        </p>
      )}
      {quantosLidos > 0 && ferramentas.buscaStories && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procurar nos stories: cupom, praia, uma marca…"
            aria-label="Procurar nos stories"
            className="h-11 w-full rounded-2xl border border-input bg-card pl-9 pr-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {termo && mostrados.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum story guardado fala nisso.
        </p>
      )}

      {/*
        * O leque: miniaturas sobrepostas, levemente giradas, com borda branca —
        * como fotos espalhadas na mesa. Passar o mouse (ou tocar) endireita e
        * traz para a frente; a legenda embaixo diz o que aquele story tem.
        */}
      <div className="relative -mx-5">
      {lados.esq && (
        <button
          type="button"
          onClick={() => rolar(-1)}
          aria-label="Ver stories anteriores"
          className="absolute left-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-lg transition hover:scale-105"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {lados.dir && (
        <button
          type="button"
          onClick={() => rolar(1)}
          aria-label="Ver mais stories"
          className="absolute right-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-lg transition hover:scale-105"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      <div ref={faixa} onScroll={medir} className="sem-barra flex overflow-x-auto px-7 pb-3 pt-4">
        {mostrados.map((s, i) => {
          const h = horas(s.detectedAt);
          const expirou = h >= 24;
          const giro = GIROS[i % GIROS.length];
          const emFoco = foco === i;
          return (
            <div
              key={s.id}
              // Só mouse de verdade seleciona ao passar: no celular o toque
              // também dispara "entrou", e o 1º toque já abriria o story.
              onPointerEnter={(e) => e.pointerType === "mouse" && setFoco(i)}
              onFocus={() => setFoco(i)}
              style={{ transform: emFoco ? "rotate(0deg) translateY(-6px) scale(1.04)" : `rotate(${giro}deg)` }}
              className={`relative w-28 shrink-0 transition duration-200 sm:w-32 ${i > 0 ? "-ml-5" : ""} ${
                emFoco ? "z-20" : ""
              }`}
            >
              {/* Dois passos no celular: o 1º toque seleciona (endireita e
                  mostra a legenda), o 2º abre. No computador o mouse já
                  seleciona ao passar, então um clique abre direto. */}
              <button
                type="button"
                onClick={() => (emFoco ? setAberto(i) : setFoco(i))}
                aria-label={emFoco ? `Abrir story guardado de @${username}` : `Selecionar story de @${username}`}
                className="relative block aspect-[9/16] w-full overflow-hidden rounded-[1.4rem] border-4 border-white bg-gradient-to-br from-pink/40 to-purple/40 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.35)]"
              >
                {s.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proxied(s.thumbnailUrl)!} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute left-2 top-2 rounded-full bg-ink/65 px-1.5 py-0.5 text-[10px] font-bold text-cream">
                  {quando(h)}
                </span>
                {expirou && (
                  <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-full bg-ink/75 px-2 py-1 text-[9px] font-semibold text-cream">
                    <Clock className="h-3 w-3" /> expirou
                  </span>
                )}
              </button>

              {/* A estrela fica FORA do botão que abre o story: dentro, o
                  toque abriria a tela cheia em vez de marcar. */}
              {profileId && (
                <button
                  type="button"
                  onClick={() => alternar(s.id)}
                  aria-pressed={salvos.includes(s.id)}
                  aria-label={salvos.includes(s.id) ? "Tirar dos salvos" : "Salvar este story"}
                  title={salvos.includes(s.id) ? "Tirar dos salvos" : "Salvar este story"}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink/65 text-cream transition hover:bg-ink/80"
                >
                  {marcando === s.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Star className={`h-4 w-4 ${salvos.includes(s.id) ? "fill-yellow text-yellow" : ""}`} />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
      </div>

      <p className="mt-1 text-center text-[11px] text-muted-foreground">
        Toque num story para escolher · toque de novo para abrir
      </p>

      {/* A legenda do story em foco: o que a IA leu e quem ele marca. */}
      {mostrados[foco] && (leituras[mostrados[foco].id] || mostrados[foco].mentions.length > 0) && (
        <div className="mt-1 rounded-2xl bg-muted/40 px-4 py-3">
          {leituras[mostrados[foco].id] && (
            <p className="text-[12px] leading-snug text-muted-foreground">
              {leituras[mostrados[foco].id].texto ? `“${leituras[mostrados[foco].id].texto}” · ` : ""}
              {leituras[mostrados[foco].id].assunto}
            </p>
          )}
          {mostrados[foco].mentions.length > 0 && (
            <div className="mt-2.5">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-plum/50">
                Marcado neste story
              </p>
              <div className="flex flex-wrap gap-2">
                {mostrados[foco].mentions.map((m) => (
                  <Link
                    key={m}
                    href={`/p/${encodeURIComponent(m)}`}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-2xl bg-pink px-3.5 text-sm font-bold text-ink shadow-sm transition hover:opacity-90"
                  >
                    <Search className="h-4 w-4" /> Farejar @{m}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {aberto >= 0 && (
        <StoryViewer
          username={username}
          avatarUrl={avatarUrl}
          startAt={aberto}
          stories={paraViewer(mostrados)}
          onClose={() => setAberto(-1)}
          salvar={
            profileId
              ? {
                  salvos,
                  marcando,
                  alternar,
                  aviso:
                    semCota === "sem_espaco"
                      ? "O espaço dos favoritos está cheio. Tire algum para salvar este."
                      : semCota === "sem_cota"
                        ? `Você já tem ${cota.limite} favoritos, o máximo do plano.`
                        : null,
                }
              : undefined
          }
        />
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {prazo} O Farejo copiou a miniatura quando ela ainda estava pública; o story em si sai do
        Instagram em 24 horas.
        {profileId && cota.limite > 0 && janela != null && (
          <>
            {" "}
            Toque na <b className="font-semibold">estrela</b> para o story ficar guardado enquanto o plano
            estiver ativo — {cota.usados} de {Number.isFinite(cota.limite) ? cota.limite : "∞"} favoritos
            {cota.limiteMb != null && Number.isFinite(cota.limiteMb) ? `, ${cota.mb ?? 0} de ${cota.limiteMb} MB` : ""}.
          </>
        )}
      </p>

      {/*
        * "Stories salvos" tem página própria (`/rastros/<@>/salvos`).
        *
        * A lista morava aqui embaixo e dobrava a altura do cartão — num
        * celular, empurrava as pistas para fora da tela. Aqui fica só o
        * atalho, com a contagem, que é o que interessa de relance.
        */}
      {profileId && marcados.length > 0 && (
        <Link
          href={`/rastros/${encodeURIComponent(username)}/salvos`}
          className="mt-4 flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-4 transition hover:border-accent/50"
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <Star className="h-4 w-4 fill-yellow text-yellow" />
            Stories salvos
            <span className="text-muted-foreground">· {marcados.length}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      {semCota && (
        <p className="mt-2 text-[11px] font-semibold text-destructive">
          {semCota === "sem_espaco"
            ? "O espaço dos favoritos do seu plano está cheio. Tire a estrela de algum para liberar."
            : `Você já tem ${cota.limite} favoritos, o máximo do seu plano. Tire a estrela de algum para liberar uma vaga.`}
        </p>
      )}
    </Panel>
  );
}
