/**
 * InstagramDataProvider — the abstraction that isolates the rest of the system
 * from any single data source. Swap the implementation (mock, HikerAPI,
 * EnsembleData, Apify, official Graph API for owned accounts...) without
 * touching the monitoring engine, API routes, or frontend.
 *
 * IMPORTANT REALITY (see README): no OFFICIAL Meta/Instagram API returns the
 * list of followers of any account — not even your own. Follower lists come
 * only from third-party scraping providers, which is why this seam exists and
 * why `getFollowers` is explicitly documented as "provider-dependent".
 */

export interface ProfileData {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isPrivate: boolean;
  isVerified: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface FollowerEntry {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface FollowerPage {
  followers: FollowerEntry[];
  /** Opaque cursor for the next page; null when there are no more pages. */
  nextCursor: string | null;
}

export interface GetFollowersOptions {
  /**
   * Max pages to fetch. The realistic technique for detecting NEW followers
   * cheaply is to read only the head of the list (most-recent-first), so most
   * collections pass a small number here rather than paginating the whole list.
   */
  maxPages?: number;
  pageSize?: number;
  cursor?: string;
}

export interface GetFollowersResult {
  followers: FollowerEntry[];
  /** "head" = only recent followers fetched; "full" = entire list traversed. */
  mode: "head" | "full";
  /** True if pagination stopped before exhausting the list (head mode). */
  truncated: boolean;
}

/** Raised by adapters so callers can react to auth/rate/unavailable distinctly. */
export class ProviderError extends Error {
  constructor(
    message: string,
    public code: "AUTH" | "RATE_LIMIT" | "NOT_FOUND" | "PRIVATE" | "UNAVAILABLE" | "UNKNOWN",
    public retryable = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface InstagramDataProvider {
  readonly name: string;
  /** Whether this adapter can return follower lists at all. */
  readonly supportsFollowerList: boolean;

  getProfile(username: string): Promise<ProfileData>;
  getFollowers(username: string, opts?: GetFollowersOptions): Promise<GetFollowersResult>;
  getFollowing(username: string, opts?: GetFollowersOptions): Promise<GetFollowersResult>;
}
