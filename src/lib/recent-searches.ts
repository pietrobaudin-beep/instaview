/**
 * "Buscas recentes" — the handles typed on this device, kept in localStorage.
 *
 * Deliberately local-only: it is a convenience for the person using the
 * browser, never sent anywhere, and the page must render fine when storage is
 * unavailable (private windows, blocked site data), so every access is guarded.
 */
const KEY = "farejo:recent-searches";
const MAX = 8;

export interface RecentSearch {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  at: number;
}

export function readRecentSearches(): RecentSearch[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((r) => typeof r?.username === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(entry: Omit<RecentSearch, "at">): void {
  try {
    const list = readRecentSearches().filter((r) => r.username !== entry.username);
    list.unshift({ ...entry, at: Date.now() });
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage unavailable — the feature is optional */
  }
}

/** Tira um @ da lista deste aparelho. */
export function removeRecentSearch(username: string): void {
  try {
    const list = readRecentSearches().filter((r) => r.username !== username);
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — the feature is optional */
  }
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
