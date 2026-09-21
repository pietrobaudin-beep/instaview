"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronDown, Clapperboard, Clock3, ImageIcon, Loader2, Lock, PawPrint, Sparkles, Tag, TrendingUp, UserMinus, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { BRAND } from "@/lib/voice";

interface SeriesPoint {
  at: string;
  followers: number;
  following: number;
}

interface TimelineItem {
  type: "FOLLOW" | "UNFOLLOW";
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  detectedAt: string;
}

interface AlertItem {
  tone: "accent" | "success" | "danger" | "muted";
  text: string;
}

interface NewsItem {
  kind: string;
  detectedAt: string;
  data: {
    takenAt: string | null;
    thumbnailUrl: string | null;
    code: string | null;
    caption: string | null;
    people: string[];
  };
}

interface History {
  saved: boolean;
  news?: NewsItem[];
  analyses: number;
  lastAnalyzedAt: string | null;
  series: SeriesPoint[];
  timeline: TimelineItem[];
  alerts: AlertItem[];
}

const EMPTY: History = {
  saved: false,
  analyses: 0,
  lastAnalyzedAt: null,
  series: [],
  timeline: [],
  alerts: [],
};

const NEWS: Record<string, { icon: React.ElementType; label: (n: NewsItem) => string }> = {
  post: { icon: ImageIcon, label: () => "Post novo" },
  reel: { icon: Clapperboard, label: () => "Reel novo" },
  story: { icon: Clock3, label: (n) => (n.data.people.length ? `Story novo · marcou @${n.data.people.join(", @")}` : "Story novo") },
  tagged: { icon: Tag, label: (n) => (n.data.people[0] ? `Marcado(a) por @${n.data.people[0]}` : "Marcado(a) num post") },
};

const thumb = (url: string | null) =>
  url && /(?:\.fbcdn\.net|\.cdninstagram\.com)/i.test(url) ? `/api/img?url=${encodeURIComponent(url)}` : url;

function ago(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "";
  }
}

function Panel({
  title,
  icon: Icon,
  children,
  action,
  className = "",
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card ${className}`}>
      <header className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Icon className="h-4 w-4 text-accent" />
        <h2 className="font-semibold">{title}</h2>
        <span className="ml-auto">{action}</span>
      </header>
      <div className="flex min-h-[13.5rem] flex-col p-5">{children}</div>
    </section>
  );
}

/**
 * A altura que cada cartão mostra antes do "Ver mais".
 *
 * É o que mantém os cartões do mesmo tamanho: contar linhas não bastava, já
 * que uma linha do "Rastro recente" é mais alta que uma de "Novidades" — 4 de
 * cada davam cartões de alturas diferentes. Aqui o teto é o mesmo em pixels.
 */
const ALTURA = "max-h-[9.5rem]";
/** Acima disto já há o que esconder, então o "Ver mais" aparece. */
const LINHAS = 3;

function VerMais({
  total,
  aberto,
  onToggle,
}: {
  total: number;
  aberto: boolean;
  onToggle: () => void;
}) {
  if (total <= LINHAS) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-auto flex w-full items-center justify-center gap-1 pt-3 text-xs font-bold text-accent transition hover:opacity-80"
    >
      {aberto ? "Ver menos" : `Ver mais ${total - LINHAS}`}
      <ChevronDown className={`h-3.5 w-3.5 transition ${aberto ? "rotate-180" : ""}`} />
    </button>
  );
}

const TONE: Record<AlertItem["tone"], string> = {
  accent: "border-accent/40 bg-accent/10 text-accent",
  success: "border-emerald-500/40 bg-emerald-50 text-emerald-800",
  danger: "border-rose-500/40 bg-rose-50 text-rose-800",
  muted: "border-border bg-muted/30 text-muted-foreground",
};

/** Two-line sparkline of followers + following, drawn inline (no chart lib). */
function Sparkline({ series }: { series: SeriesPoint[] }) {
  const W = 640;
  const H = 160;
  const PAD = 8;

  if (series.length < 2) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        O gráfico aparece a partir da segunda análise deste perfil.
      </p>
    );
  }

  const line = (key: "followers" | "following") => {
    const values = series.map((p) => p[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values
      .map((v, i) => {
        const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
        const y = H - PAD - ((v - min) / span) * (H - PAD * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const first = series[0];
  const last = series[series.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" role="img" aria-label="Seguidores e seguindo ao longo do tempo">
        <path d={line("followers")} fill="none" stroke="hsl(var(--accent))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={line("following")} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-accent" />
          Seguidores · {formatNumber(last.followers)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-[#60a5fa]" />
          Seguindo · {formatNumber(last.following)}
        </span>
        <span className="ml-auto text-muted-foreground">
          {series.length} análises desde {ago(first.at)}
        </span>
      </div>
    </div>
  );
}

/**
 * History, alerts and timeline for one profile. Everything here comes from
 * readings already stored, so opening it never costs a new analysis.
 */
export function HistoryPanel({
  username,
  className = "",
  loggedIn,
  isPro = false,
}: {
  username: string;
  className?: string;
  loggedIn: boolean;
  /** Pro can pin; free sees the lock and is sent to the offer. */
  isPro?: boolean;
}) {
  const router = useRouter();
  // Cada cartão abre e fecha sozinho.
  const [abertos, setAbertos] = React.useState<Record<string, boolean>>({});
  const abrir = (k: string) => setAbertos((a) => ({ ...a, [k]: !a[k] }));
  const [history, setHistory] = React.useState<History | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    setHistory(null);
    (async () => {
      try {
        const r = await fetch(`/api/profile-history?username=${encodeURIComponent(username)}`);
        const b = await r.json();
        if (alive) setHistory({ ...EMPTY, ...b });
      } catch {
        if (alive) setHistory(EMPTY);
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  async function save() {
    if (!loggedIn) {
      router.push(`/signup?next=${encodeURIComponent(`/p/${username}`)}`);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (r.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/p/${username}`)}`);
        return;
      }
      // Putting a profile no Faro is a Pro feature.
      if (r.status === 402) {
        router.push(`/pricing?next=${encodeURIComponent(`/p/${username}`)}`);
        return;
      }
      const b = await r.json();
      if (!r.ok) {
        setSaveError(b.error ?? "Não foi possível salvar este perfil.");
        return;
      }
      setHistory((h) => ({ ...(h ?? EMPTY), saved: true }));
    } catch {
      setSaveError("Falha de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const h = history;

  return (
    <div className={`space-y-6 ${className}`}>
      <p className="text-lg font-bold">{BRAND.phrases.oQueMudou}</p>
      <Panel
        title="Pistas"
        icon={Bell}
        action={
          h && !h.saved ? (
            <Button size="sm" variant="accent" onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPro ? (
                <PawPrint className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Colocar no Faro
            </Button>
          ) : h?.saved ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <Check className="h-3.5 w-3.5" /> No seu Faro
            </span>
          ) : null
        }
      >
        {!h ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : !h.saved ? (
          <div>
            <p className="text-sm text-muted-foreground">
              Coloque este perfil no Faro e o Farejo observa por você: quem começou a seguir,
              quem deixou de seguir e o que mudou no perfil.
            </p>
            {saveError && <p className="mt-2 text-xs text-destructive">{saveError}</p>}
          </div>
        ) : (
          <ul className="space-y-2">
            {h.alerts.map((a, i) => (
              <li key={i} className={`rounded-xl border px-3 py-2.5 text-sm ${TONE[a.tone]}`}>
                {a.text}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {h?.saved && (
        <>
          <Panel title="Novidades do Faro" icon={Sparkles}>
            {!h.news || h.news.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                🐾 O Faro olha este perfil todo dia e mostra aqui só o que for novo: posts, stories e
                marcações que aparecerem daqui pra frente.
              </p>
            ) : (
              <ul
                className={`divide-y divide-border ${abertos.news ? "" : `${ALTURA} overflow-hidden`}`}
              >
                {h.news.map((n, i) => {
                  const meta = NEWS[n.kind] ?? NEWS.post;
                  const Icon = meta.icon;
                  const src = thumb(n.data.thumbnailUrl);
                  const href = n.data.code ? `https://www.instagram.com/${n.kind === "reel" ? "reel" : "p"}/${n.data.code}/` : null;
                  const row = (
                    <div className="flex items-center gap-3 py-2.5">
                      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-pink/50 to-purple/40">
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Icon className="h-5 w-5 text-vinho/50" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-semibold">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
                          <span className="truncate">{meta.label(n)}</span>
                        </p>
                        {n.data.caption && <p className="truncate text-xs text-muted-foreground">{n.data.caption}</p>}
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{ago(n.detectedAt)}</span>
                    </div>
                  );
                  return (
                    <li key={n.kind + i}>
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer" className="block hover:opacity-80">
                          {row}
                        </a>
                      ) : (
                        row
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <VerMais total={h.news?.length ?? 0} aberto={!!abertos.news} onToggle={() => abrir("news")} />
          </Panel>

          <Panel title="Rastro recente" icon={UserPlus}>
            {h.timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                😴 Nada passou pelo Faro ainda. Cada nova análise compara com a anterior.
              </p>
            ) : (
              <ol
                className={`relative space-y-4 border-l border-border pl-5 ${
                  abertos.timeline ? "" : `${ALTURA} overflow-hidden`
                }`}
              >
                {h.timeline.map((t, i) => (
                  <li key={t.username + i} className="relative">
                    <span
                      className={`absolute -left-[26px] top-2 flex h-4 w-4 items-center justify-center rounded-full ${
                        t.type === "FOLLOW" ? "bg-emerald-100" : "bg-rose-100"
                      }`}
                    >
                      {t.type === "FOLLOW" ? (
                        <UserPlus className="h-2.5 w-2.5 text-emerald-700" />
                      ) : (
                        <UserMinus className="h-2.5 w-2.5 text-rose-700" />
                      )}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <Avatar src={t.avatarUrl} name={t.displayName ?? t.username} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          <span className="text-muted-foreground">
                            {t.type === "FOLLOW" ? "Começou a seguir " : "Deixou de seguir "}
                          </span>
                          <span className="font-medium">@{t.username}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">{ago(t.detectedAt)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <VerMais
              total={h.timeline.length}
              aberto={!!abertos.timeline}
              onToggle={() => abrir("timeline")}
            />
          </Panel>

          <Panel title="Seguidores e seguindo ao longo do tempo" icon={TrendingUp}>
            <Sparkline series={h.series} />
          </Panel>
        </>
      )}
    </div>
  );
}
