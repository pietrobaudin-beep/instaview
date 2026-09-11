"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, ArrowLeft, BadgeCheck, Lock, Loader2, Sparkles, UserMinus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

interface Preview {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  followersCount: number;
}

const TEASER = ["lucas.silva", "amanda_souza", "joao.pedro", "marina.costa", "rafa.dev", "bia.santos"];

export function ProfileView({ username }: { username: string }) {
  const [state, setState] = React.useState<
    { kind: "loading" } | { kind: "ok"; data: Preview } | { kind: "error"; code: string }
  >({ kind: "loading" });

  React.useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/profile-preview?username=${encodeURIComponent(username)}`);
        if (!alive) return;
        if (res.ok) setState({ kind: "ok", data: await res.json() });
        else setState({ kind: "error", code: res.status === 404 ? "not_found" : "unavailable" });
      } catch {
        if (alive) setState({ kind: "error", code: "unavailable" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Activity className="h-4 w-4 text-accent" /> InstaView
        </div>
      </div>

      {state.kind === "loading" && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="relative">
            <div className="h-20 w-20 animate-pulse rounded-full bg-muted" />
            <Loader2 className="absolute inset-0 m-auto h-7 w-7 animate-spin text-accent" />
          </div>
          <p className="text-sm text-muted-foreground">Loading @{username}&apos;s profile…</p>
        </div>
      )}

      {state.kind === "error" && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-medium">
            {state.code === "not_found" ? `@${username} not found` : "Couldn't load this profile"}
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {state.code === "not_found"
              ? "Check the username and try again."
              : "The data provider is unavailable right now. Try again in a moment."}
          </p>
          <Link href="/">
            <Button variant="outline" size="sm">Try another @</Button>
          </Link>
        </div>
      )}

      {state.kind === "ok" && (
        <>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <Avatar
                src={state.data.avatarUrl}
                name={state.data.displayName ?? state.data.username}
                size={72}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-xl font-semibold">@{state.data.username}</h1>
                  {state.data.isVerified && <BadgeCheck className="h-5 w-5 shrink-0 text-accent" />}
                </div>
                {state.data.displayName && (
                  <p className="truncate text-sm text-muted-foreground">{state.data.displayName}</p>
                )}
                <p className="mt-1 text-sm">
                  <b>{formatNumber(state.data.followersCount)}</b>{" "}
                  <span className="text-muted-foreground">followers</span>
                  {state.data.isPrivate && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      Private
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <UserMinus className="h-4 w-4 text-accent" />
                <h2 className="font-semibold">Who unfollowed @{state.data.username}</h2>
              </div>

              <div className="relative">
                <ul className="divide-y divide-border select-none blur-[6px]" aria-hidden>
                  {TEASER.map((u, i) => (
                    <li key={u} className="flex items-center gap-3 py-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {u.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">@{u}</div>
                        <div className="text-sm text-muted-foreground">
                          {["Lucas Silva", "Amanda Souza", "João Pedro", "Marina Costa", "Rafael", "Beatriz"][i]}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-background/40 to-background/95 p-6 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Lock className="h-5 w-5" />
                  </div>
                  <p className="font-semibold">Track this account over time</p>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Create a free account to start detecting who follows and unfollows — and reveal
                    the names.
                  </p>
                  <Link href={`/signup?username=${encodeURIComponent(state.data.username)}`}>
                    <Button variant="accent" size="sm">
                      <Sparkles className="h-4 w-4" /> Create free account
                    </Button>
                  </Link>
                  <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
                    or log in
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
