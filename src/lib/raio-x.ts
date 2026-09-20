/**
 * Raio-X: the rest of a public profile — stories, posts, reels, where it's
 * tagged, highlights, reposts, similar accounts and "about".
 *
 * - Each section is fetched only when someone opens it, then kept in a shared
 *   cache (SectionCache) for everyone: stories for 3h (they change fast), the
 *   rest for 24h. The same data is never paid for twice inside that window.
 * - Free visitors get a preview: real counts and (blurred) images, but every
 *   name is masked and captions are dropped — on the server, so nothing leaks.
 * - Everything here is public data, read through the provider layer. Sections
 *   a provider can't serve come back as `unsupported` (provider-dependent).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { cacheSectionKey } from "@/lib/sandbox";
import {
  ProviderError,
  type AboutInfo,
  type FollowerEntry,
  type HighlightItem,
  type PostItem,
  type StoryItem,
} from "@/lib/providers/types";

export const SECTIONS = ["stories", "posts", "reels", "tagged", "highlights", "reposts", "suggested", "about"] as const;
export type Section = (typeof SECTIONS)[number];

const TTL_MS: Record<Section, number> = {
  stories: 3 * 60 * 60 * 1000,
  posts: 24 * 60 * 60 * 1000,
  reels: 24 * 60 * 60 * 1000,
  tagged: 24 * 60 * 60 * 1000,
  highlights: 24 * 60 * 60 * 1000,
  reposts: 24 * 60 * 60 * 1000,
  suggested: 24 * 60 * 60 * 1000,
  about: 7 * 24 * 60 * 60 * 1000, // barely ever changes
};

export interface Ranked {
  user: FollowerEntry;
  count: number;
}

export type SectionData =
  | { section: "stories"; items: StoryItem[] }
  | { section: "posts"; pinned: PostItem[]; items: PostItem[]; people: Ranked[] }
  | { section: "reels"; items: PostItem[] }
  | { section: "tagged"; items: PostItem[]; people: Ranked[] }
  | { section: "highlights"; items: HighlightItem[] }
  | { section: "reposts"; items: PostItem[] }
  | { section: "suggested"; users: FollowerEntry[] }
  | { section: "about"; about: AboutInfo };

export type SectionResult =
  | { status: "ok"; data: SectionData; fetchedAt: string }
  | { status: "private" }
  | { status: "unsupported" }
  | { status: "error" };

/** How often each account shows up across a list of posts. */
function rank(users: FollowerEntry[], exclude: string): Ranked[] {
  const by = new Map<string, Ranked>();
  for (const u of users) {
    if (!u?.username || u.username === exclude) continue;
    const r = by.get(u.username) ?? { user: u, count: 0 };
    r.count++;
    by.set(u.username, r);
  }
  return [...by.values()].sort((a, b) => b.count - a.count).slice(0, 12);
}

async function fetchSection(username: string, section: Section): Promise<SectionData | "unsupported"> {
  const p = getProvider();
  switch (section) {
    case "stories":
      return p.getStories ? { section, items: await p.getStories(username) } : "unsupported";
    case "posts": {
      if (!p.getPosts) return "unsupported";
      const [items, pinned] = await Promise.all([
        p.getPosts(username),
        p.getPinned ? p.getPinned(username).catch(() => []) : Promise.resolve([] as PostItem[]),
      ]);
      const pinnedIds = new Set(pinned.map((x) => x.id));
      const rest = items.filter((x) => !pinnedIds.has(x.id));
      return { section, pinned, items: rest, people: rank([...pinned, ...rest].flatMap((x) => x.tagged), username) };
    }
    case "reels":
      return p.getReels ? { section, items: await p.getReels(username) } : "unsupported";
    case "tagged": {
      if (!p.getTaggedIn) return "unsupported";
      const items = await p.getTaggedIn(username);
      return { section, items, people: rank(items.map((x) => x.owner).filter(Boolean) as FollowerEntry[], username) };
    }
    case "highlights":
      return p.getHighlights ? { section, items: await p.getHighlights(username) } : "unsupported";
    case "reposts":
      return p.getReposts ? { section, items: await p.getReposts(username) } : "unsupported";
    case "suggested":
      return p.getSuggested ? { section, users: (await p.getSuggested(username)).filter((u) => !u.isVerified) } : "unsupported";
    case "about":
      return p.getAbout ? { section, about: await p.getAbout(username) } : "unsupported";
  }
}

/**
 * The section, from the shared cache when it's still fresh. `maxAgeMs` lets the
 * daily Faro ask for something newer than the usual window, so a copy cached
 * yesterday at the same hour doesn't hide today's posts.
 */
export async function getSection(username: string, section: Section, maxAgeMs = TTL_MS[section]): Promise<SectionResult> {
  const key = cacheSectionKey(section);
  const cached = await prisma.sectionCache.findUnique({ where: { username_section: { username, section: key } } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < Math.min(maxAgeMs, TTL_MS[section])) {
    return { status: "ok", data: cached.data as unknown as SectionData, fetchedAt: cached.fetchedAt.toISOString() };
  }
  try {
    const data = await fetchSection(username, section);
    if (data === "unsupported") return { status: "unsupported" };
    const json = data as unknown as Prisma.InputJsonValue;
    const row = await prisma.sectionCache.upsert({
      where: { username_section: { username, section: key } },
      create: { username, section: key, data: json },
      update: { data: json, fetchedAt: new Date() },
    });
    return { status: "ok", data, fetchedAt: row.fetchedAt.toISOString() };
  } catch (e) {
    if (e instanceof ProviderError && e.code === "PRIVATE") return { status: "private" };
    // A stale copy beats nothing when the provider hiccups.
    if (cached) {
      return { status: "ok", data: cached.data as unknown as SectionData, fetchedAt: cached.fetchedAt.toISOString() };
    }
    return { status: "error" };
  }
}

// ——— Free preview: same shape, no identities ———

const maskName = (s: string) => s.slice(0, 2) + "•".repeat(Math.max(3, Math.min(9, s.length - 2)));

function maskUser(u: FollowerEntry | null): FollowerEntry | null {
  return u ? { username: maskName(u.username), displayName: null, avatarUrl: u.avatarUrl, isVerified: u.isVerified } : null;
}

const maskPost = (x: PostItem): PostItem => ({
  ...x,
  code: null,
  caption: null,
  owner: maskUser(x.owner),
  tagged: x.tagged.map((u) => maskUser(u)!),
});

const maskRanked = (r: Ranked): Ranked => ({ user: maskUser(r.user)!, count: r.count });

export function previewOf(data: SectionData): SectionData {
  switch (data.section) {
    case "stories":
      return { ...data, items: data.items.map((s) => ({ ...s, mentions: s.mentions.map((u) => maskUser(u)!) })) };
    case "posts":
      return { ...data, pinned: data.pinned.map(maskPost), items: data.items.map(maskPost), people: data.people.map(maskRanked) };
    case "tagged":
      return { ...data, items: data.items.map(maskPost), people: data.people.map(maskRanked) };
    case "reels":
    case "reposts":
      return { ...data, items: data.items.map(maskPost) };
    case "highlights":
      return { ...data, items: data.items.map((h) => ({ ...h, title: "•••" })) };
    case "suggested":
      return { ...data, users: data.users.map((u) => maskUser(u)!) };
    case "about":
      return {
        ...data,
        about: { joined: data.about.joined ? "••••" : null, country: data.about.country, formerUsernames: data.about.formerUsernames },
      };
  }
}
