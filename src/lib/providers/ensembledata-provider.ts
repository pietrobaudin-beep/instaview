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
  // EnsembleData's Instagram API returns follower COUNTS only, not the list of
  // follower usernames — so this provider cannot power "who started following".
  readonly supportsFollowerList = false;

  private userCache = new Map<string, any>();

  constructor(private cfg: EDConfig) {
    if (!cfg.token) throw new ProviderError("ENSEMBLEDATA_TOKEN is not set", "AUTH");
  }

  private async request(path: string, params: Record<string, string>): Promise<any> {
    // Base URL includes a path ("/apis"), so concatenate rather than use
    // `new URL(path, base)` (an absolute path would drop "/apis").
    const url = new URL(this.cfg.baseUrl.replace(/\/+$/, "") + path);
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
    // 429 and 495 both signal the free daily unit limit was reached.
    if (res.status === 429 || res.status === 495)
      throw new ProviderError("EnsembleData daily free limit reached (resets 00:00 UTC)", "RATE_LIMIT", true);
    if (!res.ok) throw new ProviderError(`EnsembleData returned ${res.status}`, "UNKNOWN", res.status >= 500);

    const json = await res.json();
    // Payload is typically under `data`; some endpoints return it at top level.
    return json?.data ?? json;
  }

  private async resolveUser(username: string): Promise<any> {
    const key = username.toLowerCase();
    const cached = this.userCache.get(key);
    if (cached) return cached;
    // detailed-info carries the follower/following/media counts (GraphQL edges).
    const user = await this.request("/instagram/user/detailed-info", { username });
    if (!pick(user, ["pk", "id"])) throw new ProviderError("EnsembleData returned no user id", "UNKNOWN");
    this.userCache.set(key, user);
    return user;
  }

  async getProfile(username: string): Promise<ProfileData> {
    const u = await this.resolveUser(username);
    return {
      username: pick(u, ["username"]) ?? username,
      displayName: pick(u, ["full_name"]) ?? null,
      avatarUrl: pick(u, ["profile_pic_url_hd", "profile_pic_url"]) ?? null,
      bio: pick(u, ["biography"]) ?? null,
      isPrivate: Boolean(pick(u, ["is_private"])),
      isVerified: Boolean(pick(u, ["is_verified"])),
      // GraphQL-style edge counts.
      followersCount: num(u?.edge_followed_by?.count ?? pick(u, ["follower_count"])),
      followingCount: num(u?.edge_follow?.count ?? pick(u, ["following_count"])),
      postsCount: num(u?.edge_owner_to_timeline_media?.count ?? pick(u, ["media_count"])),
    };
  }

  /** Cheap preview lookup (~3 units): photo + name, no follower counts. */
  async getProfileBasic(username: string): Promise<ProfileData> {
    const data = await this.request("/instagram/user/info", { username });
    const u = data?.user ?? data ?? {};
    if (!pick(u, ["pk", "id"])) throw new ProviderError("EnsembleData returned no user", "UNKNOWN");
    return {
      username: pick(u, ["username"]) ?? username,
      displayName: pick(u, ["full_name"]) ?? null,
      avatarUrl: pick(u, ["profile_pic_url_hd", "profile_pic_url"]) ?? null,
      bio: null,
      isPrivate: Boolean(pick(u, ["is_private"])),
      isVerified: Boolean(pick(u, ["is_verified"])),
      followersCount: num(pick(u, ["follower_count"])),
      followingCount: 0,
      postsCount: 0,
    };
  }

  // EnsembleData's Instagram followers endpoint returns only a COUNT, not the
  // list of follower usernames. We surface the count via getProfile; there is
  // no follower list to return here.
  async getFollowers(_username: string, _opts?: GetFollowersOptions): Promise<GetFollowersResult> {
    log.warn("EnsembleData does not provide follower lists (count only)");
    return { followers: [] as FollowerEntry[], mode: "head", truncated: true };
  }

  async getFollowing(_username: string, _opts?: GetFollowersOptions): Promise<GetFollowersResult> {
    return { followers: [] as FollowerEntry[], mode: "head", truncated: true };
  }
}
