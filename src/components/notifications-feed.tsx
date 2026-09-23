"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Chips, Panel } from "@/components/ui/brand";
import { WheelPicker } from "@/components/ui/wheel-picker";
import { pistaHeadline, type PistaKind } from "@/lib/voice";
import { Mascot } from "@/components/ui/mascot";

export type NotificationAction =
  | "comecou_a_seguir"
  | "deixou_de_seguir"
  | "curtiu_post"
  | "descurtiu_post"
  | "comentou"
  | "apagou_comentario";

export interface Notification {
  id: string;
  /** The tracked profile the change was detected on. */
  subject: string;
  subjectAvatarUrl: string | null;
  action: NotificationAction;
  /** The other account involved. */
  target: string;
  targetAvatarUrl: string | null;
  detectedAt: string;
}

const VERB: Record<NotificationAction, string> = {
  comecou_a_seguir: "começou a seguir",
  deixou_de_seguir: "deixou de seguir",
  curtiu_post: "curtiu um post de",
  descurtiu_post: "descurtiu um post de",
  comentou: "comentou no post de",
  apagou_comentario: "apagou um comentário no post de",
};

const FILTERS = [
  { value: "todas", label: "Todas" },
  { value: "seguindo", label: "Novos follows" },
  { value: "interacoes", label: "Interações" },
  { value: "deixou", label: "Unfollows" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

/**
 * As três categorias que "Todas" resume. A ordem é a da régua de leitura:
 * quem entrou, quem saiu, quem mexeu.
 */
const CATEGORIAS = [
  { value: "seguindo", label: "Novos follows", kind: "follow" },
  { value: "deixou", label: "Unfollows", kind: "unfollow" },
  { value: "interacoes", label: "Interações", kind: "interaction" },
] as const satisfies readonly { value: Filter; label: string; kind: PistaKind }[];

/** Quantas linhas cada categoria mostra na visão "Todas". */
const PREVIA = 3;
/** Quantas linhas a aba específica mostra antes do "Mostrar mais". */
const PAGINA = 20;

/**
 * A cor de cada tipo de pista: **follow azul · unfollow vermelho · interação
 * amarelo**. Uma faixa fina na lateral da linha, para dar para varrer a lista
 * com o olho sem ler cada frase.
 */
const COR: Record<PistaKind, string> = {
  follow: "bg-sky-500",
  unfollow: "bg-rose-500",
  interaction: "bg-yellow",
};

function kindOf(a: NotificationAction): PistaKind {
  if (a === "comecou_a_seguir") return "follow";
  if (a === "deixou_de_seguir") return "unfollow";
  return "interaction";
}

function matches(n: Notification, f: Filter) {
  if (f === "todas") return true;
  if (f === "seguindo") return n.action === "comecou_a_seguir";
  if (f === "deixou") return n.action === "deixou_de_seguir";
  return (
    n.action === "curtiu_post" ||
    n.action === "descurtiu_post" ||
    n.action === "comentou" ||
    n.action === "apagou_comentario"
  );
}

function ago(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "";
  }
}

/** Group label: Hoje / Ontem / the date itself. */
function bucket(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

/**
 * Uma pista em duas linhas: a frase e a hora. O título da categoria não se
 * repete em cada linha — ele está no topo da lista, e repeti-lo era o que
 * fazia a aba "Todas" ficar quilométrica.
 */
function Linha({ n, compacta = false }: { n: Notification; compacta?: boolean }) {
  const interacao = kindOf(n.action) === "interaction";
  const quem = interacao ? n.target : n.subject;
  const quemAvatar = interacao ? n.targetAvatarUrl : n.subjectAvatarUrl;
  const alvo = interacao ? n.subject : n.target;

  return (
    <Link
      href={`/p/${encodeURIComponent(n.subject)}`}
      className={`flex items-center gap-3 transition hover:bg-muted/40 ${
        compacta ? "py-2 pl-2.5 pr-4" : "py-2.5 pl-2.5 pr-4"
      }`}
    >
      <span aria-hidden className={`h-8 w-1 shrink-0 rounded-full ${COR[kindOf(n.action)]}`} />
      <Avatar src={quemAvatar} name={quem} size={compacta ? 28 : 32} />
      {/* A frase quebra em duas linhas em vez de virar "@nasa começ…": na
          coluna estreita do rastro, truncar comia justamente o nome novo. */}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <span className="font-semibold">@{quem}</span>{" "}
          <span className="text-muted-foreground">{VERB[n.action]}</span>{" "}
          <span className="font-semibold">@{alvo}</span>
        </p>
        <span className="text-[11px] text-muted-foreground">{ago(n.detectedAt)}</span>
      </div>
    </Link>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <Panel className="mt-5">
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Mascot pose="dormindo" className="h-20 text-vinho" bob />
        <p className="font-bold">😴 Faro AI pode descansar.</p>
        <p className="text-sm text-muted-foreground">{texto}</p>
      </div>
    </Panel>
  );
}

export function NotificationsFeed({
  items: todosItens,
  perfis,
}: {
  items: Notification[];
  /**
   * Os perfis do Faro AI. Quando vêm, a tela pede **primeiro de quem** se quer
   * ver as pistas e só depois o tipo — na visão geral, misturar os perfis
   * numa lista só era o que fazia perder a pista do que importa.
   */
  perfis?: { username: string; avatarUrl: string | null }[];
}) {
  const [perfil, setPerfil] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<Filter>("todas");
  const [mostrando, setMostrando] = React.useState(PAGINA);

  const items = perfil ? todosItens.filter((n) => n.subject === perfil) : todosItens;

  // Trocar de aba recomeça a contagem: ninguém quer cair na página 4 de outra coisa.
  function trocar(f: Filter) {
    setFilter(f);
    setMostrando(PAGINA);
  }

  const porCategoria = CATEGORIAS.map((c) => ({
    ...c,
    rows: items.filter((n) => matches(n, c.value)),
  }));

  const seletor =
    perfis && perfis.length > 1 ? (
      <SeletorDePerfil
        perfis={perfis}
        valor={perfil}
        onChange={(v) => {
          setPerfil(v);
          setMostrando(PAGINA);
        }}
      />
    ) : null;

  if (items.length === 0)
    return (
      <div>
        {seletor}
        <Vazio texto={perfil ? `Nenhuma pista de @${perfil} ainda.` : "Nenhuma pista ainda."} />
      </div>
    );

  return (
    <div>
      {seletor}
      {/* No celular, a roda do iPhone, igual à do perfil: arrasta e trava item
          a item. No computador, as pílulas — roda com mouse é ruim. */}
      <div className="rounded-2xl border border-plum/10 bg-white px-3 py-1 sm:hidden">
        <WheelPicker
          options={FILTERS}
          value={filter}
          onChange={trocar}
          visible={3}
          aria-label="Quais pistas você quer ver"
        />
      </div>
      <Chips options={FILTERS} value={filter} onChange={trocar} className="hidden sm:flex" />

      {filter === "todas" ? (
        /* "Todas" é o resumo: os três tipos de informação lado a lado, com as
           últimas de cada um. Quem quiser a lista inteira entra na aba. */
        <div className="mt-5 space-y-4">
          {porCategoria.map((c) => {
            const headline = pistaHeadline(c.kind);
            return (
              <div
                key={c.value}
                className="overflow-hidden rounded-3xl border border-border bg-card"
              >
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <span aria-hidden>{headline.emoji}</span>
                  <h3 className="flex-1 text-sm font-bold">{c.label}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                    {c.rows.length}
                  </span>
                </div>

                {c.rows.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-muted-foreground">
                    Nada por aqui ainda.
                  </p>
                ) : (
                  <>
                    <ul className="divide-y divide-border">
                      {c.rows.slice(0, PREVIA).map((n) => (
                        <li key={n.id}>
                          <Linha n={n} compacta />
                        </li>
                      ))}
                    </ul>
                    {c.rows.length > PREVIA && (
                      <button
                        type="button"
                        onClick={() => trocar(c.value)}
                        className="flex w-full items-center justify-center gap-1 border-t border-border px-4 py-2.5 text-xs font-bold text-accent transition hover:bg-muted/40"
                      >
                        Ver as {c.rows.length} <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        (() => {
          const visible = items.filter((n) => matches(n, filter));
          if (visible.length === 0) return <Vazio texto="Nenhuma pista nesta categoria ainda." />;

          const pagina = visible.slice(0, mostrando);
          const groups: { label: string; rows: Notification[] }[] = [];
          for (const n of pagina) {
            const label = bucket(n.detectedAt);
            const last = groups[groups.length - 1];
            if (last && last.label === label) last.rows.push(n);
            else groups.push({ label, rows: [n] });
          }

          return (
            <div className="mt-5 space-y-6">
              {groups.map((g) => (
                <div key={g.label}>
                  <h2 className="mb-2 text-sm font-bold">{g.label}</h2>
                  <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
                    {g.rows.map((n) => (
                      <li key={n.id}>
                        <Linha n={n} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {visible.length > mostrando && (
                <button
                  type="button"
                  onClick={() => setMostrando((m) => m + PAGINA)}
                  className="w-full rounded-2xl border border-border bg-card px-6 py-3 text-sm font-bold transition hover:bg-muted/40"
                >
                  Mostrar mais ({visible.length - mostrando} restantes)
                </button>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}

/**
 * De quem são as pistas — um perfil por vez.
 *
 * Fechado, ocupa uma linha e mostra só a escolha atual; clicando, abre a
 * lista com as outras contas. Uma fileira com todos os perfis comia a tela
 * antes de a primeira pista aparecer.
 */
function SeletorDePerfil({
  perfis,
  valor,
  onChange,
}: {
  perfis: { username: string; avatarUrl: string | null }[];
  valor: string | null;
  onChange: (v: string | null) => void;
}) {
  const [aberto, setAberto] = React.useState(false);
  const escolhido = perfis.find((p) => p.username === valor) ?? null;

  const opcoes: { username: string | null; avatarUrl: string | null; label: string }[] = [
    { username: null, avatarUrl: null, label: "Todos os perfis" },
    ...perfis.map((p) => ({ username: p.username, avatarUrl: p.avatarUrl, label: `@${p.username}` })),
  ];

  return (
    <div className="relative mb-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-plum/50">De quem?</p>

      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-border bg-card py-2 pl-2 pr-3 text-left transition hover:border-accent/50"
      >
        {escolhido ? (
          <Avatar src={escolhido.avatarUrl} name={escolhido.username} size={30} />
        ) : (
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-muted text-sm">
            🐶
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-bold">
          {escolhido ? `@${escolhido.username}` : "Todos os perfis"}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <ul className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card py-1 shadow-lg">
          {opcoes.map((o) => (
            <li key={o.username ?? "todos"}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.username);
                  setAberto(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-muted/50 ${
                  (o.username ?? null) === valor ? "bg-accent/5" : ""
                }`}
              >
                {o.username ? (
                  <Avatar src={o.avatarUrl} name={o.username} size={26} />
                ) : (
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-muted text-xs">
                    🐶
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm">{o.label}</span>
                {(o.username ?? null) === valor && <Check className="h-4 w-4 shrink-0 text-accent" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
