"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeUsername } from "@/lib/utils";

export function TrackForm({ autoFocus = true }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const username = normalizeUsername(value);
    if (!username) {
      setError("Enter an Instagram username.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      // Not logged in → send them to sign up, carrying the handle so we can
      // track it automatically right after they create their account.
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
    <form onSubmit={onSubmit} className="w-full max-w-md">
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
  );
}
