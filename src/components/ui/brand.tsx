"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * The Farejo design kit: the pieces that repeat across every screen of the
 * app mockups — rounded white panels, pill chips, percentage bars, stat boxes,
 * interest tags and the yellow note box.
 *
 * Everything sizes up for desktop rather than staying phone-width, so the same
 * components carry both layouts.
 */

/** White rounded panel — the default surface for content blocks. */
export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-3xl border border-border bg-card", className)}>
      {(title || action) && (
        <header className="flex items-center gap-3 px-5 pt-5">
          {typeof title === "string" ? (
            <h2 className="min-w-0 text-base font-bold tracking-tight">{title}</h2>
          ) : (
            title
          )}
          {action && <span className="ml-auto shrink-0">{action}</span>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Pill tab selector, as used for "Visão geral / Seguidores / Seguindo". */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
            value === o.value
              ? "bg-pink text-ink"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Brand board: pink for mulheres, roxo for homens.
const BAR_TONES = {
  pink: { dot: "bg-accent", fill: "bg-pink" },
  blue: { dot: "bg-[#8B78F0]", fill: "bg-purple" },
  neutral: { dot: "bg-muted-foreground/60", fill: "bg-muted-foreground/30" },
} as const;

export type BarTone = keyof typeof BAR_TONES;

/**
 * "Mulheres ▓▓▓▓░░ 34" — a breakdown row. `percent` only drives the bar width;
 * `value` is what the person actually reads, so we show counts, not shares.
 */
export function BarRow({
  label,
  percent,
  value,
  tone = "pink",
  icon,
}: {
  label: string;
  percent: number;
  value?: number;
  tone?: BarTone;
  icon?: React.ReactNode;
}) {
  const t = BAR_TONES[tone];
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-28 shrink-0 items-center gap-2 text-sm font-medium">
        {icon ?? <span className={cn("h-2.5 w-2.5 rounded-full", t.dot)} />}
        {label}
      </span>
      <span className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full transition-all", t.fill)}
          style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
        />
      </span>
      <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums">
        {value ?? `${percent}%`}
      </span>
    </div>
  );
}

/** Number + caption box. `tone` colours the value for deltas (+12 / −8). */
export function StatBox({
  value,
  label,
  tone = "neutral",
  className,
}: {
  value: React.ReactNode;
  label: string;
  tone?: "neutral" | "positive" | "negative";
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card px-4 py-3", className)}>
      <div
        className={cn(
          "text-xl font-extrabold tabular-nums",
          tone === "positive" && "text-emerald-600",
          tone === "negative" && "text-rose-600",
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/** Interest tag, as in "Moda · Viagens · Fitness". */
export function TagPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium">
      {children}
    </span>
  );
}

/** Yellow highlight box used for tips and the "você será notificado" note. */
export function NoteBox({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-yellow bg-yellow/45 p-4 text-sm text-ink",
        className,
      )}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Avatar + @handle + real name, with an optional slot on the right. */
export function PersonRow({
  username,
  displayName,
  avatarUrl,
  right,
  size = 40,
  blurred = false,
  className,
}: {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  right?: React.ReactNode;
  size?: number;
  blurred?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 py-2.5", className)}>
      <div className={blurred ? "shrink-0 blur-[5px]" : "shrink-0"}>
        <Avatar src={avatarUrl} name={displayName ?? username} size={size} />
      </div>
      <div className="min-w-0 flex-1">
        {blurred ? (
          <div className="space-y-1.5" aria-hidden>
            <div className="h-3 w-28 max-w-full rounded bg-muted" />
            <div className="h-2.5 w-20 max-w-full rounded bg-muted/70" />
          </div>
        ) : (
          <>
            <span className="block truncate text-sm font-semibold">@{username}</span>
            {displayName && (
              <span className="block truncate text-xs text-muted-foreground">{displayName}</span>
            )}
          </>
        )}
      </div>
      {right}
    </div>
  );
}

/** Small status pill: "● Ativo", "GRÁTIS", "PRO". */
export function StatusPill({
  children,
  tone = "pink",
  className,
}: {
  children: React.ReactNode;
  tone?: "pink" | "yellow" | "green" | "dark";
  className?: string;
}) {
  const tones = {
    pink: "bg-pink text-ink",
    yellow: "bg-yellow text-ink",
    green: "bg-emerald-100 text-emerald-700 border border-emerald-300",
    dark: "bg-ink text-cream",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
