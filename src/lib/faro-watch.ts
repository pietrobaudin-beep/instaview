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
import { avaliarNovidades } from "@/lib/alerta-escrito";
import { getProvider } from "@/lib/providers";
import { recordFollowing } from "@/lib/following-tracker";
import { logger } from "@/lib/logger";
import { getSection, type Section } from "@/lib/raio-x";
import { keepImage } from "@/lib/img-store";
import { TEST_EMAIL_DOMAIN, usingMockData } from "@/lib/sandbox";
import { comQuem } from "@/lib/custo";
import { readPrefs } from "@/lib/tracking-prefs";
import { direitosDe, fimDoCiclo } from "@/lib/direitos";
import { devolver, reservar } from "@/lib/franquia";
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
/*
 * O que o Faro AI olha todo dia — e o que ele deixou de olhar em 24/09.
 *
 * Cada linha aqui é **uma requisição paga por passagem**, e a requisição da
 * HikerAPI custa US$ 0,02 (confirmado no saldo deles e na queda diária real).
 * Um perfil vigiado é, portanto, R$ 3,30/mês por linha desta lista.
 *
 * **Saiu: os posts do próprio perfil.** Quem quer ver o que a pessoa publicou
 * abre o Instagram; o Farejo existe para o que o Instagram NÃO mostra.
 *
 * **Saiu também quem curtiu e quem comentou** os posts dela (era o
 * `syncPostActivity`, 2 requisições por passagem). Custava um terço do perfil
 * para responder uma pergunta que ninguém fez — a pergunta que as pessoas
 * fazem é o contrário, "o que ELA curtiu", e essa o Instagram não publica
 * desde 2019. Não existe endpoint para isso em nenhum provedor: a HikerAPI
 * tem 157 e nenhum de atividade do usuário.
 *
 * **Marcações a cada 3 dias.** Não é conteúdo que expira: saber um dia depois
 * não muda nada para quem lê, e economiza dois terços da linha.
 */
/*
 * **Marcações saíram da coleta em 24/09.** A intenção era ler a cada 3 dias,
 * mas o cache de 24h da seção cortava a janela e, na prática, elas eram lidas
 * todo dia. Na estrutura nova elas ficam na análise pontual. A coleta é
 * enxuta: cartão, uma página de seguindo e stories — 3 leituras.
 */
const WATCH: { section: Section; kind: string; fresco: number }[] = [
  { section: "stories", kind: "story", fresco: 60 * 60 * 1000 },
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

/**
 * Guarda stories que JÁ foram lidos por outro caminho — de graça.
 *
 * Quem abre a análise de um perfil que está no seu Faro AI dispara a leitura
 * dos stories (a aba Raio-X). Essa leitura já foi paga; não guardar o que
 * voltou dela era jogar fora o que a pessoa acabou de ver. Em 24/09 foram 28
 * stories da @crespadai: visíveis na análise, ausentes no painel do Faro AI.
 *
 * Não chama provedor. Só grava o que chegou, com o mesmo formato e a mesma
 * regra de "já vi, não repete" (`skipDuplicates`) da coleta.
 */
export async function guardarStoriesJaLidos(
  profileId: string,
  items: StoryItem[],
): Promise<number> {
  const validos = items.filter((x) => x.id);
  if (!validos.length) return 0;
  const criados = await prisma.profileEvent.createMany({
    data: validos.map((x) => ({
      profileId,
      kind: "story",
      refId: x.id,
      baseline: false,
      data: summarize("story", x) as unknown as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });
  // A miniatura agora, enquanto o endereço do CDN ainda vale.
  for (const x of validos.slice(0, 20)) await keepImage(x.thumbnailUrl);
  return criados.count;
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
  opcoes: { avaliar?: (n: number) => Promise<number> } = {},
): Promise<WatchReport> {
  const { id: profileId, username } = profile;
  let news = 0;
  let houveNovos = false;
  const inicioDaPassagem = new Date();

  // "Guardar stories" desligado nas configurações: pula a leitura (e o custo).
  const prefs = readPrefs(
    (await prisma.trackedProfile.findUnique({ where: { id: profileId }, select: { trackingPrefs: true } }))
      ?.trackingPrefs,
  );
  const secoes = (modo === "stories" ? WATCH.filter((w) => w.section === "stories") : WATCH).filter(
    (w) => w.section !== "stories" || prefs.stories,
  );

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
    if (!baseline && created.count > 0) houveNovos = true;

    // Story expira em 24h no Instagram. Como o perfil está no Faro AI, a
    // miniatura é guardada AGORA — é ela que vai sustentar a tela depois,
    // dentro do prazo do plano. Sem custo de provedor: é só baixar a imagem.
    if (section === "stories") {
      for (const x of items.slice(0, 20)) {
        await keepImage((x as StoryItem).thumbnailUrl);
      }
    }
  }

  // "Me avise quando…": os stories novos desta passagem, contra o pedido.
  // Cada avaliação conta na franquia (`opcoes.avaliar` reserva e diz quantas
  // cabem); o que não coube fica sem avaliar, e a tela mostra o consumo.
  if (houveNovos && opcoes.avaliar) {
    // Só os que ESTA passagem criou: os antigos já tiveram a vez deles.
    const eventos = await prisma.profileEvent.findMany({
      where: { profileId, kind: "story", baseline: false, detectedAt: { gte: inicioDaPassagem } },
      select: { id: true, kind: true, data: true },
    });
    await avaliarNovidades(profileId, eventos, opcoes.avaliar).catch((e) =>
      log.warn("alerta escrito falhou", { username, erro: (e as Error).message }),
    );
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

  await prisma.trackedProfile.update({ where: { id: profileId }, data: { lastCollectedAt: new Date(), lastError: null } });
  return { username, news };
}

export type Pulo = "sem_plano" | "cedo" | "franquia" | "privado" | "erro" | "manual_nao";

export interface Coleta {
  ok: boolean;
  pulo?: Pulo;
  news?: number;
  /** Quando faz sentido tentar de novo. */
  proxima: Date;
}

const HORA = 60 * 60 * 1000;

/**
 * A porta única de uma coleta do acompanhamento. O cron de hora em hora, a
 * rotina diária e o "Atualizar agora" passam todos por aqui — antes eram três
 * caminhos, e nenhum olhava o plano de quem é dono do perfil.
 *
 * 1. **Plano**: o dono precisa ter acompanhamento (Cão, Detetive, antigo ou
 *    Admin). Plano vencido para de coletar — sem apagar nada.
 * 2. **Cadência**: 72h no Cão, 24h no Detetive, medida da última coleta. O
 *    "Atualizar agora" (só onde o plano permite) antecipa, mas respeita o
 *    intervalo mínimo — e não acrescenta coleta: sai da mesma franquia.
 * 3. **Franquia**: a coleta é reservada antes de qualquer leitura. Esgotada,
 *    o perfil espera o ciclo novo. Falha sem entrega devolve a reserva.
 */
export async function coletarSeDevido(
  profileId: string,
  opcoes: { manual?: boolean } = {},
): Promise<Coleta> {
  const agora = new Date();
  const perfil = await prisma.trackedProfile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      username: true,
      userId: true,
      lastCollectedAt: true,
      user: { select: { id: true, email: true, plan: true, planEndsAt: true, planStartedAt: true } },
    },
  });
  if (!perfil) return { ok: false, pulo: "erro", proxima: new Date(agora.getTime() + 24 * HORA) };

  const dono = perfil.user;
  const { config, admin } = direitosDe(dono);
  if (!admin && config.maxProfiles <= 0) {
    return { ok: false, pulo: "sem_plano", proxima: new Date(agora.getTime() + 24 * HORA) };
  }

  const ultima = perfil.lastCollectedAt?.getTime() ?? 0;
  const passou = agora.getTime() - ultima;
  if (opcoes.manual) {
    if (config.atualizarAgoraHoras == null) {
      // Nunca coletado: a primeira coleta é a próxima volta do cron.
      const proxima = ultima ? new Date(ultima + config.cadenciaHoras * HORA) : agora;
      return { ok: false, pulo: "manual_nao", proxima };
    }
    if (passou < config.atualizarAgoraHoras * HORA) {
      return { ok: false, pulo: "cedo", proxima: new Date(ultima + config.atualizarAgoraHoras * HORA) };
    }
  } else if (passou < config.cadenciaHoras * HORA - HORA) {
    // Uma hora de folga: o cron roda de hora em hora, e sem folga a coleta de
    // "a cada 24h" escorregaria uma hora por dia.
    return { ok: false, pulo: "cedo", proxima: new Date(ultima + config.cadenciaHoras * HORA - HORA) };
  }

  const reserva = admin ? null : await reservar(dono, "coleta");
  if (reserva && !reserva.ok) {
    return { ok: false, pulo: "franquia", proxima: fimDoCiclo(dono, agora) ?? new Date(agora.getTime() + 24 * HORA) };
  }

  // Avaliações do "Me avise quando…": reservadas uma a uma, contra a franquia.
  const avaliar =
    admin || config.alertasEscritos > 0
      ? async (n: number) => {
          if (admin) return n;
          let cabem = 0;
          for (let i = 0; i < n; i++) {
            if (!(await reservar(dono, "alerta")).ok) break;
            cabem++;
          }
          return cabem;
        }
      : undefined;

  let r: WatchReport;
  try {
    r = await comQuem({ userId: dono.id, admin, motivo: opcoes.manual ? "coleta:manual" : "coleta" }, () =>
      watchProfile({ id: perfil.id, username: perfil.username, userId: dono.id }, "completo", { avaliar }),
    );
  } catch (e) {
    log.error("coleta falhou", { profileId, erro: (e as Error).message });
    r = { username: perfil.username, news: 0, skipped: "error" };
  }

  if (r.skipped) {
    if (reserva) await devolver(reserva);
    return {
      ok: false,
      pulo: r.skipped === "private" ? "privado" : "erro",
      proxima: new Date(agora.getTime() + (r.skipped === "private" ? 24 : 1) * HORA),
    };
  }
  return { ok: true, news: r.news, proxima: new Date(agora.getTime() + config.cadenciaHoras * HORA) };
}

/**
 * A rede de segurança diária: passa por todo perfil ativo e deixa a porta
 * única decidir. Quem não está no ponto (cadência, franquia, plano) é pulado
 * sem custo.
 */
export async function runFaroDaily(limit = 20): Promise<{ checked: number; news: number; reports: WatchReport[] }> {
  const profiles = await prisma.trackedProfile.findMany({
    where: {
      status: "ACTIVE",
      // Fake data (localhost) only ever touches the test accounts.
      ...(usingMockData() ? { user: { email: { endsWith: TEST_EMAIL_DOMAIN } } } : {}),
    },
    orderBy: [{ lastCollectedAt: { sort: "asc", nulls: "first" } }],
    take: limit,
    select: { id: true, username: true },
  });

  const reports: WatchReport[] = [];
  // A few at a time: quick enough, gentle on the provider's rate limit.
  for (let i = 0; i < profiles.length; i += 3) {
    const batch = await Promise.all(
      profiles.slice(i, i + 3).map(async (p) => {
        const c = await coletarSeDevido(p.id).catch(() => null);
        return { username: p.username, news: c?.news ?? 0, skipped: c?.ok ? undefined : c?.pulo ?? "erro" };
      }),
    );
    reports.push(...batch);
  }
  const news = reports.reduce((n, r) => n + r.news, 0);
  log.info("faro daily run", { checked: reports.length, news });
  return { checked: reports.length, news, reports };
}
