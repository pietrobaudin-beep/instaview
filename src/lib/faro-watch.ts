/**
 * The daily Faro AI: once a day, every profile a PRO user put "no Faro AI" is read
 * again and only what is NEW is kept as news — new posts, reels, stories and
 * places it was tagged, plus the follow changes the existing tracker finds.
 *
 * - The first reading of each kind becomes the baseline (stored, never shown),
 *   so the Faro AI reports only what appears from then on.
 * - Reads go through the Raio-X cache with a max age of ~20h, so a section
 *   someone opened today isn't paid for again, and yesterday's copy never
 *   hides today's posts.
 * - Cost per profile per day: one request per watched section + the following
 *   page (~7 in total with HikerAPI). Private profiles are skipped.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { syncPostActivity } from "@/lib/post-activity";
import { avaliarNovidades } from "@/lib/alerta-escrito";
import { getProvider } from "@/lib/providers";
import { recordFollowing } from "@/lib/following-tracker";
import { logger } from "@/lib/logger";
import { getSection, type Section } from "@/lib/raio-x";
import { keepImage } from "@/lib/img-store";
import { TEST_EMAIL_DOMAIN, usingMockData } from "@/lib/sandbox";
import type { PostItem, StoryItem } from "@/lib/providers/types";

const log = logger.scope("faro-watch");

/**
 * O que o Faro AI relê todo dia em cada perfil. **Cada linha é uma requisição
 * paga por perfil por dia.**
 *
 * Reels saiu em 21/09 junto com a aba: pouca gente abria, e era 25% do custo
 * diário de cada perfil no Faro AI. Com 15 perfis, isso sozinho era ~R$ 30/ano.
 */
/**
 * O que o Faro AI lê em cada passagem, e por quanto tempo uma leitura serve.
 *
 * O prazo precisa ser menor do que a vida do conteúdo — senão o Faro AI olha
 * para um retrato velho e jura que não há nada.
 *
 * Post e marcação não somem: 20h de reaproveitamento economiza requisição sem
 * perder nada. **Story vive 24h**, e com os mesmos 20h o Faro AI perdia story de
 * verdade: bastava alguém apertar "Atualizar agora" num momento sem story
 * para o "não tem nada" valer até quase o dia seguinte. E no Faro Detetive,
 * que passa de 6 em 6 horas, as três passagens seguintes reusavam a primeira
 * — pagava por quatro leituras de story e recebia uma.
 *
 * Uma hora é curto o bastante para nenhuma passagem programada cair no cache,
 * e longo o bastante para um "Atualizar agora" logo depois do cron não cobrar
 * duas vezes.
 */
const WATCH: { section: Section; kind: string; fresco: number }[] = [
  { section: "posts", kind: "post", fresco: 20 * 60 * 60 * 1000 },
  { section: "stories", kind: "story", fresco: 60 * 60 * 1000 },
  { section: "tagged", kind: "tagged", fresco: 20 * 60 * 60 * 1000 },
];

/** What the news card needs, frozen at detection time. */
export interface EventData {
  kind: string;
  takenAt: string | null;
  thumbnailUrl: string | null;
  code: string | null;
  caption: string | null;
  /** Owner (for tags) or mentioned accounts (for stories). */
  people: string[];
}

function summarize(kind: string, x: PostItem | StoryItem): EventData {
  const isStory = kind === "story";
  const post = x as PostItem;
  const story = x as StoryItem;
  return {
    kind,
    takenAt: x.takenAt,
    thumbnailUrl: x.thumbnailUrl,
    code: isStory ? null : post.code,
    caption: isStory ? null : (post.caption ?? "").slice(0, 120) || null,
    people: isStory
      ? story.mentions.map((m) => m.username)
      : kind === "tagged"
        ? [post.owner?.username].filter(Boolean) as string[]
        : post.tagged.map((u) => u.username),
  };
}

export interface WatchReport {
  username: string;
  news: number;
  skipped?: string;
}

/**
 * Uma passagem do Faro AI.
 *
 * `modo` decide o que é lido, e isso é dinheiro:
 *
 * - **`completo`** — tudo: posts, stories, marcações e uma página de
 *   "seguindo". É a passagem do dia.
 * - **`stories`** — só os stories. É a passagem EXTRA dos planos com cadência
 *   maior, e existe porque só o story expira: ele some em 24h e, se ninguém
 *   olhar naquela janela, está perdido para sempre. Quem alguém começou a
 *   seguir continua lá amanhã; ler isso de 6 em 6 horas era pagar quatro vezes
 *   por uma informação que não muda tão rápido.
 *
 * No Faro Detetive isso derruba o custo de 10 para 7 requisições por perfil
 * por dia, **sem perder nada do que o plano promete** — a captura de story
 * continua 4× ao dia.
 */
export type ModoDaPassagem = "completo" | "stories";

export async function watchProfile(
  profile: { id: string; username: string; userId: string },
  modo: ModoDaPassagem = "completo",
): Promise<WatchReport> {
  const { id: profileId, username } = profile;
  let news = 0;

  const secoes = modo === "stories" ? WATCH.filter((w) => w.section === "stories") : WATCH;

  for (const { section, kind, fresco } of secoes) {
    const res = await getSection(username, section, fresco);
    if (res.status === "private") return { username, news, skipped: "private" };
    if (res.status !== "ok") continue;

    const d = res.data;
    const items: (PostItem | StoryItem)[] =
      d.section === "posts" ? [...d.pinned, ...d.items] : "items" in d ? (d.items as (PostItem | StoryItem)[]) : [];
    if (!items.length) continue;

    // No earlier reading of this kind → this one is the baseline, not news.
    const baseline = (await prisma.profileEvent.count({ where: { profileId, kind } })) === 0;
    const created = await prisma.profileEvent.createMany({
      data: items
        .filter((x) => x.id)
        .map((x) => ({
          profileId,
          kind,
          refId: x.id,
          baseline,
          data: summarize(kind, x) as unknown as Prisma.InputJsonValue,
        })),
      skipDuplicates: true,
    });
    if (!baseline) news += created.count;

    // Story expira em 24h no Instagram. Como o perfil está no Faro AI, a
    // miniatura é guardada AGORA — é ela que vai sustentar a tela depois,
    // dentro do prazo do plano. Sem custo de provedor: é só baixar a imagem.
    if (section === "stories") {
      for (const x of items.slice(0, 20)) {
        await keepImage((x as StoryItem).thumbnailUrl);
      }
    }
  }

  // Follows: the same tracker the analysis page uses, one page of "following".
  // Fora da passagem completa não roda: ver `ModoDaPassagem`.
  if (modo !== "completo") return { username, news };

  try {
    const provider = getProvider();
    const [p, following] = await Promise.all([
      provider.getProfile(username),
      provider.getFollowing(username, { maxPages: 1, pageSize: 50 }),
    ]);
    await recordFollowing(
      profile.userId,
      {
        username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        bio: p.bio,
        followersCount: p.followersCount,
        followingCount: p.followingCount,
        isVerified: p.isVerified,
        isPrivate: p.isPrivate,
      },
      following.followers.filter((u) => !u.isVerified),
    );
  } catch (e) {
    log.warn("following read failed", { username, error: (e as Error).message });
  }

  /*
   * Interações no post mais recente — quem curtiu, quem comentou, quem tirou.
   *
   * Isto ficou de fora quando a coleta virou `watchProfile`, e as pistas de
   * interação pararam em 17/09: o "Interações" do painel do Faro AI só voltava a
   * ter conteúdo se alguém apertasse "Analisar" na mão. Era um recurso do PRO
   * que tinha deixado de acontecer sozinho.
   *
   * Preço: `WATCHED_POSTS` post × 2 requisições (quem curtiu, quem comentou)
   * por passagem completa — hoje, ~2 por perfil por dia. Se o provedor não
   * oferecer esses endpoints, a função sai sozinha sem gastar nada.
   */
  try {
    await syncPostActivity(profileId, username);
  } catch (e) {
    log.warn("post activity failed", { username, error: (e as Error).message });
  }

  /*
   * O alerta que a pessoa escreveu com as próprias palavras.
   *
   * Roda aqui e não na tela por dois motivos: a publicação só chega uma vez,
   * e a pessoa não está olhando quando o Faro AI passa — esse é o produto.
   * Sem pedido escrito, sai na primeira linha sem gastar nada.
   */
  try {
    const recentes = await prisma.profileEvent.findMany({
      where: { profileId, baseline: false, kind: { in: ["post", "reel", "story"] } },
      orderBy: { detectedAt: "desc" },
      take: 10,
      select: { id: true, kind: true, data: true },
    });
    await avaliarNovidades(profileId, recentes);
  } catch (e) {
    log.warn("alerta escrito falhou", { username, error: (e as Error).message });
  }

  await prisma.trackedProfile.update({ where: { id: profileId }, data: { lastCollectedAt: new Date(), lastError: null } });
  return { username, news };
}

/**
 * Every PRO profile in the Faro AI, least recently read first. `limit` keeps one
 * run inside the serverless time budget; profiles left over go first next day.
 */
export async function runFaroDaily(limit = 20): Promise<{ checked: number; news: number; reports: WatchReport[] }> {
  const profiles = await prisma.trackedProfile.findMany({
    where: {
      status: "ACTIVE",
      user: {
        plan: { not: "FREE" },
        // Fake data (localhost) only ever touches the test accounts.
        ...(usingMockData() ? { email: { endsWith: TEST_EMAIL_DOMAIN } } : {}),
      },
      /*
       * Quem o runner já leu por completo nas últimas 20h fica de fora.
       *
       * Sem isto os dois caminhos pagariam pela mesma informação: o runner
       * faz a passagem completa na cadência do plano, e esta rotina diária
       * viria logo atrás refazer. Ela continua existindo como rede de
       * segurança — pega quem ficou sem job ou atrasado.
       */
      OR: [
        { lastCollectedAt: null },
        { lastCollectedAt: { lt: new Date(Date.now() - 20 * 60 * 60 * 1000) } },
      ],
    },
    orderBy: [{ lastCollectedAt: { sort: "asc", nulls: "first" } }],
    take: limit,
    select: { id: true, username: true, userId: true },
  });

  const reports: WatchReport[] = [];
  // A few at a time: quick enough, gentle on the provider's rate limit.
  for (let i = 0; i < profiles.length; i += 3) {
    const batch = await Promise.all(
      profiles.slice(i, i + 3).map((p) =>
        watchProfile(p).catch((e) => {
          log.error("watch failed", { username: p.username, error: (e as Error).message });
          return { username: p.username, news: 0, skipped: "error" };
        }),
      ),
    );
    reports.push(...batch);
  }
  const news = reports.reduce((n, r) => n + r.news, 0);
  log.info("faro daily run", { checked: reports.length, news });
  return { checked: reports.length, news, reports };
}
