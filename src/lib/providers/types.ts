/**
 * InstagramDataProvider — the abstraction that isolates the rest of the system
 * from any single data source. Swap the implementation (mock, HikerAPI,
 * HikerAPI, Apify, official Graph API for owned accounts...) without
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
  /** Link que a própria pessoa colocou na bio, quando existe. */
  externalUrl?: string | null;
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

/** A recent post, reduced to the interaction signals we care about. */
export interface MediaPost {
  id: string;
  caption: string | null;
  /** Accounts tagged in the photo or credited as co-authors. */
  tagged: FollowerEntry[];
  /** Para mostrar o post (a mesma leitura já traz; caches antigos não têm). */
  code?: string | null;
  thumbnailUrl?: string | null;
  takenAt?: string | null;
}

// ---------------------------------------------------------------------------
// Raio-X: the rest of a public profile (all public data, provider-dependent)
// ---------------------------------------------------------------------------

/** A post, reel or repost, reduced to what the Raio-X shows. */
export interface PostItem {
  id: string;
  /** Shortcode for the public link instagram.com/p/<code>. */
  code: string | null;
  kind: "photo" | "video" | "carousel" | "reel";
  /** ISO date. */
  takenAt: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  likeCount: number | null;
  commentCount: number | null;
  viewCount: number | null;
  /** Who posted it (differs from the profile for tags and reposts). */
  owner: FollowerEntry | null;
  /** Accounts tagged in it. */
  tagged: FollowerEntry[];
}

/** A story from the last 24h. */
export interface StoryItem {
  id: string;
  takenAt: string | null;
  kind: "photo" | "video";
  thumbnailUrl: string | null;
  /** O arquivo do vídeo, quando o story é vídeo. Endereço assinado: vence. */
  videoUrl?: string | null;
  /** Accounts mentioned with @ stickers. */
  mentions: FollowerEntry[];
}

export interface HighlightItem {
  id: string;
  title: string;
  coverUrl: string | null;
  count: number;
}

export interface AboutInfo {
  /** When the account was created, as Instagram words it (e.g. "May 2016"). */
  joined: string | null;
  country: string | null;
  /** How many times it changed its @, when Instagram says. */
  formerUsernames: number | null;
}

/** Raised by adapters so callers can react to auth/rate/unavailable distinctly. */
export class ProviderError extends Error {
  constructor(
    message: string,
    public code:
      | "AUTH"
      | "RATE_LIMIT"
      | "NOT_FOUND"
      /** Conta privada: nem o perfil se abre. */
      | "PRIVATE"
      /**
       * Conta **pública** que escondeu um dado específico — o caso mais comum
       * é a lista de "seguindo", que o Instagram deixa fechar sem fechar o
       * perfil. O resto da análise continua valendo.
       */
      | "HIDDEN"
      | "UNAVAILABLE"
      | "UNKNOWN",
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
  /**
   * Optional cheaper lookup for previews (photo + name), when a provider bills
   * less for a basic call than a full profile. Callers fall back to getProfile.
   */
  getProfileBasic?(username: string): Promise<ProfileData>;
  /** Recent posts, when the provider exposes them (used for interactions). */
  getRecentMedia?(username: string): Promise<MediaPost[]>;
  /** Who liked a given post. */
  getMediaLikers?(mediaId: string): Promise<FollowerEntry[]>;
  /** Who commented on a given post (one entry per commenter). */
  getMediaCommenters?(mediaId: string): Promise<FollowerEntry[]>;
  getFollowers(username: string, opts?: GetFollowersOptions): Promise<GetFollowersResult>;
  getFollowing(username: string, opts?: GetFollowersOptions): Promise<GetFollowersResult>;

  // Raio-X sections — one request each (plus the cached user lookup).
  getAbout?(username: string): Promise<AboutInfo>;
  getPosts?(username: string): Promise<PostItem[]>;
  getPinned?(username: string): Promise<PostItem[]>;
  getReels?(username: string): Promise<PostItem[]>;
  /** Posts by others where this profile is tagged. */
  getTaggedIn?(username: string): Promise<PostItem[]>;
  getStories?(username: string): Promise<StoryItem[]>;
  getHighlights?(username: string): Promise<HighlightItem[]>;
  getReposts?(username: string): Promise<PostItem[]>;
  /** "Similar accounts" Instagram suggests for this profile. */
  getSuggested?(username: string): Promise<FollowerEntry[]>;

  /**
   * Busca de contas por texto — a lista que aparece enquanto se digita o @.
   *
   * Uma requisição devolve a página inteira (o Instagram manda ~20), por isso
   * a tela mostra 3 e guarda o resto: abrir "ver mais" não custa nada a mais.
   * Opcional: provedor que não busca simplesmente não define o método, e a
   * tela cai no perfil exato.
   */
  searchUsers?(query: string): Promise<SearchHit[]>;
}

/** Uma conta na lista de resultados da busca. */
export interface SearchHit {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
}
