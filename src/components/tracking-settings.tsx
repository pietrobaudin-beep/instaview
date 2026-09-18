"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, Camera, Check, Heart, Loader2, UserMinus, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { AppHeader, SettingRow, Toggle } from "@/components/ui/app-chrome";
import { NoteBox, Panel, StatusPill } from "@/components/ui/brand";
import { SniffingDog } from "@/components/ui/dog";

import type { TrackingPrefs } from "@/lib/tracking-prefs";

const ROWS = [
  {
    key: "notifications" as const,
    icon: Bell,
    title: "Notificações",
    hint: "Receba alertas em tempo real.",
  },
  { key: "newFollowing" as const, icon: UserPlus, title: "Novos seguidos" },
  { key: "unfollowed" as const, icon: UserMinus, title: "Deixou de seguir" },
  { key: "postInteractions" as const, icon: Heart, title: "Interações em posts" },
  {
    key: "stories" as const,
    icon: Camera,
    title: "Stories (quando disponível)",
    disabled: true,
    hint: "Depende do que o perfil torna público.",
  },
];

/** The tracking screen from the references: toggles plus the yellow reminder. */
export function TrackingSettings({
  username,
  displayName,
  avatarUrl,
  initial,
  active,
}: {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  initial: TrackingPrefs;
  active: boolean;
}) {
  const router = useRouter();
  const [prefs, setPrefs] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  function set<K extends keyof TrackingPrefs>(key: K, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/tracking-prefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, prefs }),
      });
      setSaved(true);
      router.refresh();
    } catch {
      /* the button simply stays un-confirmed */
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-6">
      <AppHeader
        title="No seu Faro"
        backHref="/rastros"
        subtitle={
          active ? (
            <StatusPill tone="green">
              <span className="text-[8px]">●</span> Farejando
            </StatusPill>
          ) : null
        }
      />

      <div className="grid items-start gap-5 md:grid-cols-2">
        <div className="space-y-5">
      <Panel>
        <div className="flex items-center gap-3">
          <div className="shrink-0 rounded-full p-0.5 ring-2 ring-pink">
            <Avatar src={avatarUrl} name={displayName ?? username} size={48} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold">{username}</p>
            {displayName && (
              <p className="truncate text-xs text-muted-foreground">{displayName}</p>
            )}
          </div>
        </div>
      </Panel>

      <NoteBox className="items-center" icon={<SniffingDog className="h-12 text-ink" />}>
        <span className="hand text-lg">
          O Faro te avisa quando encontrar algo novo!
        </span>
      </NoteBox>
        </div>

        <div>
      <Panel bodyClassName="px-5 py-1">
        <ul className="divide-y divide-border">
          {ROWS.map((r) => (
            <li key={r.key}>
              <SettingRow
                icon={r.icon}
                title={r.title}
                hint={r.hint}
                right={
                  <Toggle
                    label={r.title}
                    checked={prefs[r.key]}
                    disabled={r.disabled}
                    onChange={(v) => set(r.key, v)}
                  />
                }
              />
            </li>
          ))}
        </ul>
      </Panel>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-pink px-6 py-4 text-base font-bold text-ink transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : saved ? (
          <Check className="h-5 w-5" />
        ) : null}
        {saved ? "Faro atualizado 🐶" : "Salvar"}
      </button>

        </div>
      </div>
    </main>
  );
}
