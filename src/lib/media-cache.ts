/**
 * One shared cache for a profile's recent posts. Interactions and post-activity
 * both need the same page, so they must not fetch it twice.
 */
import { getProvider } from "@/lib/providers";
import type { MediaPost } from "@/lib/providers/types";

const cache = new Map<string, { at: number; posts: MediaPost[] }>();
const TTL = 24 * 60 * 60 * 1000;

export async function getRecentMediaCached(username: string): Promise<MediaPost[]> {
  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < TTL) return hit.posts;

  const provider = getProvider();
  if (!provider.getRecentMedia) return [];
  const posts = await provider.getRecentMedia(username);
  cache.set(username, { at: Date.now(), posts });
  return posts;
}
