"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import {
  clearRecentSearches,
  pushRecentSearch,
  readRecentSearches,
  removeRecentSearch,
  type RecentSearch,
} from "@/lib/recent-searches";

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
  // Falha de conexão é diferente de "não existe esse @": uma pede tentar de
  // novo, a outra pede conferir o que foi digitado.
  const [falhou, setFalhou] = React.useState(false);
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
    setFalhou(false);
    const t = setTimeout(() => buscar(id), 500);
    return () => clearTimeout(t);
  }, [termo]);

  async function buscar(id: number) {
    try {
      const res = await fetch(`/api/search-profiles?q=${encodeURIComponent(termo)}`);
      if (id !== reqId.current) return; // superseded by a newer keystroke
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setHits(Array.isArray(data.results) ? data.results : []);
      setFalhou(false);
    } catch {
      if (id !== reqId.current) return;
      setHits([]);
      setFalhou(true);
    } finally {
      if (id === reqId.current) setBuscando(false);
    }
  }

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
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-xl border-2 transition ${
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
        {/* No celular o botão vai para baixo: com o @ escolhido, "Analisar
            @fulano" não cabe ao lado do campo sem espremer o que se digita. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:flex-1">
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
            className={`flex h-[52px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl px-5 font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:w-auto ${buttonTone}`}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            {/* O @ escolhido já está marcado na lista logo abaixo; repeti-lo
                no botão só fazia o rótulo crescer. */}
            <span>{escolhida ? "Analisar" : buttonLabel}</span>
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {!error && termo.length > 0 && termo.length < 3 && (
          <p className="mt-2 text-xs text-muted-foreground">Digite pelo menos 3 caracteres.</p>
        )}
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
        <>
          <p className="mt-4 text-sm font-semibold">
            {escolhida ? "Escolha o perfil para continuar." : "Qual destes perfis você quer analisar?"}
          </p>
          <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card">
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
                className="flex min-h-[44px] w-full items-center justify-center gap-1 border-t border-border px-4 text-sm font-bold text-accent transition hover:bg-muted/40"
              >
                Ver mais {hits.length - PREVIA} <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* O limite real do perfil privado, dito antes de gastar a análise. */}
          {escolhida?.isPrivate && (
            <p className="mt-2 rounded-2xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              <b>@{escolhida.username} é um perfil privado.</b> O Instagram só mostra quem uma conta
              privada segue para os seguidores aprovados dela — dá para ver foto, nome, bio e a data
              de criação, mas não as conexões.
            </p>
          )}
        </>
      )}

      {/* Sem resultado é uma coisa; sem conexão é outra. */}
      {!buscando && falhou && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Não foi possível buscar agora.</p>
          <button
            type="button"
            onClick={() => {
              setBuscando(true);
              buscar(++reqId.current);
            }}
            className="text-sm font-bold text-accent hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {!buscando && !falhou && hits.length === 0 && isValidUsername(termo) && termo.length >= 3 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Não encontramos esse perfil. Confira o @.
        </p>
      )}

      {showRecent && recent.length > 0 && (
        <div className="mt-8 text-left">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-plum/45">
              Recentes neste aparelho
            </h2>
            <button
              type="button"
              onClick={() => {
                clearRecentSearches();
                setRecent([]);
              }}
              className="text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Limpar
            </button>
          </div>
          <ul className="divide-y divide-plum/10 overflow-hidden rounded-2xl border border-plum/10 bg-white">
            {recent.map((r) => (
              <li key={r.username} className="relative">
                <Link
                  href={`/p/${encodeURIComponent(r.username)}`}
                  className="flex items-center gap-3 py-3 pl-4 pr-11 transition hover:bg-blush/50"
                >
                  <Avatar src={r.avatarUrl} name={r.displayName ?? r.username} size={36} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-plum">
                    @{r.username}
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
                {/* Esta lista é só deste aparelho (fica no navegador), então
                    apagar aqui não mexe em consulta nenhuma. */}
                <button
                  type="button"
                  onClick={() => {
                    removeRecentSearch(r.username);
                    setRecent((atual) => atual.filter((x) => x.username !== r.username));
                  }}
                  aria-label={`Tirar @${r.username} dos recentes`}
                  title="Tirar da lista"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-blush hover:text-plum"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          {/* Esta lista fica no navegador, não na conta: em outro aparelho ela
              não existe, e não é o histórico de consultas do plano. */}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Fica só neste navegador. O histórico da sua conta está em Pesquisados.
          </p>
        </div>
      )}
    </div>
  );
}
