"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber, isValidUsername, normalizeUsername } from "@/lib/utils";

interface Preview {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  followersCount: number;
}

export function TrackForm({
  autoFocus = true,
  mode = "preview",
}: {
  autoFocus?: boolean;
  /** "preview" → public result page (no login). "track" → add to your account. */
  mode?: "preview" | "track";
}) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const reqId = React.useRef(0);

  // Live profile preview (photo + name) as the user types.
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
        if (id !== reqId.current) return; // a newer keystroke superseded this
        if (res.ok) {
          setPreview(await res.json());
        } else {
          setPreview(null);
        }
      } catch {
        if (id === reqId.current) setPreview(null);
      } finally {
        if (id === reqId.current) setPreviewLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [value]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const username = normalizeUsername(value);
    if (!username) {
      setError("Enter an Instagram username.");
      return;
    }
    setLoading(true);

    // Public preview flow: no login needed — go straight to the result page.
    if (mode === "preview") {
      router.push(`/p/${encodeURIComponent(username)}`);
      return;
    }

    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (res.status === 401) {
        router.push(`/signup?username=${encodeURIComponent(username)}`);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push(`/dashboard/${data.id}`);
    } catch {
      setError("Network error. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={onSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              @
            </span>
            <Input
              autoFocus={autoFocus}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="username"
              className="h-12 pl-7 text-base"
              aria-label="Instagram username"
              disabled={loading}
            />
          </div>
          <Button type="submit" size="lg" variant="accent" disabled={loading} className="h-12">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Track
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </form>

      {(preview || previewLoading) && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left animate-fade-in">
          {preview ? (
            <Avatar src={preview.avatarUrl} name={preview.displayName ?? preview.username} size={48} />
          ) : (
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-muted" />
          )}
          <div className="min-w-0 flex-1">
            {preview ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-semibold">@{preview.username}</span>
                  {preview.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-accent" />}
                  {preview.isPrivate && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Private
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {preview.displayName || " "}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(preview.followersCount)} followers
                </p>
              </>
            ) : (
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
