/**
 * One shared cache for a profile's recent posts. Interactions and post-activity
 * both need the same page, so they must not fetch it twice.
 *
 * Kept in the database for the same reason as the profile cache: on Vercel each
 * route is its own instance, so an in-memory copy is missed far more often than
 * it is hit — and every miss is a paid request.
 */
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import type { MediaPost } from "@/lib/providers/types";
import { cacheSectionKey } from "@/lib/sandbox";

const TTL = 24 * 60 * 60 * 1000;
const KEY = () => cacheSectionKey("recent-media");

const memory = new Map<string, { at: number; posts: MediaPost[] }>();

export async function getRecentMediaCached(username: string): Promise<MediaPost[]> {
  const local = memory.get(username);
  if (local && Date.now() - local.at < TTL) return local.posts;

  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username, section: KEY() } } })
    .catch(() => null);
  if (row && Date.now() - row.fetchedAt.getTime() < TTL) {
    const posts = row.data as unknown as MediaPost[];
    memory.set(username, { at: row.fetchedAt.getTime(), posts });
    return posts;
  }

  const provider = getProvider();
  if (!provider.getRecentMedia) return [];
  const posts = await provider.getRecentMedia(username);
  const data = posts as unknown as Parameters<typeof prisma.sectionCache.create>[0]["data"]["data"];
  const saved = await prisma.sectionCache
    .upsert({
      where: { username_section: { username, section: KEY() } },
      create: { username, section: KEY(), data },
      update: { data, fetchedAt: new Date() },
    })
    .catch(() => null);
  memory.set(username, { at: (saved?.fetchedAt ?? new Date()).getTime(), posts });
  return posts;
}
