/**
 * Profiles this browser has already seen the result for, so revisiting one
 * skips the loading scene and goes straight to the result.
 *
 * The window matches the server's 24h cache: within it the data is the same
 * and the ~17s scene would just be waiting; after it the profile really is
 * fetched again, so the scene plays again — honestly, as a new search.
 *
 * Local-only convenience: storage can be missing or blocked (private windows),
 * so every access is guarded and failure simply means the scene plays.
 */
const KEY = "farejo:vistos";
const WINDOW_MS = 24 * 60 * 60 * 1000;

function read(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function wasSeenRecently(username: string): boolean {
  const at = read()[username];
  return typeof at === "number" && Date.now() - at < WINDOW_MS;
}

export function markSeen(username: string): void {
  try {
    const all = read();
    all[username] = Date.now();
    // Drop anything past the window so the record stays small.
    for (const [u, at] of Object.entries(all)) {
      if (Date.now() - at >= WINDOW_MS) delete all[u];
    }
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — the scene will just play next time */
  }
}
