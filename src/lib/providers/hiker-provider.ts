/**
 * HikerApiProvider — real third-party adapter (provider-dependent).
 *
 * HikerAPI (https://hikerapi.com) is a paid API that exposes real Instagram
 * data, including follower lists. Using it means you (the operator) accept
 * HikerAPI's terms and the Instagram ToS risk that comes with scraped data.
 *
 * Verified against HikerAPI docs (hiker-doc.readthedocs.io):
 *   - Auth: header `x-access-key: <API_KEY>`
 *   - Profile:  GET /v1/user/by/username?username=<u>
 *               -> { pk, username, full_name, follower_count, following_count,
 *                    media_count, profile_pic_url, is_verified, is_private }
 *   - Followers: GET /v1/user/followers/chunk?user_id=<pk>&max_id=<cursor>
 *               -> { users: [{ username, full_name, pk, profile_pic_url,
 *                    is_verified }], next_max_id }
 *   - Following: GET /v1/user/following/chunk?user_id=<pk>&max_id=<cursor>
 *
 * The followers endpoint needs the numeric user_id, so we resolve it from the
 * username first (cached per instance).
 */
import { logger } from "@/lib/logger";
import {
  FollowerEntry,
  GetFollowersOptions,
  GetFollowersResult,
  InstagramDataProvider,
  ProfileData,
  ProviderError,
} from "./types";

const log = logger.scope("hikerapi");

interface HikerConfig {
  apiKey: string;
  baseUrl: string;
  defaultPageSize: number;
}

interface HikerUser {
  pk: string | number;
  username: string;
  full_name?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  profile_pic_url?: string;
  profile_pic_url_hd?: string;
  is_verified?: boolean;
  is_private?: boolean;
}

export class HikerApiProvider implements InstagramDataProvider {
  readonly name = "hikerapi";
  readonly supportsFollowerList = true;

  private userCache = new Map<string, HikerUser>();

  constructor(private cfg: HikerConfig) {
    if (!cfg.apiKey) throw new ProviderError("HIKERAPI_KEY is not set", "AUTH");
  }

  private async request<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(path, this.cfg.baseUrl);
    for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "x-access-key": this.cfg.apiKey, accept: "application/json" },
        signal: AbortSignal.timeout(25_000),
      });
    } catch (e) {
      throw new ProviderError(`Network error calling HikerAPI: ${(e as Error).message}`, "UNAVAILABLE", true);
    }

    if (res.status === 401 || res.status === 403) throw new ProviderError("HikerAPI rejected the API key", "AUTH");
    if (res.status === 404) throw new ProviderError("Profile not found", "NOT_FOUND");
    if (res.status === 429) throw new ProviderError("HikerAPI rate limit hit", "RATE_LIMIT", true);
    if (!res.ok) throw new ProviderError(`HikerAPI returned ${res.status}`, "UNKNOWN", res.status >= 500);
    return (await res.json()) as T;
  }

  private async resolveUser(username: string): Promise<HikerUser> {
    const key = username.toLowerCase();
    const cached = this.userCache.get(key);
    if (cached) return cached;
    const data = await this.request<any>("/v1/user/by/username", { username });
    const user: HikerUser = data?.user ?? data ?? {};
    if (!user.pk) throw new ProviderError("HikerAPI returned no user id", "UNKNOWN");
    this.userCache.set(key, user);
    return user;
  }

  async getProfile(username: string): Promise<ProfileData> {
    const u = await this.resolveUser(username);
    return {
      username: u.username ?? username,
      displayName: u.full_name ?? null,
      avatarUrl: u.profile_pic_url_hd ?? u.profile_pic_url ?? null,
      bio: null,
      isPrivate: Boolean(u.is_private),
      isVerified: Boolean(u.is_verified),
      followersCount: Number(u.follower_count ?? 0),
      followingCount: Number(u.following_count ?? 0),
      postsCount: Number(u.media_count ?? 0),
    };
  }

  async getFollowers(username: string, opts: GetFollowersOptions = {}): Promise<GetFollowersResult> {
    return this.paginate("/v1/user/followers/chunk", username, opts);
  }

  async getFollowing(username: string, opts: GetFollowersOptions = {}): Promise<GetFollowersResult> {
    return this.paginate("/v1/user/following/chunk", username, opts);
  }

  private async paginate(
    path: string,
    username: string,
    opts: GetFollowersOptions,
  ): Promise<GetFollowersResult> {
    const user = await this.resolveUser(username);
    if (user.is_private) {
      throw new ProviderError("Account is private — follower list not available", "PRIVATE");
    }

    const maxPages = opts.maxPages ?? 5;
    const followers: FollowerEntry[] = [];
    let cursor = opts.cursor ?? "";
    let pages = 0;
    let hadMore = false;

    while (pages < maxPages) {
      const data = await this.request<any>(path, { user_id: String(user.pk), max_id: cursor });
      const users: HikerUser[] = data?.users ?? [];
      for (const u of users) {
        followers.push({
          username: u.username,
          displayName: u.full_name ?? null,
          avatarUrl: u.profile_pic_url ?? null,
          isVerified: Boolean(u.is_verified),
        });
      }
      cursor = data?.next_max_id ? String(data.next_max_id) : "";
      pages++;
      if (!cursor) break;
      if (pages >= maxPages) hadMore = true;
    }

    log.debug("fetched followers", { username, count: followers.length, truncated: hadMore });
    return { followers, mode: hadMore ? "head" : "full", truncated: hadMore };
  }
}
