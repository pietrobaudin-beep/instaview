"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Check, ChevronDown, Loader2, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { pushRecentSearch, readRecentSearches, type RecentSearch } from "@/lib/recent-searches";

interface Hit {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
}

/** Quantas contas aparecem antes do "ver mais". */
const PREVIA = 3;

/**
 * The search screen from the designs: one @ field with a pink round button,
 * the list of matching accounts, and the recent searches kept on this device.
 *
 * A busca devolve ~20 contas numa requisição só, então a tela mostra 3 e
 * guarda o resto na memória: abrir "ver mais" não pede nada de novo e não
 * custa nada. Nada é farejado antes de a pessoa marcar de quem se trata — é
 * comum querer um @ e digitar outro parecido.
 */
export function SearchBlock({
  onPink = false,
  buttonLabel = "Farejar",
  placeholder = "Digite um usuário",
  showRecent = true,
  autoFocus = true,
  onActiveChange,
}: {
  onPink?: boolean;
  buttonLabel?: string;
  placeholder?: string;
  showRecent?: boolean;
  autoFocus?: boolean;
  /** Fires when the field starts / stops being used (focus or any text). */
  onActiveChange?: (active: boolean) => void;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [buscando, setBuscando] = React.useState(false);
  const [expandido, setExpandido] = React.useState(false);
  // Só farejamos depois que a pessoa confirma QUEM é.
  const [escolhido, setEscolhido] = React.useState<string | null>(null);
  const [recent, setRecent] = React.useState<RecentSearch[]>([]);
  const reqId = React.useRef(0);
  const [focused, setFocused] = React.useState(false);

  const termo = normalizeUsername(value);
  const escolhida = hits.find((h) => h.username === escolhido) ?? null;

  // "Active" = someone is using the field: focused, or it holds text.
  const active = focused || value.trim().length > 0;
  React.useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  React.useEffect(() => setRecent(readRecentSearches()), []);

  // A lista de contas, enquanto se digita. Meio segundo de espera: sem isso,
  // cada tecla viraria uma requisição paga.
  React.useEffect(() => {
    setEscolhido(null);
    setExpandido(false);
    if (termo.length < 3) {
      setHits([]);
      setBuscando(false);
      return;
    }
    const id = ++reqId.current;
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-profiles?q=${encodeURIComponent(termo)}`);
        if (id !== reqId.current) return; // superseded by a newer keystroke
        const data = res.ok ? await res.json() : { results: [] };
        setHits(Array.isArray(data.results) ? data.results : []);
      } catch {
        if (id === reqId.current) setHits([]);
      } finally {
        if (id === reqId.current) setBuscando(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [termo]);

  function go(username: string, meta?: Partial<RecentSearch>) {
    pushRecentSearch({
      username,
      displayName: meta?.displayName ?? null,
      avatarUrl: meta?.avatarUrl ?? null,
    });
    router.push(`/p/${encodeURIComponent(username)}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!termo) {
      setError("Digite um usuário do Instagram.");
      return;
    }
    if (!escolhida) {
      setError("Escolha o perfil antes de farejar.");
      return;
    }
    setLoading(true);
    go(escolhida.username, escolhida);
  }

  // On the pink hero the pink button would disappear, so it goes dark there.
  const buttonTone = onPink ? "bg-primary text-primary-foreground" : "bg-pink text-ink";

  const visiveis = expandido ? hits : hits.slice(0, PREVIA);

  function Linha({ h }: { h: Hit }) {
    const marcado = escolhido === h.username;
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={marcado}
        onClick={() => {
          setEscolhido((atual) => (atual === h.username ? null : h.username));
          setError(null);
        }}
        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
          marcado ? "bg-accent/5" : "hover:bg-muted/40"
        }`}
      >
        <Avatar src={h.avatarUrl} name={h.displayName ?? h.username} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold">@{h.username}</span>
            {h.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-accent" />}
            {h.isPrivate && (
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Privado
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{h.displayName || " "}</p>
        </div>
        {/* A caixinha: marca e desmarca. */}
        <span
          aria-hidden
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${
            marcado ? "border-accent bg-accent text-white" : "border-border bg-card"
          }`}
        >
          {marcado && <Check className="h-4 w-4" strokeWidth={3} />}
        </span>
      </button>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={onSubmit}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              @
            </span>
            <Input
              autoFocus={autoFocus}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              className="h-14 pl-9 pr-4 text-base"
              aria-label="@username do Instagram"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !escolhida}
            aria-label={buttonLabel}
            title={escolhida ? undefined : "Escolha o perfil primeiro"}
            className={`flex h-14 shrink-0 items-center justify-center gap-2 rounded-full px-5 font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${buttonTone}`}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            <span className="hidden sm:inline">{buttonLabel}</span>
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </form>

      {buscando && hits.length === 0 && (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {hits.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
          {/* Aberto, a lista rola dentro de si mesma, como a busca do Instagram:
              as 20 contas cabem sem empurrar o resto da página para baixo. */}
          <div
            className={
              expandido ? "max-h-80 divide-y divide-border overflow-y-auto overscroll-contain" : "divide-y divide-border"
            }
          >
            {visiveis.map((h) => (
              <Linha key={h.username} h={h} />
            ))}
          </div>

          {!expandido && hits.length > PREVIA && (
            <button
              type="button"
              onClick={() => setExpandido(true)}
              className="flex w-full items-center justify-center gap-1 border-t border-border px-4 py-2.5 text-xs font-bold text-accent transition hover:bg-muted/40"
            >
              Ver mais {hits.length - PREVIA} <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Sem resultado, dizer por que o botão não liga. */}
      {!buscando && hits.length === 0 && isValidUsername(termo) && termo.length >= 3 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Não encontramos <b className="text-foreground">@{termo}</b>. Confira o @ e tente de novo.
        </p>
      )}

      {showRecent && recent.length > 0 && (
        <div className="mt-8 text-left">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-plum/45">
            Farejados recentemente
          </h2>
          <ul className="divide-y divide-plum/10 overflow-hidden rounded-2xl border border-plum/10 bg-white">
            {recent.map((r) => (
              <li key={r.username}>
                <Link
                  href={`/p/${encodeURIComponent(r.username)}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-blush/50"
                >
                  <Avatar src={r.avatarUrl} name={r.displayName ?? r.username} size={36} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-plum">
                    @{r.username}
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
