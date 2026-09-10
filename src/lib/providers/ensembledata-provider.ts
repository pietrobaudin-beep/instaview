/**
 * EnsembleDataProvider — real third-party adapter (provider-dependent).
 *
 * EnsembleData (https://ensembledata.com) exposes Instagram data including
 * follower lists, and has a free tier of ~50 units/day that RESETS daily — the
 * closest thing to an ongoing-free source. Using it means you (the operator)
 * accept their terms and the Instagram ToS risk of scraped data.
 *
 * Contract (base https://ensembledata.com/apis, auth via `token` query param):
 *   - Profile:   GET /instagram/user/info?username=<u>&token=<t>
 *   - Followers: GET /instagram/user/followers?user_id=<pk>&cursor=<c>&token=<t>
 *   - Following: GET /instagram/user/following?user_id=<pk>&cursor=<c>&token=<t>
 *
 * ⚠️ Response shapes are parsed defensively (payload may be wrapped in `data`;
 * follower list may be `users`/`followers`; cursor may be `next_cursor`/`cursor`).
 * Verify/adjust against a live response — only THIS file changes when it does.
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

const log = logger.scope("ensembledata");

interface EDConfig {
  token: string;
  baseUrl: string;
}

const num = (v: unknown, d = 0) => (v == null || isNaN(Number(v)) ? d : Number(v));

/** Pull a value from an object trying several candidate keys. */
function pick(obj: any, keys: string[]): any {
  if (!obj) return undefined;
  for (const k of keys) if (obj[k] != null) return obj[k];
  return undefined;
}

export class EnsembleDataProvider implements InstagramDataProvider {
  readonly name = "ensembledata";
  readonly supportsFollowerList = true;

  private userCache = new Map<string, any>();

  constructor(private cfg: EDConfig) {
    if (!cfg.token) throw new ProviderError("ENSEMBLEDATA_TOKEN is not set", "AUTH");
  }

  private async request(path: string, params: Record<string, string>): Promise<any> {
    const url = new URL(path, this.cfg.baseUrl);
    for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
    url.searchParams.set("token", this.cfg.token);

    let res: Response;
    try {
      res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(25_000) });
    } catch (e) {
      throw new ProviderError(`Network error calling EnsembleData: ${(e as Error).message}`, "UNAVAILABLE", true);
    }

    if (res.status === 401 || res.status === 403) throw new ProviderError("EnsembleData rejected the token", "AUTH");
    if (res.status === 404) throw new ProviderError("Profile not found", "NOT_FOUND");
    if (res.status === 429) throw new ProviderError("EnsembleData quota/rate limit hit", "RATE_LIMIT", true);
    if (!res.ok) throw new ProviderError(`EnsembleData returned ${res.status}`, "UNKNOWN", res.status >= 500);

    const json = await res.json();
    // Payload is typically under `data`; some endpoints return it at top level.
    return json?.data ?? json;
  }

  private async resolveUser(username: string): Promise<any> {
    const key = username.toLowerCase();
    const cached = this.userCache.get(key);
    if (cached) return cached;
    const data = await this.request("/instagram/user/info", { username });
    // The user object may be `data` itself or nested under `user`.
    const user = data?.user ?? data ?? {};
    const pk = pick(user, ["pk", "id", "user_id"]);
    if (!pk) throw new ProviderError("EnsembleData returned no user id", "UNKNOWN");
    this.userCache.set(key, user);
    return user;
  }

  async getProfile(username: string): Promise<ProfileData> {
    const u = await this.resolveUser(username);
    return {
      username: pick(u, ["username"]) ?? username,
      displayName: pick(u, ["full_name", "fullname"]) ?? null,
      avatarUrl: pick(u, ["profile_pic_url_hd", "profile_pic_url", "profile_picture"]) ?? null,
      bio: pick(u, ["biography", "bio"]) ?? null,
      isPrivate: Boolean(pick(u, ["is_private"])),
      isVerified: Boolean(pick(u, ["is_verified"])),
      followersCount: num(pick(u, ["follower_count", "followers", "edge_followed_by"])?.count ?? pick(u, ["follower_count", "followers"])),
      followingCount: num(pick(u, ["following_count", "following"])?.count ?? pick(u, ["following_count", "following"])),
      postsCount: num(pick(u, ["media_count", "posts_count", "media"])),
    };
  }

  async getFollowers(username: string, opts: GetFollowersOptions = {}): Promise<GetFollowersResult> {
    return this.paginate("/instagram/user/followers", username, opts);
  }

  async getFollowing(username: string, opts: GetFollowersOptions = {}): Promise<GetFollowersResult> {
    return this.paginate("/instagram/user/following", username, opts);
  }

  private async paginate(path: string, username: string, opts: GetFollowersOptions): Promise<GetFollowersResult> {
    const user = await this.resolveUser(username);
    if (user.is_private) throw new ProviderError("Account is private — follower list not available", "PRIVATE");
    const userId = String(pick(user, ["pk", "id", "user_id"]));

    const maxPages = opts.maxPages ?? 5;
    const followers: FollowerEntry[] = [];
    let cursor = opts.cursor ?? "";
    let pages = 0;
    let hadMore = false;

    while (pages < maxPages) {
      const data = await this.request(path, { user_id: userId, cursor });
      const list: any[] = pick(data, ["users", "followers", "following"]) ?? (Array.isArray(data) ? data : []);
      for (const u of list) {
        followers.push({
          username: pick(u, ["username"]),
          displayName: pick(u, ["full_name", "fullname"]) ?? null,
          avatarUrl: pick(u, ["profile_pic_url", "profile_picture"]) ?? null,
          isVerified: Boolean(pick(u, ["is_verified"])),
        });
      }
      cursor = String(pick(data, ["next_cursor", "cursor", "next_max_id", "end_cursor"]) ?? "");
      pages++;
      if (!cursor || cursor === "null") break;
      if (pages >= maxPages) hadMore = true;
    }

    log.debug("fetched followers", { username, count: followers.length, truncated: hadMore });
    return { followers, mode: hadMore ? "head" : "full", truncated: hadMore };
  }
}
