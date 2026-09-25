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
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cacheSectionKey } from "@/lib/sandbox";
import { logger } from "@/lib/logger";
import { registrarChamada } from "@/lib/custo";
import {
  AboutInfo,
  FollowerEntry,
  HighlightItem,
  PostItem,
  StoryItem,
  GetFollowersOptions,
  GetFollowersResult,
  InstagramDataProvider,
  MediaPost,
  ProfileData,
  ProviderError,
  SearchHit,
} from "./types";

const log = logger.scope("hikerapi");

const toEntry = (u: any): FollowerEntry => ({
  username: String(u.username),
  displayName: u.full_name ?? null,
  avatarUrl: u.profile_pic_url ?? null,
  isVerified: Boolean(u.is_verified),
});

/** Epoch seconds, epoch ms or ISO → ISO; null when missing. */
function toIso(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v).toISOString();
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** The best still image of a media, across the v1 (instagrapi) and GraphQL shapes. */
function thumbOf(m: any): string | null {
  return (
    m?.thumbnail_url ??
    m?.image_versions2?.candidates?.[0]?.url ??
    m?.resources?.[0]?.thumbnail_url ??
    m?.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url ??
    m?.display_url ??
    m?.thumbnail_src ??
    null
  );
}

const userOf = (u: any): FollowerEntry | null => (u?.username ? toEntry(u) : null);

/**
 * A media object → PostItem. Reads instagrapi's v1 fields first (pk, code,
 * taken_at, media_type, product_type, like_count…) and falls back to the
 * GraphQL names (shortcode, taken_at_timestamp, edge_liked_by…).
 */
function toPost(m: any): PostItem {
  const mediaType = Number(m?.media_type ?? 0);
  const isReel = m?.product_type === "clips";
  const kind: PostItem["kind"] = isReel
    ? "reel"
    : mediaType === 8 || m?.__typename === "GraphSidecar"
      ? "carousel"
      : mediaType === 2 || m?.is_video
        ? "video"
        : "photo";
  const tags = [...(m?.usertags ?? []), ...(m?.coauthor_producers ?? []), ...(m?.edge_media_to_tagged_user?.edges ?? [])]
    .map((t: any) => t?.user ?? t?.node?.user ?? t)
    .filter((u: any) => u?.username);
  return {
    id: String(m?.pk ?? m?.id ?? m?.code ?? m?.shortcode ?? ""),
    code: m?.code ?? m?.shortcode ?? null,
    kind,
    takenAt: toIso(m?.taken_at ?? m?.taken_at_timestamp),
    caption: m?.caption_text ?? m?.caption?.text ?? m?.edge_media_to_caption?.edges?.[0]?.node?.text ?? null,
    thumbnailUrl: thumbOf(m),
    likeCount: num(m?.like_count) ?? num(m?.edge_liked_by?.count) ?? num(m?.edge_media_preview_like?.count),
    commentCount: num(m?.comment_count) ?? num(m?.edge_media_to_comment?.count),
    viewCount: num(m?.play_count) ?? num(m?.view_count) ?? num(m?.video_view_count),
    owner: userOf(m?.user ?? m?.owner),
    tagged: [...new Map(tags.map((u: any) => [u.username, toEntry(u)])).values()],
  };
}

/**
 * Walks an unknown response and collects every object `pick` accepts — for the
 * endpoints whose exact shape isn't documented (GraphQL reposts, v2 suggestions).
 */
function collect(root: unknown, pick: (o: any) => boolean, limit = 60): any[] {
  const out: any[] = [];
  const seen = new Set<unknown>();
  const walk = (v: unknown, depth: number) => {
    if (out.length >= limit || depth > 8 || v == null || typeof v !== "object" || seen.has(v)) return;
    seen.add(v);
    if (!Array.isArray(v) && pick(v)) {
      out.push(v);
      return;
    }
    for (const child of Array.isArray(v) ? v : Object.values(v as object)) walk(child, depth + 1);
  };
  walk(root, 0);
  return out;
}

/** Items from a v1 list or a `/chunk` tuple ([items, cursor]). */
const itemsOf = (data: any): any[] =>
  Array.isArray(data) ? (Array.isArray(data[0]) ? data[0] : data) : (data?.items ?? data?.response?.items ?? []);

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
  biography?: string;
  external_url?: string;
}

/** Same freshness window as the profile cache. */
const USER_TTL = 24 * 60 * 60 * 1000;
const USER_KEY = () => cacheSectionKey("hiker-user");

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
      // Sem resposta, mas a requisição pode ter chegado e sido cobrada.
      await registrarChamada("hikerapi", path, null);
      throw new ProviderError(`Network error calling HikerAPI: ${(e as Error).message}`, "UNAVAILABLE", true);
    }
    // Toda resposta entra na conta de custo, inclusive erro: a HikerAPI cobra
    // por requisição, e fingir que a falha foi de graça esconderia o gasto.
    await registrarChamada("hikerapi", path, res.status);

    if (res.status === 401) throw new ProviderError("HikerAPI rejected the API key", "AUTH");

    /*
     * 403 não é chave recusada — e tratar os dois juntos custou caro.
     *
     * Em 24/09 uma análise falhou e o log disse "HikerAPI rejected the API
     * key". Foram trocadas chaves, renomeadas variáveis e refeitos deploys
     * atrás de um problema que não existia: a chave estava certa o tempo
     * todo. O que a HikerAPI dizia, no corpo da resposta, era outra coisa:
     *
     *   {"detail":"User hid data using privacy settings",
     *    "exc_type":"PrivateAccount"}
     *
     * Ou seja: conta pública que fechou a lista de "seguindo" — coisa que o
     * Instagram permite. Mensagem de erro que mente sobre a causa faz perder
     * horas; esta agora diz o que é.
     */
    if (res.status === 403) {
      const corpo = await res.text().catch(() => "");
      if (/PrivateAccount|hid data|privacy settings/i.test(corpo)) {
        throw new ProviderError(
          "Esta conta escondeu esta informação nas configurações de privacidade",
          "HIDDEN",
        );
      }
      throw new ProviderError("HikerAPI rejected the API key", "AUTH");
    }
    if (res.status === 404) throw new ProviderError("Profile not found", "NOT_FOUND");
    if (res.status === 429) throw new ProviderError("HikerAPI rate limit hit", "RATE_LIMIT", true);
    if (!res.ok) throw new ProviderError(`HikerAPI returned ${res.status}`, "UNKNOWN", res.status >= 500);
    return (await res.json()) as T;
  }

  /**
   * Username → user, the request every other endpoint depends on.
   *
   * It is kept in the database, not only in memory: on Vercel each route is
   * its own instance, so an in-memory copy was missed on nearly every call and
   * each Raio-X tab was paying twice — once to find the id, once for the data.
   * The window matches the profile cache, so nothing here is staler than what
   * the rest of the app already shows.
   */
  private async resolveUser(username: string): Promise<HikerUser> {
    const key = username.toLowerCase();
    const cached = this.userCache.get(key);
    if (cached) return cached;

    const stored = await prisma.sectionCache
      .findUnique({ where: { username_section: { username: key, section: USER_KEY() } } })
      .catch(() => null);
    if (stored && Date.now() - stored.fetchedAt.getTime() < USER_TTL) {
      const user = stored.data as unknown as HikerUser;
      if (user?.pk) {
        this.userCache.set(key, user);
        return user;
      }
    }

    const data = await this.request<any>("/v1/user/by/username", { username });
    const user: HikerUser = data?.user ?? data ?? {};
    if (!user.pk) throw new ProviderError("HikerAPI returned no user id", "UNKNOWN");
    this.userCache.set(key, user);
    const json = user as unknown as Prisma.InputJsonValue;
    await prisma.sectionCache
      .upsert({
        where: { username_section: { username: key, section: USER_KEY() } },
        create: { username: key, section: USER_KEY(), data: json },
        update: { data: json, fetchedAt: new Date() },
      })
      .catch(() => null);
    return user;
  }

  async getProfile(username: string): Promise<ProfileData> {
    const u = await this.resolveUser(username);
    return {
      username: u.username ?? username,
      displayName: u.full_name ?? null,
      avatarUrl: u.profile_pic_url_hd ?? u.profile_pic_url ?? null,
      // A bio e o link já vêm nesta mesma resposta: descartá-los era jogar
      // fora informação pela qual o Farejo já pagou.
      bio: u.biography?.trim() || null,
      externalUrl: u.external_url?.trim() || null,
      isPrivate: Boolean(u.is_private),
      isVerified: Boolean(u.is_verified),
      followersCount: Number(u.follower_count ?? 0),
      followingCount: Number(u.following_count ?? 0),
      postsCount: Number(u.media_count ?? 0),
    };
  }

  /** One page of recent posts (~12-20) — a single request. */
  async getRecentMedia(username: string): Promise<MediaPost[]> {
    const user = await this.resolveUser(username);
    const data = await this.request<any>("/v1/user/medias/chunk", { user_id: String(user.pk) });
    const items: any[] = Array.isArray(data) ? data[0] ?? [] : (data?.items ?? []);
    return items.map((m) => ({
      id: String(m.pk ?? m.id ?? ""),
      caption: m.caption_text ?? null,
      code: m.code ?? null,
      thumbnailUrl: thumbOf(m),
      takenAt: toIso(m.taken_at),
      tagged: [...(m.usertags ?? []), ...(m.coauthor_producers ?? [])]
        .map((t: any) => t?.user ?? t)
        .filter((u: any) => u?.username)
        .map((u: any) => ({
          username: String(u.username),
          displayName: u.full_name ?? null,
          avatarUrl: u.profile_pic_url ?? null,
          isVerified: Boolean(u.is_verified),
        })),
    }));
  }

  /** Who liked a post — one request. */
  async getMediaLikers(mediaId: string): Promise<FollowerEntry[]> {
    const data = await this.request<any>("/v1/media/likers", { id: mediaId });
    const users: any[] = Array.isArray(data) ? data : (data?.users ?? []);
    return users.filter((u) => u?.username).map(toEntry);
  }

  /** Who commented on a post — one request, de-duplicated per account. */
  async getMediaCommenters(mediaId: string): Promise<FollowerEntry[]> {
    const data = await this.request<any>("/v1/media/comments", { id: mediaId });
    const items: any[] = Array.isArray(data) ? (Array.isArray(data[0]) ? data[0] : data) : (data?.comments ?? []);
    const seen = new Map<string, FollowerEntry>();
    for (const c of items) {
      const u = c?.user ?? c?.owner;
      if (!u?.username || seen.has(u.username)) continue;
      seen.set(u.username, toEntry(u));
    }
    return [...seen.values()];
  }

  // ——— Raio-X sections ———

  /** Private accounts hide everything below; say so instead of spending a request. */
  private async publicUser(username: string): Promise<HikerUser> {
    const user = await this.resolveUser(username);
    if (user.is_private) throw new ProviderError("Account is private", "PRIVATE");
    return user;
  }

  /** /v1/user/about — country, creation date, former usernames. */
  async getAbout(username: string): Promise<AboutInfo> {
    const user = await this.resolveUser(username);
    const a = await this.request<any>("/v1/user/about", { id: String(user.pk) });
    const former = a?.former_usernames;
    return {
      joined: a?.date ?? null,
      country: a?.country ?? null,
      formerUsernames: former == null ? null : Number.parseInt(String(former), 10) || 0,
    };
  }

  /** /v1/user/medias/chunk — the latest page of posts. */
  async getPosts(username: string): Promise<PostItem[]> {
    const user = await this.publicUser(username);
    const data = await this.request<any>("/v1/user/medias/chunk", { user_id: String(user.pk) });
    return itemsOf(data).map(toPost);
  }

  /** /v1/user/medias/pinned — posts pinned to the top of the grid. */
  async getPinned(username: string): Promise<PostItem[]> {
    const user = await this.publicUser(username);
    const data = await this.request<any>("/v1/user/medias/pinned", { user_id: String(user.pk), amount: "3" });
    return itemsOf(data).map(toPost);
  }

  /** /v1/user/clips/chunk — latest reels. */
  async getReels(username: string): Promise<PostItem[]> {
    const user = await this.publicUser(username);
    const data = await this.request<any>("/v1/user/clips/chunk", { user_id: String(user.pk) });
    return itemsOf(data).map((m) => ({ ...toPost(m), kind: "reel" as const }));
  }

  /** /v1/user/tag/medias/chunk — posts by others where this profile is tagged. */
  async getTaggedIn(username: string): Promise<PostItem[]> {
    const user = await this.publicUser(username);
    const data = await this.request<any>("/v1/user/tag/medias/chunk", { user_id: String(user.pk) });
    return itemsOf(data).map(toPost);
  }

  /** /v1/user/stories — what's up right now (last 24h). */
  async getStories(username: string): Promise<StoryItem[]> {
    const user = await this.publicUser(username);
    const data = await this.request<any>("/v1/user/stories", { user_id: String(user.pk) });
    return itemsOf(data).map((s: any) => ({
      id: String(s?.pk ?? s?.id ?? ""),
      takenAt: toIso(s?.taken_at),
      kind: Number(s?.media_type) === 2 ? ("video" as const) : ("photo" as const),
      thumbnailUrl: thumbOf(s),
      // Vem na mesma resposta — usar não custa leitura nenhuma a mais.
      videoUrl: s?.video_versions?.[0]?.url ?? s?.video_url ?? null,
      mentions: (s?.mentions ?? []).map((x: any) => userOf(x?.user)).filter(Boolean) as FollowerEntry[],
    }));
  }

  /** /v1/user/highlights — the saved story circles. */
  async getHighlights(username: string): Promise<HighlightItem[]> {
    const user = await this.publicUser(username);
    const data = await this.request<any>("/v1/user/highlights", { user_id: String(user.pk) });
    return itemsOf(data).map((h: any) => ({
      id: String(h?.pk ?? h?.id ?? ""),
      title: String(h?.title ?? ""),
      coverUrl: h?.cover_media?.cropped_image_version?.url ?? h?.cover_media?.url ?? thumbOf(h?.cover_media) ?? null,
      count: Number(h?.media_count ?? h?.items?.length ?? 0),
    }));
  }

  /**
   * /gql/user/reposts — provider-dependent: the GraphQL shape isn't documented,
   * so media objects are found by their fields rather than a fixed path.
   */
  async getReposts(username: string): Promise<PostItem[]> {
    const user = await this.publicUser(username);
    const data = await this.request<any>("/gql/user/reposts", { user_id: String(user.pk) });
    return collect(data, (o) => (o.code || o.shortcode) && (o.taken_at || o.taken_at_timestamp), 30).map(toPost);
  }

  /** /v2/user/suggested/profiles — provider-dependent shape, read defensively. */
  async getSuggested(username: string): Promise<FollowerEntry[]> {
    const user = await this.resolveUser(username);
    const data = await this.request<any>("/v2/user/suggested/profiles", { user_id: String(user.pk) });
    const users = collect(data, (o) => typeof o.username === "string" && (o.pk || o.id || o.pk_id), 40);
    return [...new Map(users.filter((u) => u.username !== user.username).map((u) => [u.username, toEntry(u)])).values()];
  }

  /**
   * /v2/fbsearch/accounts — a busca de contas do próprio Instagram.
   *
   * Uma requisição devolve a página toda (~20 contas), então mostrar 3 e
   * guardar o resto custa o mesmo que mostrar 20. O endpoint está no OpenAPI
   * do HikerAPI; os que o substituíram (/v1/search/users, /v2/search/accounts)
   * estão marcados lá como a caminho da aposentadoria.
   */
  async searchUsers(query: string): Promise<SearchHit[]> {
    const data = await this.request<any>("/v2/fbsearch/accounts", { query });
    const users: any[] = Array.isArray(data?.users) ? data.users : [];
    const hits = users
      .filter((u) => typeof u?.username === "string")
      .map((u) => ({
        username: String(u.username),
        displayName: u.full_name ?? null,
        avatarUrl: u.profile_pic_url ?? null,
        isVerified: Boolean(u.is_verified),
        isPrivate: Boolean(u.is_private),
      }));
    return [...new Map(hits.map((h) => [h.username, h])).values()].slice(0, 20);
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
      // HikerAPI /chunk endpoints return a tuple: [ users[], next_max_id ].
      // Some endpoints/versions return { users, next_max_id } — handle both.
      const isTuple = Array.isArray(data);
      const users: HikerUser[] = isTuple ? data[0] ?? [] : data?.users ?? [];
      const nextMaxId = isTuple ? data[1] : (data?.next_max_id ?? data?.next_cursor);
      for (const u of users) {
        followers.push({
          username: u.username,
          displayName: u.full_name ?? null,
          avatarUrl: u.profile_pic_url ?? null,
          isVerified: Boolean(u.is_verified),
        });
      }
      cursor = nextMaxId ? String(nextMaxId) : "";
      pages++;
      if (!cursor) break;
      if (pages >= maxPages) hadMore = true;
    }

    log.debug("fetched followers", { username, count: followers.length, truncated: hadMore });
    return { followers, mode: hadMore ? "head" : "full", truncated: hadMore };
  }
}
