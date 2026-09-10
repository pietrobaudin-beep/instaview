import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalize a user-typed handle: strip @, URL parts, whitespace, lowercase. */
export function normalizeUsername(raw: string): string {
  let u = raw.trim().toLowerCase();
  // Accept full profile URLs.
  const urlMatch = u.match(/instagram\.com\/([^/?#]+)/);
  if (urlMatch) u = urlMatch[1];
  u = u.replace(/^@+/, "").replace(/\/+$/, "");
  return u;
}

/** Instagram usernames: letters, numbers, periods, underscores; 1–30 chars. */
export function isValidUsername(u: string): boolean {
  return /^[a-z0-9._]{1,30}$/.test(u);
}

export function initials(name: string): string {
  const parts = name.replace(/^@/, "").split(/[\s._]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: n >= 10000 ? "compact" : "standard" }).format(n);
}
