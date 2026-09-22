"use client";

import * as React from "react";
import { Check, Loader2, Search, ShieldCheck, Trash2, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PlanId = "FREE" | "WEEK" | "PRO" | "AGENCY";

export interface Row {
  id: string;
  email: string;
  name: string | null;
  plan: PlanId;
  profiles: number;
  createdAt: string;
}

export interface PlanoStat {
  id: PlanId;
  nome: string;
  cobranca: string;
  preco: number;
  maxConsults: number;
  maxProfiles: number;
  storiesHours: number | null;
  pessoas: number;
  receitaMensal: number;
}

export interface MesStat {
  mes: string;
  rotulo: string;
  contas: number;
  avulsos: number;
  receita: number;
}

export interface PeriodoStat {
  id: string;
  de: string;
  ate: string;
  atual: { farejos: number; contas: number; faro: number; avulsos: number; receita: number };
  anterior: { farejos: number; contas: number; faro: number; avulsos: number; receita: number };
}

export interface Live {
  agora: number;
  noDia: number;
  paises: { nome: string; total: number }[];
  cidades: { nome: string; total: number }[];
  paginas: { nome: string; total: number }[];
  aparelhos: { nome: string; total: number }[];
  origens: { nome: string; total: number }[];
  horas: { hora: number; pessoas: number }[];
  paisesDoDia: { nome: string; total: number }[];
}

export interface Infra {
  hiker: {
    requisicoesRestantes: number;
    dinheiro: number;
    moeda: string;
    porSegundo: number;
    consumoHoje: number | null;
    consumo7d: number | null;
    custoHoje: number | null;
    periodo: string;
    consumoPeriodo: number | null;
    diasComLeitura: number;
    farejosNoPeriodo: number;
    coletasNoPeriodo: number;
    porRequisicao: number;
    diasRestantes: number | null;
    esperadoPorDia: number;
    perfisNoFaro: number;
    secoesPorDia: number;
    custoEsperadoMes: number;
    guardado: { secao: string; linhas: number }[];
  } | null;
  apify: {
    plano: string | null;
    cicloDe: string | null;
    cicloAte: string | null;
    usdNoCiclo: number;
    creditoMensal: number | null;
    execucoesNoPeriodo: number;
    usdNoPeriodo: number;
    porRede: { rede: string; doFarejo: boolean; execucoes: number; falhas: number; usd: number }[];
    amostra: number;
  } | null;
  banco: {
    bytes: number;
    limiteBytes: number;
    limiteGb: number;
    tabelas: { nome: string; bytes: number }[];
    imagens: { bytes: number; linhas: number };
  };
  usuarios: { id: string; quem: string; perfis: number; bytes: number }[];
}

export interface Stats {
  periodo?: PeriodoStat;
  planos: PlanoStat[];
  meses: MesStat[];
  recorrente: number;
  anual: number;
  avulso: { preco: number; total: number; mes: number; receitaMes: number; receitaTotal: number };
  noMes: number;
  usuarios: { total: number; novosMes: number; novosSemana: number; noFaro: number };
}

/** Os planos como você fechou: nome, preço e como é cobrado. */
const PLANOS: { id: PlanId; nome: string; preco: string }[] = [
  { id: "FREE", nome: "Curioso", preco: "grátis" },
  { id: "WEEK", nome: "Faro de Cão", preco: "R$ 14,90/sem" },
  { id: "PRO", nome: "Farejo PRO", preco: "R$ 29,90/mês" },
  { id: "AGENCY", nome: "Faro Detetive", preco: "R$ 99,90/ano" },
];

const real = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

/** Uma cor por plano, usada no anel, nas barras e na tabela. */
const COR: Record<PlanId, string> = {
  FREE: "#D9D2CC",
  WEEK: "#FFE257",
  PRO: "#F6A8D2",
  AGENCY: "#B7A6FF",
};

/** O seletor de período, na ordem em que se pensa no tempo. */
const PERIODOS = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "6m", label: "6 meses" },
  { id: "1a", label: "1 ano" },
] as const;

const COBRANCA: Record<string, string> = {
  free: "grátis",
  weekly: "por semana",
  monthly: "por mês",
  yearly: "por ano",
};

export function AdminPanel({
  adminEmail,
  demo,
}: {
  adminEmail: string;
  /**
   * Dados de mentira para a prévia em `/admin/preview`, que existe só em
   * desenvolvimento. Com `demo`, a tela não chama nenhuma rota e nenhum botão
   * muda nada — é só para olhar o desenho sem precisar do token de admin.
   */
  demo?: { rows: Row[]; stats: Stats; live?: Live; infra?: Infra };
}) {
  // Faturamento primeiro: é o que se abre o admin para ver.
  const [aba, setAba] = React.useState<"faturamento" | "pessoas" | "api" | "armazenamento">(
    "faturamento",
  );
  const [periodo, setPeriodo] = React.useState("7d");
  const [rows, setRows] = React.useState<Row[]>(demo?.rows ?? []);
  const [stats, setStats] = React.useState<Stats | null>(demo?.stats ?? null);
  const [live, setLive] = React.useState<Live | null>(demo?.live ?? null);
  const [infra, setInfra] = React.useState<Infra | null>(demo?.infra ?? null);
  const [loading, setLoading] = React.useState(!demo);
  const [q, setQ] = React.useState("");
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [savedId, setSavedId] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  // Apagar conta pergunta duas vezes: o primeiro clique só arma o botão.
  const [confirmarId, setConfirmarId] = React.useState<string | null>(null);

  const load = React.useCallback(async (query: string) => {
    if (demo) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      if (res.ok) setRows((await res.json()).users);
    } finally {
      setLoading(false);
    }
  }, [demo]);

  const loadStats = React.useCallback(async () => {
    if (demo) return;
    const res = await fetch(`/api/admin/stats?periodo=${periodo}`);
    if (res.ok) setStats(await res.json());
  }, [demo, periodo]);

  React.useEffect(() => {
    load("");
    loadStats();
    if (!demo) {
      fetch(`/api/admin/infra?periodo=${periodo}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => b && setInfra(b))
        .catch(() => {});
    }
  }, [load, loadStats, demo, periodo]);

  // O "agora" se atualiza sozinho a cada 20s enquanto a aba estiver à vista.
  React.useEffect(() => {
    if (demo) return;
    let vivo = true;
    const puxar = () => {
      if (!vivo || document.visibilityState !== "visible") return;
      fetch("/api/admin/live")
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => vivo && b && setLive(b))
        .catch(() => {});
    };
    puxar();
    const id = window.setInterval(puxar, 20_000);
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, [demo]);

  // Debounced search.
  React.useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q, load]);

  async function changePlan(id: string, plan: PlanId) {
    if (demo) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, plan } : r)));
      return;
    }
    setSavingId(id);
    setSavedId(null);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const b = await res.json().catch(() => ({}));
      if (res.ok) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, plan } : r)));
        setSavedId(id);
        setTimeout(() => setSavedId(null), 1500);
        loadStats();
      } else {
        setErro(b?.error ?? "Não deu para mudar o plano.");
      }
    } finally {
      setSavingId(null);
    }
  }

  async function apagar(id: string) {
    if (demo) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setConfirmarId(null);
      return;
    }
    setSavingId(id);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/users/${id}?confirm=1`, { method: "DELETE" });
      const b = await res.json().catch(() => ({}));
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        loadStats();
      } else {
        setErro(b?.error ?? "Não deu para apagar.");
      }
    } finally {
      setSavingId(null);
      setConfirmarId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <ShieldCheck className="h-5 w-5 text-accent" /> Farejo Admin
        </div>
        <span className="text-sm text-muted-foreground">
          {demo ? "prévia — dados fictícios" : adminEmail}
        </span>
      </div>

      <div className="mb-6 flex gap-2">
        {(["faturamento", "pessoas", "api", "armazenamento"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAba(a)}
            aria-pressed={aba === a}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition",
              aba === a ? "bg-pink text-ink" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {a === "pessoas"
              ? "Pessoas e planos"
              : a === "api"
                ? "API"
                : a === "armazenamento"
                  ? "Armazenamento"
                  : "Faturamento"}
          </button>
        ))}
      </div>

      {erro && (
        <p className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      {aba === "api" || aba === "armazenamento" ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight">
            {aba === "api" ? "API de dados" : "Armazenamento"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {aba === "api"
              ? "Os créditos da HikerAPI: quanto resta, quanto sai por dia e o que já está guardado."
              : "O espaço no banco: quanto do teto está em uso, onde ele está e quanto cada pessoa ocupa."}
          </p>
          {infra ? (
            aba === "api" ? (
              <Api hiker={infra.hiker} apify={infra.apify} periodo={periodo} onPeriodo={setPeriodo} />
            ) : (
              <Armazenamento infra={infra} />
            )
          ) : (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Consultando o provedor…
            </div>
          )}
        </>
      ) : aba === "pessoas" ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight">Pessoas e planos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dar um plano a alguém vale na hora. &quot;Tirar assinatura&quot; devolve a pessoa para o
            Curioso, sem apagar nada.
          </p>

          <div className="relative mt-5 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Procurar por e-mail ou telefone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <Card className="mt-4">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                </div>
              ) : rows.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  Ninguém encontrado.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {rows.map((u) => (
                    <li key={u.id} className="flex flex-col gap-3 p-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-semibold">{u.email}</span>
                        {savedId === u.id && (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-success">
                            <Check className="h-3 w-3" /> salvo
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {u.profiles} no Faro · entrou em{" "}
                          {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap gap-1 rounded-xl border border-border p-1">
                          {PLANOS.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              disabled={savingId === u.id}
                              onClick={() => changePlan(u.id, p.id)}
                              title={p.preco}
                              className={cn(
                                "rounded-lg px-3 py-1 text-xs font-semibold transition disabled:opacity-50",
                                u.plan === p.id
                                  ? "bg-pink text-ink"
                                  : "text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {p.nome}
                            </button>
                          ))}
                        </div>

                        {u.plan !== "FREE" && (
                          <button
                            type="button"
                            disabled={savingId === u.id}
                            onClick={() => changePlan(u.id, "FREE")}
                            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
                          >
                            Tirar assinatura
                          </button>
                        )}

                        {confirmarId === u.id ? (
                          <span className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => apagar(u.id)}
                              disabled={savingId === u.id}
                              className="rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                            >
                              Apagar mesmo, sem volta
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmarId(null)}
                              className="text-xs font-semibold text-muted-foreground hover:underline"
                            >
                              cancelar
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmarId(u.id)}
                            title="Apaga a conta e tudo que é dela"
                            className="flex items-center gap-1 rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/5"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remover
                          </button>
                        )}

                        {savingId === u.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <p className="mt-4 text-xs text-muted-foreground">
            O <b>Farejador</b> (R$ 9,90, uso único) não é plano: é o desbloqueio de um perfil só, e
            aparece no faturamento como avulso.
          </p>
        </>
      ) : (
        <>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Wallet className="h-5 w-5 text-accent" /> Faturamento
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Projeção pelos planos ativos hoje, mais os desbloqueios avulsos já pagos.
          </p>

          {!stats ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Somando…
            </div>
          ) : (
            <>
              {live && <AoVivo live={live} />}

              <div className="mt-5 flex flex-wrap gap-2">
                {PERIODOS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriodo(p.id)}
                    aria-pressed={periodo === p.id}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                      periodo === p.id
                        ? "bg-plum text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {stats.periodo && (
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <Numero
                    titulo="Farejos"
                    valor={String(stats.periodo.atual.farejos)}
                    antes={stats.periodo.anterior.farejos}
                    agora={stats.periodo.atual.farejos}
                  />
                  <Numero
                    titulo="Contas novas"
                    valor={String(stats.periodo.atual.contas)}
                    antes={stats.periodo.anterior.contas}
                    agora={stats.periodo.atual.contas}
                  />
                  <Numero
                    titulo="Entraram no Faro"
                    valor={String(stats.periodo.atual.faro)}
                    antes={stats.periodo.anterior.faro}
                    agora={stats.periodo.atual.faro}
                  />
                  <Numero
                    titulo="Avulsos no período"
                    valor={real(stats.periodo.atual.receita)}
                    antes={stats.periodo.anterior.receita}
                    agora={stats.periodo.atual.receita}
                  />
                </div>
              )}

              <p className="mt-2 text-[11px] text-muted-foreground">
                Comparado com o período anterior do mesmo tamanho.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <Numero titulo="Recorrente por mês" valor={real(stats.recorrente)} destaque />
                <Numero titulo="Avulsos no mês" valor={real(stats.avulso.receitaMes)} />
                <Numero titulo="Total no mês" valor={real(stats.noMes)} />
                <Numero titulo="Projeção do ano" valor={real(stats.anual)} />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <Numero titulo="Contas" valor={String(stats.usuarios.total)} />
                <Numero titulo="Novas no mês" valor={String(stats.usuarios.novosMes)} />
                <Numero titulo="Novas em 7 dias" valor={String(stats.usuarios.novosSemana)} />
                <Numero titulo="Perfis no Faro" valor={String(stats.usuarios.noFaro)} />
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_1.3fr]">
                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-sm font-bold">De onde vem a receita</h2>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Por mês, somando planos e avulsos.
                    </p>
                    <Rosca
                      fatias={[
                        ...stats.planos
                          .filter((p) => p.receitaMensal > 0)
                          .map((p) => ({ nome: p.nome, valor: p.receitaMensal, cor: COR[p.id] })),
                        { nome: "Farejador (avulso)", valor: stats.avulso.receitaMes, cor: "#4A0827" },
                      ]}
                      total={stats.noMes}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <h2 className="text-sm font-bold">Últimos 6 meses</h2>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Contas criadas e desbloqueios pagos — contados no banco, sem projeção.
                    </p>
                    <Barras meses={stats.meses ?? []} />
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-3">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3 font-semibold">Plano</th>
                        <th className="px-4 py-3 font-semibold">Preço</th>
                        <th className="px-4 py-3 font-semibold">Limites</th>
                        <th className="px-4 py-3 text-right font-semibold">Pessoas</th>
                        <th className="px-4 py-3 text-right font-semibold">Por mês</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stats.planos.map((p) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3 font-semibold">
                            <span className="flex items-center gap-2">
                              <span
                                aria-hidden
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ background: COR[p.id] }}
                              />
                              {p.nome}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {p.preco > 0 ? `${real(p.preco)} ${COBRANCA[p.cobranca]}` : "grátis"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {p.maxConsults} consultas · {p.maxProfiles} no Faro ·{" "}
                            {p.storiesHours === null
                              ? "stories desde a entrada"
                              : p.storiesHours > 0
                                ? `stories ${p.storiesHours}h`
                                : "sem stories"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{p.pessoas}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {real(p.receitaMensal)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30">
                        <td className="px-4 py-3 font-semibold">
                          <span className="flex items-center gap-2">
                            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-vinho" />
                            Farejador (avulso)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {real(stats.avulso.preco)} uma vez
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {stats.avulso.total} desbloqueios pagos no total
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{stats.avulso.mes}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {real(stats.avulso.receitaMes)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Como a conta é feita: cada plano ativo entra pelo preço trazido para o mês (semana ×
                4,345; ano ÷ 12). É o que entra <b>se ninguém cancelar</b> — não é o que o Stripe
                depositou. Estornos, taxas e cobranças que falharam só aparecem no painel do Stripe;
                para ver isso aqui, os pagamentos teriam de ser guardados no banco a cada webhook.
              </p>
            </>
          )}
        </>
      )}
    </main>
  );
}

function Numero({
  titulo,
  valor,
  destaque = false,
  antes,
  agora,
}: {
  titulo: string;
  valor: string;
  destaque?: boolean;
  /** Mesmo número no período anterior, para a variação. */
  antes?: number;
  agora?: number;
}) {
  // Sem base de comparação (zero antes), porcentagem não diz nada: some.
  const variacao =
    antes !== undefined && agora !== undefined && antes > 0
      ? Math.round(((agora - antes) / antes) * 100)
      : null;

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        destaque ? "border-pink bg-pink/10" : "border-border bg-card",
      )}
    >
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <p className="mt-0.5 flex items-baseline gap-2">
        <span className="text-xl font-bold tabular-nums">{valor}</span>
        {variacao !== null && (
          <span
            className={cn(
              "text-[11px] font-bold tabular-nums",
              variacao > 0 ? "text-emerald-600" : variacao < 0 ? "text-rose-600" : "text-muted-foreground",
            )}
          >
            {variacao > 0 ? "+" : ""}
            {variacao}%
          </span>
        )}
      </p>
    </div>
  );
}

/**
 * A rosca de composição da receita.
 *
 * Desenhada à mão em SVG, sem biblioteca: são quatro ou cinco fatias, e uma
 * dependência nova de gráficos pesa mais que o gráfico.
 */
function Rosca({
  fatias,
  total,
}: {
  fatias: { nome: string; valor: number; cor: string }[];
  total: number;
}) {
  const soma = fatias.reduce((n, f) => n + f.valor, 0);
  if (soma <= 0) {
    return (
      <p className="py-10 text-center text-xs text-muted-foreground">
        Ainda não há receita para somar.
      </p>
    );
  }

  const R = 52;
  const ESPESSURA = 16;
  const circunferencia = 2 * Math.PI * R;
  let acumulado = 0;

  return (
    <div className="mt-4 flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0 -rotate-90">
        {fatias.map((f) => {
          const parte = f.valor / soma;
          const traco = parte * circunferencia;
          const el = (
            <circle
              key={f.nome}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={f.cor}
              strokeWidth={ESPESSURA}
              strokeDasharray={`${traco} ${circunferencia - traco}`}
              strokeDashoffset={-acumulado}
            />
          );
          acumulado += traco;
          return el;
        })}
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {fatias.map((f) => (
          <li key={f.nome} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: f.cor }}
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{f.nome}</span>
            <span className="shrink-0 font-semibold tabular-nums">{real(f.valor)}</span>
            <span className="w-9 shrink-0 text-right text-muted-foreground tabular-nums">
              {Math.round((f.valor / soma) * 100)}%
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2 border-t border-border pt-1.5 text-xs font-bold">
          <span className="min-w-0 flex-1">Total no mês</span>
          <span className="tabular-nums">{real(total)}</span>
        </li>
      </ul>
    </div>
  );
}

/** Barras do mês: contas criadas e desbloqueios pagos, lado a lado. */
function Barras({ meses }: { meses: MesStat[] }) {
  if (!meses.length) {
    return <p className="py-10 text-center text-xs text-muted-foreground">Sem histórico ainda.</p>;
  }
  const teto = Math.max(1, ...meses.map((m) => Math.max(m.contas, m.avulsos)));

  return (
    <>
      {/* items-stretch e flex-1: sem um pai com altura resolvida, a altura em
          porcentagem das barras vira zero e o gráfico some. */}
      <div className="mt-4 flex h-36 items-stretch gap-3">
        {meses.map((m) => (
          <div key={m.mes} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end justify-center gap-1">
              <span
                title={`${m.contas} contas`}
                className="w-1/2 max-w-[18px] rounded-t-md bg-pink transition-all"
                style={{ height: `${Math.max(2, (m.contas / teto) * 100)}%` }}
              />
              <span
                title={`${m.avulsos} desbloqueios · ${real(m.receita)}`}
                className="w-1/2 max-w-[18px] rounded-t-md bg-vinho transition-all"
                style={{ height: `${Math.max(2, (m.avulsos / teto) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{m.rotulo}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-pink" /> contas criadas
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-vinho" /> desbloqueios pagos
        </span>
      </div>
    </>
  );
}

/**
 * Quem está no site agora.
 *
 * O número grande é gente com o site aberto nos últimos 2 minutos. As listas
 * são dessas mesmas pessoas: em que página estão, de que país e cidade, em que
 * aparelho e de onde vieram. As barras são o movimento das últimas 24 horas.
 */
function AoVivo({ live }: { live: Live }) {
  const teto = Math.max(1, ...live.horas.map((h) => h.pessoas));

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-plum/15 bg-white">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-5 py-4">
        <span className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <b className="text-2xl font-bold tabular-nums">{live.agora}</b>
          <span className="text-sm text-muted-foreground">
            {live.agora === 1 ? "pessoa no site agora" : "pessoas no site agora"}
          </span>
        </span>
        <span className="text-sm text-muted-foreground">
          <b className="font-bold text-foreground tabular-nums">{live.noDia}</b> nas últimas 24h
        </span>
      </div>

      <div className="grid gap-5 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <Lista titulo="Em que página" itens={live.paginas} />
        <Lista titulo="De onde" itens={live.paises} vazio="Sem país — a Vercel só informa no ar." />
        <Lista titulo="Cidade" itens={live.cidades} vazio="Sem cidade agora." />
        <Lista titulo="Chegaram por" itens={live.origens} vazio="Direto, sem link de fora." />
      </div>

      <div className="border-t border-border px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Últimas 24 horas
        </p>
        <div className="mt-2 flex h-16 items-end gap-[3px]">
          {live.horas.map((h, i) => (
            <span
              key={i}
              title={`${h.hora}h · ${h.pessoas}`}
              className="flex-1 rounded-t bg-pink"
              style={{ height: `${Math.max(3, (h.pessoas / teto) * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>24h atrás</span>
          <span>agora</span>
        </div>
      </div>
    </div>
  );
}

function Lista({
  titulo,
  itens,
  vazio = "Ninguém agora.",
}: {
  titulo: string;
  itens: { nome: string; total: number }[];
  vazio?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </p>
      {itens.length === 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {itens.map((i) => (
            <li key={i.nome} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate">{i.nome}</span>
              <span className="shrink-0 font-bold tabular-nums">{i.total}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const tamanho = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

/**
 * As duas APIs pagas, separadas.
 *
 * Elas não se somam: a HikerAPI é pré-paga por requisição (US$ 1 / 1.000) e
 * sustenta a análise inteira; o Apify cobra por execução, num ciclo mensal
 * próprio, e serve só ao bloco de outras redes. Misturar os dois números
 * esconderia qual dos dois está custando.
 */
/**
 * O cabeçalho de um provedor, com marca própria.
 *
 * Os dois blocos tinham só um título de texto e, rolando a tela, era fácil
 * ler um número da HikerAPI achando que era do Apify. A marca resolve isso
 * antes da leitura: cor e letra diferentes, repetidas no topo de cada bloco.
 *
 * São monogramas desenhados aqui, não os logotipos das empresas: logotipo de
 * terceiro é imagem externa, muda sem avisar e nem é nosso para usar. A cor
 * de cada um é a que a própria marca usa, o que basta para distinguir.
 */
function MarcaDoProvedor({
  letra,
  nome,
  descricao,
  cor,
  fundo,
}: {
  letra: string;
  nome: string;
  descricao: string;
  cor: string;
  fundo: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold",
          fundo,
          cor,
        )}
        aria-hidden
      >
        {letra}
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-extrabold tracking-tight">{nome}</h2>
        <p className="text-[11px] leading-snug text-muted-foreground">{descricao}</p>
      </div>
    </div>
  );
}

function Api({
  hiker,
  apify,
  periodo,
  onPeriodo,
}: {
  hiker: Infra["hiker"];
  apify: Infra["apify"];
  periodo: string;
  onPeriodo: (p: string) => void;
}) {
  if (!hiker) {
    return (
      <p className="mt-5 text-sm text-muted-foreground">
        Sem chave configurada aqui — o saldo só aparece onde a HIKERAPI_KEY existe.
      </p>
    );
  }
  const moeda = hiker.moeda === "USD" ? "USD" : "BRL";
  const dinheiro = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: moeda });

  const rotulo = PERIODOS.find((p) => p.id === periodo)?.label ?? periodo;

  const dolar = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "USD" });

  return (
    <div className="mt-5 space-y-3">
      <MarcaDoProvedor
        letra="H"
        nome="HikerAPI"
        descricao="O provedor dos dados do Instagram — sustenta a análise inteira. Pré-pago, US$ 1 por 1.000 requisições."
        cor="text-white"
        fundo="bg-plum"
      />

      {/* As mesmas janelas do faturamento, e valem para os dois provedores. */}
      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPeriodo(p.id)}
            aria-pressed={periodo === p.id}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              periodo === p.id
                ? "bg-plum text-white"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Numero
          titulo={`Gasto · ${rotulo}`}
          valor={
            hiker.consumoPeriodo == null
              ? "sem leitura"
              : `${hiker.consumoPeriodo.toLocaleString("pt-BR")} req`
          }
          destaque
        />
        <Numero
          titulo={`Custo · ${rotulo}`}
          valor={hiker.consumoPeriodo == null ? "—" : dinheiro(hiker.consumoPeriodo / 1000)}
        />
        <Numero
          titulo={`Farejos · ${rotulo}`}
          valor={hiker.farejosNoPeriodo.toLocaleString("pt-BR")}
        />
        <Numero
          titulo={`Coletas do Faro · ${rotulo}`}
          valor={hiker.coletasNoPeriodo.toLocaleString("pt-BR")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Numero
          titulo="Requisições restantes"
          valor={hiker.requisicoesRestantes.toLocaleString("pt-BR")}
        />
        <Numero titulo="Dinheiro na conta" valor={dinheiro(hiker.dinheiro)} />
        <Numero
          titulo="Dura mais"
          valor={hiker.diasRestantes == null ? "—" : `${hiker.diasRestantes} dias`}
        />
        {/* Em moeda, US$ 0,001 arredondava para "US$ 0,00" e não dizia nada. */}
        <Numero titulo="Preço" valor={`${dinheiro(hiker.porRequisicao * 1000)} / 1.000 req`} />
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-bold">O que sai todo dia, sem ninguém pedir</h2>
          <p className="mt-2 text-sm">
            <b className="text-lg font-bold">{hiker.esperadoPorDia.toLocaleString("pt-BR")}</b>{" "}
            <span className="text-muted-foreground">
              requisições por dia — {hiker.perfisNoFaro} perfis no Faro × {hiker.secoesPorDia} seções
              relidas
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cerca de <b className="text-foreground">{dinheiro(hiker.custoEsperadoMes)}</b> por mês só
            de acompanhamento. Tudo o que passar disso é gente farejando perfil novo.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-bold">Respostas guardadas</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Cada linha aqui é uma requisição que não precisou ser feita de novo.
          </p>
          <ul className="mt-2 space-y-1">
            {hiker.guardado.map((g) => (
              <li key={g.secao} className="flex items-center gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{g.secao}</span>
                <span className="shrink-0 tabular-nums">{g.linhas.toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        A HikerAPI só informa quanto <b>resta</b>, nunca quanto foi gasto: o gasto de um período é a
        diferença entre a leitura guardada do primeiro dia e a de agora. Por isso &quot;hoje&quot;
        começa em zero a cada virada, e períodos mais longos só aparecem depois que o dia
        correspondente tiver sido lido — hoje há <b>{hiker.diasComLeitura}</b>{" "}
        {hiker.diasComLeitura === 1 ? "dia guardado" : "dias guardados"}. Farejos e coletas, ao lado,
        vêm do nosso banco e valem sempre.
      </p>

      {/* ——— Apify, em bloco próprio ——— */}
      <div className="mt-6 border-t border-border pt-2">
        <MarcaDoProvedor
          letra="A"
          nome="Apify"
          descricao="Só o bloco “Outras redes sociais” (TikTok e YouTube). Cobra por execução, em ciclo mensal próprio."
          cor="text-ink"
          fundo="bg-[#97CF26]"
        />
      </div>

      {!apify ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Sem APIFY_TOKEN configurado aqui — o gasto só aparece onde a variável existe.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Numero titulo={`Gasto · ${rotulo}`} valor={dolar(apify.usdNoPeriodo)} />
            <Numero
              titulo={`Execuções · ${rotulo}`}
              valor={apify.execucoesNoPeriodo.toLocaleString("pt-BR")}
            />
            <Numero titulo="Gasto no ciclo" valor={dolar(apify.usdNoCiclo)} />
            <Numero
              titulo="Crédito do mês"
              valor={apify.creditoMensal ? dolar(apify.creditoMensal) : "—"}
            />
          </div>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-bold">Por rede</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                É por aqui que se decide se uma rede vale o que custa.
              </p>
              {apify.porRede.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma execução no período escolhido.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {apify.porRede.map((r) => (
                    <li key={r.rede} className="flex items-center gap-2 text-xs">
                      <span
                        className={`min-w-0 flex-1 truncate ${
                          r.doFarejo ? "text-foreground" : "italic text-muted-foreground"
                        }`}
                      >
                        {r.rede}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {r.execucoes}×{r.falhas > 0 ? ` · ${r.falhas} falhou` : ""}
                      </span>
                      <span className="shrink-0 tabular-nums font-semibold">{dolar(r.usd)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {apify.porRede.some((r) => !r.doFarejo) && (
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  O que está em itálico é execução que <b>não saiu do Farejo</b> — teste feito no
                  painel do Apify, por exemplo. Fica à parte de propósito: somado, inflaria o custo
                  do produto com algo que não é dele.
                </p>
              )}
            </CardContent>
          </Card>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            O ciclo do Apify vai de{" "}
            {apify.cicloDe ? new Date(apify.cicloDe).toLocaleDateString("pt-BR") : "—"} a{" "}
            {apify.cicloAte ? new Date(apify.cicloAte).toLocaleDateString("pt-BR") : "—"} (plano{" "}
            {apify.plano ?? "—"}), e não coincide com o mês do faturamento. O gasto por período vem
            das últimas {apify.amostra} execuções — o suficiente hoje, mas se o movimento crescer
            muito o número de um período longo pode ficar incompleto.
          </p>
        </>
      )}

    </div>
  );
}

/** O espaço no banco. */
function Armazenamento({ infra }: { infra: Infra }) {
  const { banco, usuarios } = infra;
  const usado = banco.limiteBytes > 0 ? Math.min(1, banco.bytes / banco.limiteBytes) : 0;

  return (
    <div className="mt-5 space-y-3">
      <Card>
        <CardContent className="p-5">
          <p className="text-sm">
            <b className="text-2xl font-bold">{tamanho(banco.bytes)}</b>{" "}
            <span className="text-muted-foreground">
              de {banco.limiteGb} GB ({Math.round(usado * 100)}%)
            </span>
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", usado > 0.8 ? "bg-destructive" : "bg-pink")}
              style={{ width: `${Math.max(1, usado * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            O teto é o do seu plano na Supabase, escrito na variável DB_SIZE_LIMIT_GB — o banco não
            sabe dizer sozinho qual é. Acima dele, a Supabase cobra por GB a mais.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-bold">Onde o espaço está</h2>
            <ul className="mt-2 space-y-1">
              {banco.tabelas.map((t) => (
                <li key={t.nome} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{t.nome}</span>
                  <span className="shrink-0 tabular-nums">{tamanho(t.bytes)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Fotos guardadas: <b>{banco.imagens.linhas.toLocaleString("pt-BR")}</b> cópias,{" "}
              {tamanho(banco.imagens.bytes)}. São compartilhadas entre quem acompanha o mesmo perfil.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-bold">Quanto cada pessoa ocupa</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Eventos e pistas dos perfis dela. As fotos ficam de fora porque são compartilhadas.
              </p>
            </div>
            <ul className="divide-y divide-border">
              {usuarios.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{u.quem}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {u.perfis} {u.perfis === 1 ? "perfil" : "perfis"}
                  </span>
                  <span className="w-20 shrink-0 text-right font-semibold tabular-nums">
                    {tamanho(u.bytes)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
