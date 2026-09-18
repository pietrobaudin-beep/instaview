"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Screen header from the reference screens: back arrow on the left, the title
 * centred, an optional action on the right. Every inner screen uses it, which
 * is what makes the app feel like one product.
 */
export function AppHeader({
  title,
  back = true,
  backHref,
  right,
  subtitle,
  className,
}: {
  title?: React.ReactNode;
  back?: boolean;
  /** Defaults to browser history when omitted. */
  backHref?: string;
  right?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <header className={cn("mb-6", className)}>
      <div className="flex h-10 items-center gap-2">
        <div className="flex w-10 shrink-0 items-center">
          {back &&
            (backHref ? (
              <Link
                href={backHref}
                aria-label="Voltar"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-muted"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Voltar"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-muted"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ))}
        </div>
        <h1 className="min-w-0 flex-1 truncate text-center text-base font-bold">{title}</h1>
        <div className="flex w-10 shrink-0 items-center justify-end">{right}</div>
      </div>
      {subtitle && <div className="mt-2 flex justify-center">{subtitle}</div>}
    </header>
  );
}

/** Pink switch from the tracking screen. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40",
        checked ? "bg-accent" : "bg-muted-foreground/30",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
          checked ? "left-6" : "left-1",
        )}
      />
    </button>
  );
}

/** Row with an icon, a title, an optional hint and something on the right. */
export function SettingRow({
  icon: Icon,
  title,
  hint,
  right,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {hint && <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

/** The three-up counter row under a profile photo (publicações / seguidores / seguindo). */
export function StatTrio({
  items,
}: {
  items: { value: string; label: string; tone?: "neutral" | "positive" | "negative" }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((s) => (
        <div key={s.label} className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
          <div
            className={cn(
              "text-lg font-bold tabular-nums",
              s.tone === "positive" && "text-emerald-600",
              s.tone === "negative" && "text-rose-600",
            )}
          >
            {s.value}
          </div>
          <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
