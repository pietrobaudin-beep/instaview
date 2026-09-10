"use client";

import * as React from "react";
import { Check, Loader2, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  email: string;
  name: string | null;
  plan: "FREE" | "PRO" | "AGENCY";
  profiles: number;
  createdAt: string;
}

const PLANS: Row["plan"][] = ["FREE", "PRO", "AGENCY"];

export function AdminPanel({ adminEmail }: { adminEmail: string }) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [savedId, setSavedId] = React.useState<string | null>(null);

  const load = React.useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      if (res.ok) setRows((await res.json()).users);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load("");
  }, [load]);

  // Debounced search.
  React.useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q, load]);

  async function changePlan(id: string, plan: Row["plan"]) {
    setSavingId(id);
    setSavedId(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, plan } : r)));
        setSavedId(id);
        setTimeout(() => setSavedId(null), 1500);
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <ShieldCheck className="h-5 w-5 text-accent" /> InstaView Admin
        </div>
        <span className="text-sm text-muted-foreground">{adminEmail}</span>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Users & plans</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Assign a plan to any user. Changes take effect immediately.
      </p>

      <div className="relative mt-5 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No users found.</div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((u) => (
                <li key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{u.email}</span>
                      {savedId === u.id && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <Check className="h-3 w-3" /> saved
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {u.profiles} profile{u.profiles === 1 ? "" : "s"} · joined{" "}
                      {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-border p-0.5">
                      {PLANS.map((p) => (
                        <button
                          key={p}
                          disabled={savingId === u.id}
                          onClick={() => changePlan(u.id, p)}
                          className={cn(
                            "rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                            u.plan === p
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
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
        <Badge variant="muted">FREE</Badge> shows blurred followers ·{" "}
        <Badge variant="success">PRO / AGENCY</Badge> reveals them.
      </p>
    </main>
  );
}
