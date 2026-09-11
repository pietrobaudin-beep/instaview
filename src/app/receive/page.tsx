"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, CheckCircle2, Loader2, XCircle } from "lucide-react";

type Status =
  | { kind: "waiting" }
  | { kind: "saving" }
  | { kind: "done"; profileId: string; followers: number; newFollowers: number; unfollowers: number; baseline: boolean }
  | { kind: "error"; message: string };

function isInstagramOrigin(origin: string): boolean {
  try {
    const h = new URL(origin).hostname;
    return h === "instagram.com" || h.endsWith(".instagram.com");
  } catch {
    return false;
  }
}

export default function ReceivePage() {
  const [status, setStatus] = React.useState<Status>({ kind: "waiting" });

  React.useEffect(() => {
    let handled = false;

    async function onMessage(e: MessageEvent) {
      if (handled) return;
      // Only accept the follower payload from the instagram.com bridge.
      if (!isInstagramOrigin(e.origin)) return;
      const data = e.data;
      if (!data || data.type !== "instaview:data" || !data.payload) return;

      handled = true;
      setStatus({ kind: "saving" });
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data.payload),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Sync failed");
        setStatus({ kind: "done", ...body });
      } catch (err) {
        setStatus({ kind: "error", message: (err as Error).message });
      } finally {
        try {
          (e.source as Window)?.postMessage({ type: "instaview:done" }, e.origin);
        } catch {
          /* ignore */
        }
      }
    }

    window.addEventListener("message", onMessage);
    // Tell the opener (the bookmarklet on instagram.com) we're ready to receive.
    try {
      window.opener?.postMessage("instaview:ready", "*");
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex items-center gap-2 font-semibold">
        <Activity className="h-5 w-5 text-accent" /> InstaView
      </div>

      {status.kind === "waiting" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Waiting for Instagram data… If nothing happens, go back to the Instagram tab and click
            the <b>Sync InstaView</b> bookmark again.
          </p>
        </>
      )}

      {status.kind === "saving" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm">Saving your snapshot…</p>
        </>
      )}

      {status.kind === "done" && (
        <>
          <CheckCircle2 className="h-10 w-10 text-success" />
          <h1 className="text-lg font-semibold">Synced!</h1>
          <p className="text-sm text-muted-foreground">
            {status.followers.toLocaleString()} followers captured.
            {status.baseline ? (
              <> This is your baseline — sync again later to see who unfollowed you.</>
            ) : (
              <>
                {" "}
                <b>{status.unfollowers}</b> unfollowed you and <b>{status.newFollowers}</b> new
                followers since last sync.
              </>
            )}
          </p>
          <Link
            href={`/dashboard/${status.profileId}`}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            Open my dashboard
          </Link>
          <p className="text-xs text-muted-foreground">You can close this window.</p>
        </>
      )}

      {status.kind === "error" && (
        <>
          <XCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-destructive">{status.message}</p>
          <p className="text-xs text-muted-foreground">
            Make sure you&apos;re logged in to InstaView in this browser, then try the bookmark
            again.
          </p>
        </>
      )}
    </main>
  );
}
