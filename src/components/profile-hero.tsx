"use client";

import * as React from "react";
import { BadgeCheck, Bookmark, BookmarkCheck, Globe, Loader2, Lock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/brand";
import { formatNumber } from "@/lib/utils";

export interface HeroProfile {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  postsCount?: number;
  analyzedAt?: string | null;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-extrabold tabular-nums sm:text-2xl">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * Profile card at the top of an analysis: photo in the pink ring, the three
 * Instagram counters, and the button that starts tracking the profile.
 *
 * Centred on a phone like the app screens; on desktop it lays out sideways so
 * the width is not wasted.
 */
export function ProfileHero({
  profile,
  premium,
  note,
  tracking,
  onTrack,
}: {
  profile: HeroProfile;
  premium?: boolean;
  note?: string | null;
  tracking?: { saved: boolean; busy: boolean };
  onTrack?: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      {premium && (
        <div className="h-1.5 w-full bg-gradient-to-r from-pink via-accent to-purple" />
      )}
      <div className="flex flex-col items-center gap-5 p-6 text-center md:flex-row md:items-start md:gap-7 md:text-left">
        <div className="shrink-0 rounded-full p-1 ring-[3px] ring-pink">
          <Avatar
            src={profile.avatarUrl}
            name={profile.displayName ?? profile.username}
            size={104}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">
              {profile.username}
            </h1>
            {profile.isVerified && <BadgeCheck className="h-5 w-5 shrink-0 text-[#3897F0]" />}
            <StatusPill tone={premium ? "yellow" : "pink"}>{premium ? "PRO" : "GRÁTIS"}</StatusPill>
          </div>

          {profile.displayName && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{profile.displayName}</p>
          )}

          <div className="mt-4 flex items-center justify-center gap-8 md:justify-start">
            {typeof profile.postsCount === "number" && profile.postsCount > 0 && (
              <Stat value={formatNumber(profile.postsCount)} label="publicações" />
            )}
            <Stat value={formatNumber(profile.followersCount)} label="seguidores" />
            <Stat value={formatNumber(profile.followingCount)} label="seguindo" />
          </div>

          {profile.bio && (
            <p className="mt-4 whitespace-pre-line text-sm text-foreground/80">{profile.bio}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                profile.isPrivate
                  ? "border-amber-500/50 bg-amber-100 text-amber-800"
                  : "border-emerald-500/50 bg-emerald-100 text-emerald-800"
              }`}
            >
              {profile.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              {profile.isPrivate ? "Perfil privado" : "Perfil público"}
            </span>
          </div>
          {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
        </div>

        {onTrack && (
          <div className="w-full shrink-0 md:w-auto md:self-center">
            <button
              type="button"
              onClick={onTrack}
              disabled={tracking?.busy || tracking?.saved}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition md:w-auto ${
                tracking?.saved
                  ? "bg-muted text-muted-foreground"
                  : "bg-pink text-ink hover:opacity-90"
              }`}
            >
              {tracking?.busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : tracking?.saved ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              {tracking?.saved ? "Rastreando" : "Começar a rastrear"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
