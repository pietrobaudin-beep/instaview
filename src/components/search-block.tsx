"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Loader2, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { formatNumber, isValidUsername, normalizeUsername } from "@/lib/utils";
import { pushRecentSearch, readRecentSearches, type RecentSearch } from "@/lib/recent-searches";

interface Preview {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  followersCount: number;
}

/**
 * The search screen from the designs: one @ field with a pink round button,
 * a live preview of the profile being typed, and the recent searches kept on
 * this device.
 */
export function SearchBlock({ onPink = false }: { onPink?: boolean }) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [recent, setRecent] = React.useState<RecentSearch[]>([]);
  const reqId = React.useRef(0);

  React.useEffect(() => setRecent(readRecentSearches()), []);

  // Live profile preview (photo + name) while typing.
  React.useEffect(() => {
    const username = normalizeUsername(value);
    if (!isValidUsername(username)) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    const id = ++reqId.current;
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile-preview?username=${encodeURIComponent(username)}`);
        if (id !== reqId.current) return; // superseded by a newer keystroke
        setPreview(res.ok ? await res.json() : null);
      } catch {
        if (id === reqId.current) setPreview(null);
      } finally {
        if (id === reqId.current) setPreviewLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [value]);

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
    const username = normalizeUsername(value);
    if (!username) {
      setError("Digite um @username do Instagram.");
      return;
    }
    setLoading(true);
    go(username, preview ?? undefined);
  }

  // On the pink hero the pink button would disappear, so it goes dark there.
  const buttonTone = onPink
    ? "bg-primary text-primary-foreground"
    : "bg-pink text-ink";

  return (
    <div className="w-full">
      <form onSubmit={onSubmit}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              @
            </span>
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Digite um @ do Instagram..."
              className="h-14 pl-9 pr-4 text-base"
              aria-label="@username do Instagram"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            aria-label="Analisar perfil"
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition hover:opacity-90 disabled:opacity-60 ${buttonTone}`}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </form>

      {(preview || previewLoading) && (
        <button
          type="button"
          onClick={() => preview && go(preview.username, preview)}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:border-accent/50"
        >
          {preview ? (
            <Avatar
              src={preview.avatarUrl}
              name={preview.displayName ?? preview.username}
              size={48}
            />
          ) : (
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-muted" />
          )}
          <div className="min-w-0 flex-1">
            {preview ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-bold">@{preview.username}</span>
                  {preview.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-accent" />}
                  {preview.isPrivate && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Privado
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {preview.displayName || " "}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(preview.followersCount)} seguidores
                </p>
              </>
            ) : (
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            )}
          </div>
          {preview && <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground" />}
        </button>
      )}

      {recent.length > 0 && (
        <div className="mt-8 text-left">
          <h2 className="mb-2 text-sm font-bold">Buscas recentes</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {recent.map((r) => (
              <li key={r.username}>
                <Link
                  href={`/p/${encodeURIComponent(r.username)}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/50"
                >
                  <Avatar src={r.avatarUrl} name={r.displayName ?? r.username} size={36} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {r.username}
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
