"use client";

import * as React from "react";
import { BadgeCheck, Clock, Globe, Lock, UserPlus, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/utils";

export interface HeaderProfile {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  analyzedAt?: string | null;
}

function when(iso?: string | null) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return {
      relative: formatDistanceToNow(d, { addSuffix: true, locale: ptBR }),
      exact: d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
    };
  } catch {
    return null;
  }
}

function Stat({
  value,
  label,
  icon: Icon,
  tint,
  hint,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
  tint: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4" title={hint}>
      <div className="flex items-start justify-between">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tint}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Top of the analysis page: identity + the headline numbers, plus when the
 * reading was taken. Gender counts are an automatic estimate, and we say so.
 */
export function ProfileHeader({
  profile,
  counts,
  premium,
  note,
  actions,
  wide = true,
}: {
  profile: HeaderProfile;
  counts?: { girls: number; boys: number };
  premium?: boolean;
  /** False on the narrow free page, where four cards in a row would not fit. */
  wide?: boolean;
  note?: string | null;
  actions?: React.ReactNode;
}) {
  const t = when(profile.analyzedAt);

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {premium && <div className="h-1.5 w-full bg-gradient-to-r from-[hsl(var(--pink))] via-accent to-[hsl(var(--maroon))]" />}
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          {/* Pink ring around the photo, as in the brand screens. */}
          <div className="shrink-0 rounded-full p-1 ring-2 ring-accent">
            <Avatar
              src={profile.avatarUrl}
              name={profile.displayName ?? profile.username}
              size={88}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-extrabold tracking-tight">@{profile.username}</h1>
              {profile.isVerified && <BadgeCheck className="h-5 w-5 shrink-0 text-accent" />}
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  profile.isPrivate
                    ? "border-amber-500/50 bg-amber-100 text-amber-800"
                    : "border-emerald-500/50 bg-emerald-100 text-emerald-800"
                }`}
              >
                {profile.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                {profile.isPrivate ? "Perfil privado" : "Perfil público"}
              </span>
              {premium && (
                <span className="rounded-full bg-[#FFD84D] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--maroon))]">
                  PRO
                </span>
              )}
            </div>
            {profile.displayName && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{profile.displayName}</p>
            )}
            {profile.bio && (
              <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-foreground/80">
                {profile.bio}
              </p>
            )}
            {t && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Última análise {t.relative} · {t.exact}
              </p>
            )}
            {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
          </div>
          {actions && <div className="shrink-0 sm:self-center">{actions}</div>}
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${wide ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
        <Stat
          value={formatNumber(profile.followersCount)}
          label="Seguidores"
          icon={Users}
          tint="bg-accent/15 text-accent"
        />
        <Stat
          value={formatNumber(profile.followingCount)}
          label="Seguindo"
          icon={UserPlus}
          tint="bg-accent/15 text-accent"
        />
        <Stat
          value={String(counts?.girls ?? 0)}
          label="Mulheres no seguindo"
          icon={Users}
          tint="bg-pink-200 text-pink-700"
          hint="Estimativa automática pelo nome — pode conter erros."
        />
        <Stat
          value={String(counts?.boys ?? 0)}
          label="Homens no seguindo"
          icon={Users}
          tint="bg-blue-200 text-blue-700"
          hint="Estimativa automática pelo nome — pode conter erros."
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Mulheres e homens são uma classificação automática pelo nome e pode conter erros.
      </p>
    </div>
  );
}
