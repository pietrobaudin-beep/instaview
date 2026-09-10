/**
 * HikerApiProvider — real third-party adapter (provider-dependent).
 *
 * HikerAPI (https://hikerapi.com) is a paid scraping API that DOES expose
 * follower lists. Using it means you (the operator) accept HikerAPI's terms and
 * the Instagram ToS risk that comes with scraped data — see README §Legal.
 *
 * ⚠️ ENDPOINT PATHS / RESPONSE SHAPES BELOW MUST BE VERIFIED against the live
 * HikerAPI documentation before production use — they version their API and the
 * exact routes change. This adapter is written defensively (tolerant parsing +
 * typed errors) precisely so that only THIS file changes when they do. The rest
 * of InstaView depends solely on the InstagramDataProvider interface.
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

export class HikerApiProvider implements InstagramDataProvider {
  readonly name = "hikerapi";
  readonly supportsFollowerList = true;

  constructor(private cfg: HikerConfig) {
    if (!cfg.apiKey) {
      throw new ProviderError("HIKERAPI_KEY is not set", "AUTH");
    }
  }

  private async request<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(path, this.cfg.baseUrl);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "x-access-key": this.cfg.apiKey, accept: "application/json" },
        // Collections run server-side in a job; keep a bounded timeout.
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      throw new ProviderError(`Network error calling HikerAPI: ${(e as Error).message}`, "UNAVAILABLE", true);
    }

    if (res.status === 401 || res.status === 403) {
      throw new ProviderError("HikerAPI rejected the API key", "AUTH");
    }
    if (res.status === 404) {
      throw new ProviderError("Profile not found", "NOT_FOUND");
    }
    if (res.status === 429) {
      throw new ProviderError("HikerAPI rate limit hit", "RATE_LIMIT", true);
    }
    if (!res.ok) {
      throw new ProviderError(`HikerAPI returned ${res.status}`, "UNKNOWN", res.status >= 500);
    }
    return (await res.json()) as T;
  }

  async getProfile(username: string): Promise<ProfileData> {
    // VERIFY endpoint against HikerAPI docs (e.g. /v1/user/by/username).
    const data = await this.request<any>("/v1/user/by/username", { username });
    const u = data?.user ?? data ?? {};
    if (u.is_private) {
      // Private accounts' follower lists are not retrievable.
      log.warn("profile is private", { username });
    }
    return {
      username,
      displayName: u.full_name ?? null,
      avatarUrl: u.profile_pic_url_hd ?? u.profile_pic_url ?? null,
      bio: u.biography ?? null,
      isPrivate: Boolean(u.is_private),
      isVerified: Boolean(u.is_verified),
      followersCount: Number(u.follower_count ?? u.edge_followed_by?.count ?? 0),
      followingCount: Number(u.following_count ?? u.edge_follow?.count ?? 0),
      postsCount: Number(u.media_count ?? 0),
    };
  }

  async getFollowers(username: string, opts: GetFollowersOptions = {}): Promise<GetFollowersResult> {
    return this.paginate("/v2/user/followers", username, opts);
  }

  async getFollowing(username: string, opts: GetFollowersOptions = {}): Promise<GetFollowersResult> {
    return this.paginate("/v2/user/following", username, opts);
  }

  private async paginate(
    path: string,
    username: string,
    opts: GetFollowersOptions,
  ): Promise<GetFollowersResult> {
    const maxPages = opts.maxPages ?? 5;
    const followers: FollowerEntry[] = [];
    let cursor = opts.cursor ?? "";
    let pages = 0;
    let hadMore = false;

    while (pages < maxPages) {
      const params: Record<string, string> = { username };
      if (cursor) params.page_id = cursor;
      // VERIFY response shape (users[] + next_page_id) against HikerAPI docs.
      const data = await this.request<any>(path, params);
      const users: any[] = data?.users ?? data?.response?.users ?? [];
      for (const u of users) {
        followers.push({
          username: u.username,
          displayName: u.full_name ?? null,
          avatarUrl: u.profile_pic_url ?? null,
          isVerified: Boolean(u.is_verified),
        });
      }
      cursor = data?.next_page_id ?? data?.next_cursor ?? "";
      pages++;
      if (!cursor) break;
      if (pages >= maxPages) hadMore = true;
    }

    return { followers, mode: hadMore ? "head" : "full", truncated: hadMore };
  }
}
