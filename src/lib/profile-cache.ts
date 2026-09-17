/**
 * Shared 24h cache for profile lookups, so the several places that need a
 * profile's photo / name / bio / totals never charge the provider twice for the
 * same handle within a day.
 */
import { getProvider } from "@/lib/providers";
import type { ProfileData } from "@/lib/providers/types";

const cache = new Map<string, { at: number; data: ProfileData }>();
const TTL = 24 * 60 * 60 * 1000;

export interface CachedProfile {
  profile: ProfileData;
  /** When the data was actually read from the provider — shown as "última análise". */
  fetchedAt: Date;
}

/** Cached profile, fetching it (one provider request) only when stale. */
export async function getProfileCached(username: string): Promise<CachedProfile> {
  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < TTL) return { profile: hit.data, fetchedAt: new Date(hit.at) };

  const provider = getProvider();
  const data = provider.getProfileBasic
    ? await provider.getProfileBasic(username)
    : await provider.getProfile(username);
  const at = Date.now();
  cache.set(username, { at, data });
  return { profile: data, fetchedAt: new Date(at) };
}

/** The cached profile if we already have it — never triggers a request. */
export function peekProfileCached(username: string): ProfileData | null {
  const hit = cache.get(username);
  return hit && Date.now() - hit.at < TTL ? hit.data : null;
}
