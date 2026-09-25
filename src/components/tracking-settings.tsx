"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  Camera,
  Check,
  Clock,
  Eraser,
  Heart,
  Loader2,
  Pause,
  PawPrint,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { RefreshButton, completa, quando } from "@/components/refresh-card";
import { NotificationsFeed, type Notification } from "@/components/notifications-feed";
import { SavedStories, type SavedStory } from "@/components/saved-stories";
import { PlanLimits } from "@/components/plan-limits";
import { ProximaColeta } from "@/components/proxima-coleta";
import type { ResumoFranquia } from "@/lib/franquia";
import type { Plan } from "@prisma/client";
import { AppHeader, SettingRow, Toggle } from "@/components/ui/app-chrome";
import { NoteBox, Panel, StatusPill } from "@/components/ui/brand";
import { SniffingDog } from "@/components/ui/dog";
import { HistoryPanel } from "@/components/history-panel";

import type { TrackingPrefs } from "@/lib/tracking-prefs";

const ROWS = [
  {
    key: "notifications" as const,
    icon: Bell,
    title: "Notificações",
    hint: "Receba alertas em tempo real.",
  },
  { key: "newFollowing" as const, icon: UserPlus, title: "Novos seguidos" },
  { key: "unfollowed" as const, icon: UserMinus, title: "Deixou de seguir" },
  { key: "postInteractions" as const, icon: Heart, title: "Interações em posts" },
  {
    key: "stories" as const,
    icon: Camera,
    title: "Stories (quando disponível)",
    disabled: true,
    hint: "Depende do que o perfil torna público.",
  },
];

interface Status {
  usadas: number;
  limite: number | null;
  podeAtualizar: boolean;
  ultima: string | null;
  proxima: string | null;
  antecipa?: boolean;
  liberaEm?: string | null;
  cadenciaHoras?: number;
}

/** Data curta: "12 de set." */
function dia(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/**
 * "No seu Faro AI": a tela de um perfil acompanhado.
 *
 * A ordem segue o que se quer saber, nesta sequência: **quem** é o perfil,
 * **quando** o Faro AI olhou pela última vez (com o botão de atualizar ao lado,
 * não num cartão perdido), **o que mudou** na semana, os **stories guardados**,
 * as **pistas** e, por último, os **ajustes**. Os limites do plano ficam no
 * topo, porque limite que só aparece quando estoura vira surpresa ruim.
 */

export function TrackingSettings({
  username,
  displayName,
  avatarUrl,
  initial,
  active,
  profileId,
  refresh,
  pistas = [],
  stories = [],
  plan = "FREE",
  desde,
  ultimaMudanca,
  semana,
  limites,
  storiesSalvos = [],
  cotaSalvos,
  desdeAVisita = null,
  ferramentas = { perguntas: false, resumos: false, buscaStories: false, alerta: false, storiesHours: 0 },
}: {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  initial: TrackingPrefs;
  active: boolean;
  profileId?: string;
  /** As pistas deste perfil — nunca as de outros. */
  pistas?: Notification[];
  /** Stories que o Faro AI guardou deste perfil. */
  stories?: SavedStory[];
  plan?: Plan;
  /** Quando este perfil entrou no Faro AI. */
  desde?: string;
  /** Quando o Faro AI encontrou a última mudança. */
  ultimaMudanca?: string | null;
  /** O movimento dos últimos 7 dias. */
  semana?: { follows: number; unfollows: number; interacoes: number };
  /** A faixa de limites do plano, já calculada no servidor. */
  limites?: ResumoFranquia;
  /** Estado das atualizações do dia, para o botão "Atualizar agora". */
  refresh?: Status;
  /** Ids dos stories que a pessoa marcou com a estrela. */
  storiesSalvos?: string[];
  /** Quantos salvamentos o plano ainda permite neste mês. */
  cotaSalvos?: { usados: number; limite: number; restam: number; mb?: number; limiteMb?: number };
  /**
   * As ferramentas do plano, decididas no servidor. `storiesHours: null` =
   * sem prazo.
   */
  ferramentas?: {
    perguntas: boolean;
    resumos: boolean;
    buscaStories: boolean;
    alerta: boolean;
    storiesHours: number | null;
  };
  /** O que aconteceu enquanto esta pessoa esteve fora. `null` na 1a visita. */
  desdeAVisita?: { desde: string; novidades: { texto: string; quantos: number }[] } | null;
}) {
  const router = useRouter();
  const [prefs, setPrefs] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [status, setStatus] = React.useState<Status | undefined>(refresh);
  const [ajustesAbertos, setAjustesAbertos] = React.useState(false);

  /*
   * O alerta que a pessoa escreve. Vive junto das outras chaves, porque é do
   * mesmo assunto: o que ela quer que o Faro AI olhe neste perfil.
   */
  const [pedido, setPedido] = React.useState("");
  const [pedidoSalvo, setPedidoSalvo] = React.useState("");
  const [salvandoPedido, setSalvandoPedido] = React.useState(false);

  React.useEffect(() => {
    if (!profileId || !ajustesAbertos) return;
    let vivo = true;
    fetch(`/api/alerta-escrito?profileId=${encodeURIComponent(profileId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (!vivo || !b) return;
        setPedido(b.texto ?? "");
        setPedidoSalvo(b.texto ?? "");
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [profileId, ajustesAbertos]);

  async function salvarPedido() {
    if (!profileId) return;
    setSalvandoPedido(true);
    try {
      const r = await fetch("/api/alerta-escrito", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId, texto: pedido }),
      });
      if (r.ok) setPedidoSalvo((await r.json()).texto ?? "");
    } catch {
      /* fica como está */
    } finally {
      setSalvandoPedido(false);
    }
  }

  // Esc fecha: é o que se espera de qualquer janela que cobre a tela.
  React.useEffect(() => {
    if (!ajustesAbertos) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAjustesAbertos(false);
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [ajustesAbertos]);

  function set<K extends keyof TrackingPrefs>(key: K, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/tracking-prefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, prefs }),
      });
      setSaved(true);
      router.refresh();
    } catch {
      /* the button simply stays un-confirmed */
    } finally {
      setSaving(false);
    }
  }

  const janela = ferramentas.storiesHours;
  const totalSemana = semana ? semana.follows + semana.unfollows + semana.interacoes : 0;

  return (
    <main className="mx-auto max-w-5xl px-5 py-6 md:pl-[15.5rem]">
      <AppHeader
        title="No seu Faro AI"
        backHref="/rastros"
        subtitle={
          active ? (
            <StatusPill tone="green">
              <span className="text-[8px]">●</span> Farejando
            </StatusPill>
          ) : null
        }
      />

      {/* 1. Quem é, desde quando, e o botão que muda o "última verificação". */}
      <Panel>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="shrink-0 rounded-full p-0.5 ring-2 ring-pink">
              <Avatar src={avatarUrl} name={displayName ?? username} size={56} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">@{username}</p>
              {displayName && (
                <p className="truncate text-sm text-muted-foreground">{displayName}</p>
              )}
              {/* O que era o banner grande do topo, numa linha: aqui o Farejo
                  olha por você — na análise (/p) é você que olha. */}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {active ? "O Faro AI está de olho neste perfil." : "O Faro AI está pausado neste perfil."}
              </p>
              <Link
                href={`/p/${encodeURIComponent(username)}`}
                className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-accent transition hover:opacity-80"
              >
                Abrir o perfil completo <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* `items-start`: o "Atualizar agora" às vezes leva um aviso embaixo
              ("limite de hoje atingido"), e centralizar jogava a engrenagem
              para baixo do topo do botão. As duas alturas também são as
              mesmas, 40px, para os dois ficarem na mesma linha. */}
          <div className="flex w-full shrink-0 items-start justify-between gap-2 sm:w-auto sm:justify-normal">
            {profileId && status && (
              <RefreshButton profileId={profileId} inicial={status} onStatus={setStatus} />
            )}
            <button
              type="button"
              onClick={() => setAjustesAbertos((a) => !a)}
              aria-expanded={ajustesAbertos}
              aria-label="Configurações do que você vê"
              title="Configurações do que você vê"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border transition hover:bg-muted/50 ${
                ajustesAbertos ? "bg-muted text-foreground" : "text-muted-foreground"
              }`}
            >
              <Settings className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* As três datas que respondem "o Faro AI está trabalhando?". */}
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
          <div>
            <dt className="text-[11px] text-muted-foreground">No Faro AI desde</dt>
            <dd className="text-sm font-bold" title={completa(desde ?? null)}>
              {dia(desde ?? null)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Última verificação</dt>
            <dd className="text-sm font-bold" title={completa(status?.ultima ?? null)}>
              {quando(status?.ultima ?? null)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Última mudança</dt>
            <dd className="text-sm font-bold" title={completa(ultimaMudanca ?? null)}>
              {ultimaMudanca ? quando(ultimaMudanca) : "nenhuma ainda"}
            </dd>
          </div>
        </dl>

        {status?.proxima && (
          <p
            className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"
            title={completa(status.proxima)}
          >
            <Clock className="h-3 w-3" /> Próximo farejo automático:{" "}
            {new Date(status.proxima).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}.
          </p>
        )}
      </Panel>

      {/* 3. Os ajustes abrem num pop-up, não numa gaveta.
          Mexer no que se vê é uma parada curta: abre, muda, fecha e a página
          continua onde estava. A gaveta empurrava o painel inteiro para baixo
          e fazia perder o lugar da leitura.

          O rótulo fala do efeito, não do mecanismo — cada chave decide o que
          aparece neste painel, e não só o que dispara alerta. */}
      {ajustesAbertos && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setAjustesAbertos(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ajustes-titulo"
        >
          {/* `max-h` com rolagem própria: a lista mais o pausar/remover não
              cabem numa tela de celular deitado. */}
          <div
            className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-5 py-4">
              <h2 id="ajustes-titulo" className="text-base font-bold tracking-tight">
                Configurações do que você vê
              </h2>
              <button
                type="button"
                onClick={() => setAjustesAbertos(false)}
                aria-label="Fechar"
                className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="px-5">
              <ul className="divide-y divide-border">
                {ROWS.map((r) => (
                  <li key={r.key}>
                    <SettingRow
                      icon={r.icon}
                      title={r.title}
                      hint={r.hint}
                      right={
                        <Toggle
                          label={r.title}
                          checked={prefs[r.key]}
                          disabled={r.disabled}
                          onChange={(v) => set(r.key, v)}
                        />
                      }
                    />
                  </li>
                ))}
              </ul>

              {/* O alerta em texto livre. Fica junto das chaves fixas porque
                  responde a mesma pergunta: o que você quer que eu olhe aqui. */}
              {profileId && ferramentas.alerta && (
                <div className="border-t border-border py-4">
                  <label htmlFor="alerta-escrito" className="text-sm font-bold">
                    Me avise quando…
                  </label>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    Escreva com suas palavras. O Faro AI compara cada publicação nova com o
                    que você pediu — e só avisa quando bate.
                  </p>
                  <textarea
                    id="alerta-escrito"
                    value={pedido}
                    onChange={(e) => setPedido(e.target.value)}
                    rows={2}
                    maxLength={200}
                    placeholder="publicar sobre um lançamento · aparecer cupom de desconto · marcar alguma loja"
                    className="mt-2 w-full resize-none rounded-2xl border border-input bg-card p-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={salvarPedido}
                    disabled={salvandoPedido || pedido === pedidoSalvo}
                    className="mt-2 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-2xl border border-border text-sm font-bold transition hover:bg-muted/50 disabled:opacity-50"
                  >
                    {salvandoPedido ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : pedido === pedidoSalvo && pedidoSalvo ? (
                      <Check className="h-4 w-4" />
                    ) : null}
                    {pedido === pedidoSalvo && pedidoSalvo
                      ? "Alerta guardado"
                      : pedido.trim()
                        ? "Guardar este alerta"
                        : "Desligar o alerta escrito"}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="my-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-pink px-6 py-3 text-sm font-bold text-ink transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : null}
                {saved ? "Faro AI atualizado 🐶" : "Salvar"}
              </button>

              {profileId && (
                <div className="space-y-4 border-t border-border py-4">
                  <PausarFaro profileId={profileId} ativo={active} username={username} />
                  <Perigo profileId={profileId} username={username} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* O que aconteceu enquanto você esteve fora.
          Cada linha é contagem de registro que está nesta mesma página — nada
          aqui é opinião, e nada vem de modelo. */}
      {desdeAVisita && (
        <div className="mt-5 rounded-3xl border border-accent/30 bg-accent/5 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            Desde a sua última visita, {quando(desdeAVisita.desde)}
          </p>
          <ul className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-bold leading-snug">
            {desdeAVisita.novidades.map((n, i) => (
              <li key={n.texto} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted-foreground">·</span>}
                {n.texto}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. O que mudou na semana, em três números. */}
      {semana && (
        <>
          <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-plum/50">
            Últimos 7 dias
          </p>
          {/* Dois números: "interações" saiu junto com a coleta que o
              alimentava (24/09). Ver `faro-watch`. */}
          <div className="grid grid-cols-2 gap-3">
            <Numero valor={semana.follows} label="novos follows" tom="follow" />
            <Numero valor={semana.unfollows} label="unfollows" tom="unfollow" />
          </div>
        </>
      )}

      {/* 3. De volta ao que era antes das abas (24/09): tudo à vista.
          As abas escondiam os stories e o histórico atrás de um clique, e a
          impressão era de que tinham sumido. O que as abas prometiam — um
          lugar próprio para perguntar — já existe no Chat da barra lateral. */}

      {/* Stories primeiro: são o único conteúdo que some. */}
      <div className="mt-5">
        {stories.length > 0 ? (
          <SavedStories
            stories={stories}
            plan={plan}
            username={username}
            avatarUrl={avatarUrl}
            profileId={profileId}
            salvosIniciais={storiesSalvos}
            cotaInicial={cotaSalvos}
            ferramentas={ferramentas}
          />
        ) : (
          <Panel title="Stories">
            <p className="text-sm text-muted-foreground">
              Nenhum story guardado ainda.{" "}
              {janela == null
                ? "Quando o Faro AI encontrar um, ele fica guardado enquanto o perfil estiver no Faro AI."
                : janela > 0
                  ? `Quando o Faro AI capturar um, ele fica visível por ${janela >= 48 ? `${janela / 24} dias` : `${janela} horas`} contados da publicação. Stories publicados e apagados entre duas coletas podem não ser capturados.`
                  : "Seu plano não guarda stories."}
            </p>
          </Panel>
        )}
      </div>

      {/* Quem entrou e saiu na largura toda; embaixo, Novidades e o gráfico
          lado a lado, da mesma altura. Duas colunas de alturas diferentes
          deixavam um buraco embaixo da mais curta. */}
      <section className="mt-5">
        <h2 className="mb-3 text-lg font-bold tracking-tight">Quem entrou e quem saiu</h2>
        {pistas.length > 0 ? (
          <NotificationsFeed items={pistas} />
        ) : (
          <NoteBox className="items-center" icon={<SniffingDog className="h-12 text-ink" />}>
            <span>
              <span className="hand text-lg">
                {totalSemana === 0 && active
                  ? "Ainda não achei nada por aqui. Eu aviso!"
                  : "O Faro AI te avisa quando encontrar algo novo!"}
              </span>
              {active && <ProximaColeta alvo={status?.proxima ?? null} />}
            </span>
          </NoteBox>
        )}
      </section>

      {/* O histórico deste perfil: só banco, nenhuma chamada paga. */}
      <HistoryPanel username={username} loggedIn isPro enxuto className="mt-5" />

      {/* O plano por último: é consulta, não é o assunto da tela. */}
      {limites && <PlanLimits resumo={limites} className="mt-8" />}
    </main>
  );
}

/** Um número da semana, com a cor do tipo de pista. */
function Numero({
  valor,
  label,
  tom,
}: {
  valor: number;
  label: string;
  tom: "follow" | "unfollow" | "interacao";
}) {
  // As mesmas cores por tipo que as pistas usam: follow azul, unfollow
  // vermelho, interação amarelo.
  const cor =
    tom === "follow"
      ? "bg-sky-50 text-sky-700"
      : tom === "unfollow"
        ? "bg-rose-50 text-rose-700"
        : "bg-yellow/40 text-ink";
  return (
    <div className={`rounded-2xl px-3 py-3 text-center ${cor}`}>
      <div className="text-xl font-bold tabular-nums">{valor}</div>
      <div className="mt-0.5 text-[11px] leading-tight opacity-80">{label}</div>
    </div>
  );
}

/**
 * Tirar o perfil do Faro AI — pausando, não apagando.
 *
 * Pausar interrompe as leituras diárias e **guarda** as pistas já encontradas;
 * é reversível com um clique. Apagar de verdade (com o histórico junto) ainda
 * não existe: precisa de uma rota própria e de uma confirmação, porque leva
 * embora dados que a pessoa pagou para ter.
 */
function PausarFaro({
  profileId,
  ativo,
  username,
}: {
  profileId: string;
  ativo: boolean;
  username: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function trocar() {
    setBusy(true);
    try {
      await fetch(`/api/profiles/${profileId}/stop`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !ativo }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={trocar}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-6 py-2.5 text-sm font-bold transition hover:bg-muted/50 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
        {ativo ? "Pausar o Faro AI neste perfil" : "Voltar a farejar"}
      </button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {ativo
          ? `Pausado, o Faro AI para de olhar @${username} todo dia. As pistas já encontradas ficam guardadas.`
          : `O Faro AI não está olhando @${username} no momento.`}
      </p>
    </>
  );
}

/**
 * As duas ações sem volta: limpar o histórico e tirar do Faro AI.
 *
 * Ficam no fim, dentro dos ajustes, e cada uma pergunta duas vezes — o
 * primeiro clique só arma o botão. As rotas ainda exigem `confirm=1`, para
 * que um clique perdido nunca apague nada.
 */
function Perigo({ profileId, username }: { profileId: string; username: string }) {
  const router = useRouter();
  const [armado, setArmado] = React.useState<"limpar" | "tirar" | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function limpar() {
    setBusy(true);
    try {
      await fetch(`/api/profiles/${profileId}/limpar?confirm=1`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
      setArmado(null);
    }
  }

  async function tirar() {
    setBusy(true);
    try {
      const r = await fetch(`/api/profiles/${profileId}?confirm=1`, { method: "DELETE" });
      if (r.ok) router.push("/rastros");
    } finally {
      setBusy(false);
      setArmado(null);
    }
  }

  return (
    <div className="space-y-2">
      {armado === "limpar" ? (
        <Confirma
          texto={`Apagar todas as pistas, stories e o histórico de @${username}? O perfil continua no Faro AI, e a próxima leitura vira a nova base.`}
          rotulo="Limpar mesmo"
          busy={busy}
          onSim={limpar}
          onNao={() => setArmado(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setArmado("limpar")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-6 py-2.5 text-sm font-semibold transition hover:bg-muted/50"
        >
          <Eraser className="h-4 w-4" /> Limpar histórico
        </button>
      )}

      {armado === "tirar" ? (
        <Confirma
          texto={`Tirar @${username} do Faro AI apaga tudo o que o Faro AI já encontrou dele. Não tem desfazer.`}
          rotulo="Tirar do Faro AI"
          busy={busy}
          onSim={tirar}
          onNao={() => setArmado(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setArmado("tirar")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 px-6 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/5"
        >
          <Trash2 className="h-4 w-4" /> Tirar do Faro AI
        </button>
      )}
    </div>
  );
}

function Confirma({
  texto,
  rotulo,
  busy,
  onSim,
  onNao,
}: {
  texto: string;
  rotulo: string;
  busy: boolean;
  onSim: () => void;
  onNao: () => void;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-xs leading-relaxed">{texto}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onSim}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full bg-destructive px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          {rotulo}
        </button>
        <button
          type="button"
          onClick={onNao}
          className="text-xs font-semibold text-muted-foreground hover:underline"
        >
          cancelar
        </button>
      </div>
    </div>
  );
}
