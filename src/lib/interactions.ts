/**
 * "Com quem mais interage" — ranked from REAL signals in the profile's recent
 * posts: accounts tagged in the photo, credited co-authors, and @mentions in
 * captions. It's a proxy for interaction (the public signals Instagram exposes),
 * not a private DM/like graph — the UI says so.
 */
import { guessGender } from "@/lib/gender";
import type { MediaPost } from "@/lib/providers/types";

export interface Interaction {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  /** How many recent posts referenced this account. */
  count: number;
  gender: "f" | "m" | "u";
}

const MENTION = /@([A-Za-z0-9._]{2,30})/g;
// Tagged/co-author carries more signal than a passing caption mention.
const TAG_WEIGHT = 2;
const MENTION_WEIGHT = 1;

export function rankInteractions(posts: MediaPost[], self: string, limit = 5): Interaction[] {
  const me = self.toLowerCase();
  const byUser = new Map<string, Interaction>();

  const bump = (
    username: string,
    weight: number,
    meta?: { displayName?: string | null; avatarUrl?: string | null; isVerified?: boolean },
  ) => {
    const key = username.toLowerCase().replace(/\.$/, "");
    if (!key || key === me) return;
    const existing = byUser.get(key);
    if (existing) {
      existing.count += weight;
      existing.displayName ??= meta?.displayName ?? null;
      existing.avatarUrl ??= meta?.avatarUrl ?? null;
      if (meta?.isVerified) existing.isVerified = true;
      return;
    }
    byUser.set(key, {
      username: key,
      displayName: meta?.displayName ?? null,
      avatarUrl: meta?.avatarUrl ?? null,
      isVerified: Boolean(meta?.isVerified),
      count: weight,
      gender: "u",
    });
  };

  for (const post of posts) {
    for (const t of post.tagged) {
      bump(t.username, TAG_WEIGHT, {
        displayName: t.displayName,
        avatarUrl: t.avatarUrl,
        isVerified: t.isVerified,
      });
    }
    for (const m of (post.caption ?? "").matchAll(MENTION)) {
      bump(m[1], MENTION_WEIGHT);
    }
  }

  return [...byUser.values()]
    .map((i) => ({ ...i, gender: guessGender(i.displayName, i.username) }))
    .sort((a, b) => b.count - a.count || a.username.localeCompare(b.username))
    .slice(0, limit);
}
