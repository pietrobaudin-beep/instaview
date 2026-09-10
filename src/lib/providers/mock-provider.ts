/**
 * MockProvider — a fully deterministic, offline data source.
 *
 * It models an Instagram profile whose follower list grows over time so that
 * repeated collections genuinely detect NEW followers via the same snapshot
 * diffing the real providers exercise. No network, no account, no cost.
 *
 * Model:
 *   - Followers are indexed 0..N-1, oldest first.
 *   - The profile gains `growthPerHour` followers steadily since a fixed epoch,
 *     so `total(now)` increases with wall-clock time.
 *   - getFollowers returns the HEAD of the list (most-recent-first), matching
 *     how the real "read the top of the list" technique works.
 */
import {
  FollowerEntry,
  GetFollowersOptions,
  GetFollowersResult,
  InstagramDataProvider,
  ProfileData,
} from "./types";

const EPOCH = Date.UTC(2024, 0, 1); // fixed reference point
const HOUR = 3600_000;

function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ADJ = ["sunny", "urban", "wild", "cosmic", "silent", "golden", "neon", "swift", "lunar", "brave", "amber", "coral", "misty", "royal", "pixel"];
const NOUN = ["fox", "wave", "studio", "muse", "pixel", "atlas", "harbor", "ember", "vibe", "orbit", "forge", "north", "delta", "koda", "nova"];
const FIRST = ["Lucas", "Amanda", "João", "Marina", "Pedro", "Sofia", "Rafael", "Beatriz", "Diego", "Camila", "Bruno", "Isabela", "Thiago", "Laura", "Gabriel", "Alice"];
const LAST = ["Silva", "Souza", "Oliveira", "Santos", "Costa", "Pereira", "Almeida", "Ferreira", "Rocha", "Lima", "Carvalho", "Gomes"];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Stable identity for a global follower index of a given profile. */
function makeFollower(profile: string, index: number): FollowerEntry {
  const rng = mulberry32(hashSeed(`${profile}:${index}`));
  const username = `${pick(rng, ADJ)}.${pick(rng, NOUN)}${Math.floor(rng() * 900 + 100)}`;
  const displayName = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
  const isVerified = rng() < 0.03;
  return {
    username,
    displayName,
    avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(username)}`,
    isVerified,
  };
}

interface ProfileModel {
  baseFollowers: number;
  growthPerHour: number;
  following: number;
  posts: number;
  verified: boolean;
}

function modelFor(username: string): ProfileModel {
  const rng = mulberry32(hashSeed(username));
  return {
    baseFollowers: Math.floor(rng() * 4000) + 200,
    growthPerHour: Math.floor(rng() * 5) + 2, // 2–6 new followers/hour
    following: Math.floor(rng() * 900) + 50,
    posts: Math.floor(rng() * 800) + 5,
    verified: rng() < 0.15,
  };
}

function totalFollowers(model: ProfileModel, now: number): number {
  const elapsedHours = Math.max(0, (now - EPOCH) / HOUR);
  return model.baseFollowers + Math.floor(elapsedHours * model.growthPerHour);
}

export class MockProvider implements InstagramDataProvider {
  readonly name = "mock";
  readonly supportsFollowerList = true;

  constructor(private now: () => number = Date.now) {}

  async getProfile(username: string): Promise<ProfileData> {
    const model = modelFor(username);
    const total = totalFollowers(model, this.now());
    return {
      username,
      displayName: username
        .split(/[._]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" "),
      avatarUrl: `https://i.pravatar.cc/300?u=${encodeURIComponent(username)}`,
      bio: `Demo profile • ${model.posts} posts • simulated by MockProvider`,
      isPrivate: false,
      isVerified: model.verified,
      followersCount: total,
      followingCount: model.following,
      postsCount: model.posts,
    };
  }

  async getFollowers(username: string, opts: GetFollowersOptions = {}): Promise<GetFollowersResult> {
    const model = modelFor(username);
    const total = totalFollowers(model, this.now());
    const pageSize = opts.pageSize ?? 50;
    const maxPages = opts.maxPages ?? 5;
    const want = Math.min(total, pageSize * maxPages);

    // Most-recent-first: highest indices are the newest followers.
    const followers: FollowerEntry[] = [];
    for (let i = 0; i < want; i++) {
      const globalIndex = total - 1 - i;
      if (globalIndex < 0) break;
      followers.push(makeFollower(username, globalIndex));
    }

    return {
      followers,
      mode: want >= total ? "full" : "head",
      truncated: want < total,
    };
  }

  async getFollowing(username: string, opts: GetFollowersOptions = {}): Promise<GetFollowersResult> {
    const model = modelFor(username);
    const pageSize = opts.pageSize ?? 50;
    const maxPages = opts.maxPages ?? 5;
    const want = Math.min(model.following, pageSize * maxPages);
    const followers: FollowerEntry[] = [];
    for (let i = 0; i < want; i++) {
      followers.push(makeFollower(`${username}#following`, i));
    }
    return { followers, mode: want >= model.following ? "full" : "head", truncated: want < model.following };
  }
}
