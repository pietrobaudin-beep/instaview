"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil } from "lucide-react";

/** The account name, editable in place. Empty is fine — it's optional. */
export function NameEditor({ initial }: { initial: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(initial ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não deu para salvar.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex max-w-full items-center gap-2 text-left"
        title="Editar nome"
      >
        <span className="truncate text-lg font-bold">{initial || "Como quer ser chamado?"}</span>
        <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
      </button>
    );
  }

  return (
    <form onSubmit={save} className="flex items-center gap-2">
      <input
        autoFocus
        value={value}
        maxLength={40}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Seu nome ou apelido"
        className="h-9 min-w-0 flex-1 rounded-full border border-border bg-background px-3 text-base font-semibold outline-none focus:border-accent"
        aria-label="Seu nome"
      />
      <button
        type="submit"
        disabled={saving}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink text-ink"
        aria-label="Salvar nome"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}
