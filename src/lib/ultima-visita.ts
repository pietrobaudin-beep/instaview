/**
 * "O que mudou desde a sua última visita."
 *
 * O Farejo já sabia dizer o que mudou **desde a última leitura do Faro AI** —
 * mas isso é o relógio do robô, não o de quem está olhando. Quem passou uma
 * semana fora não quer saber das últimas 24 horas: quer saber da semana.
 *
 * Aqui fica a outra metade: quando ESTA pessoa abriu ESTE perfil pela última
 * vez, e o que aconteceu no meio do caminho.
 *
 * Guardado em `section_cache`, uma linha por pessoa — todos os perfis que ela
 * acompanha cabem no mesmo JSON, o que evita uma linha por par.
 */
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const SECAO = "visita";

/**
 * Abaixo disto a visita não conta como "nova".
 *
 * Sem isso, atualizar a página zeraria o resumo e a pessoa perderia o que
 * tinha acabado de ver — o caso mais comum de todos: abrir, fechar, reabrir.
 */
const JANELA_MS = 30 * 60 * 1000;

type Registro = Record<string, number>;

async function ler(chave: string): Promise<Registro> {
  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username: chave, section: SECAO } } })
    .catch(() => null);
  return ((row?.data as unknown as Registro) ?? {}) as Registro;
}

/**
 * Quando esta pessoa viu este perfil pela última vez, e marca a visita de
 * agora. Devolve `null` na primeira vez — aí não há "desde quando".
 *
 * A marcação acontece na mesma ida, de propósito: a tela que pergunta é a
 * mesma que está sendo aberta.
 */
export async function visitar(chave: string | null, username: string): Promise<Date | null> {
  if (!chave) return null;

  const registro = await ler(chave);
  const anterior = registro[username];
  const agora = Date.now();

  // Reabrir em seguida não é visita nova: o que ela viu há dez minutos
  // continua sendo o que ela viu.
  if (!anterior || agora - anterior > JANELA_MS) {
    const data = { ...registro, [username]: agora } as unknown as Prisma.InputJsonValue;
    await prisma.sectionCache
      .upsert({
        where: { username_section: { username: chave, section: SECAO } },
        create: { username: chave, section: SECAO, data },
        update: { data, fetchedAt: new Date() },
      })
      .catch(() => null);
  }

  return anterior ? new Date(anterior) : null;
}

export interface Novidade {
  /** O que aconteceu, em uma linha. */
  texto: string;
  /** Quantos — para a tela poder destacar o número. */
  quantos: number;
  /** Para onde a linha leva: a aba do painel que mostra a prova. */
  ancora?: string;
}

export interface ResumoDaVisita {
  desde: string;
  novidades: Novidade[];
}

/**
 * O que mudou entre duas datas, contado do banco.
 *
 * Nenhuma linha daqui é opinião: cada número é uma contagem de registros que
 * a pessoa pode abrir e conferir. É a regra da casa — toda conclusão mostra
 * de onde veio.
 */
export async function oQueMudou(
  profileId: string,
  desde: Date,
  kindsDePista: string[],
): Promise<Novidade[]> {
  const [eventos, pistas, snaps] = await Promise.all([
    prisma.profileEvent.groupBy({
      by: ["kind"],
      where: { profileId, baseline: false, detectedAt: { gt: desde } },
      _count: { _all: true },
    }),
    prisma.followerChange.groupBy({
      by: ["type"],
      where: {
        profileId,
        kind: { in: kindsDePista },
        isVerified: false,
        detectedAt: { gt: desde },
      },
      _count: { _all: true },
    }),
    // Duas leituras bastam para saber se a bio ou o cadeado mudaram: a de
    // antes da visita e a mais recente.
    prisma.followerSnapshot.findMany({
      where: { profileId, status: "SUCCESS" },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { startedAt: true, bio: true, isPrivate: true },
    }),
  ]);

  const fora: Novidade[] = [];
  const conta = (k: string) => eventos.find((e) => e.kind === k)?._count._all ?? 0;
  const um = (n: number, singular: string, plural: string) =>
    n === 1 ? singular : plural.replace("#", String(n));

  const posts = conta("post");
  if (posts) fora.push({ texto: um(posts, "1 post novo", "# posts novos"), quantos: posts });

  const stories = conta("story");
  if (stories)
    fora.push({ texto: um(stories, "1 story novo", "# stories novos"), quantos: stories, ancora: "stories" });

  const marcacoes = conta("tagged");
  if (marcacoes)
    fora.push({ texto: um(marcacoes, "1 marcação nova", "# marcações novas"), quantos: marcacoes });

  const seguiu = pistas.find((p) => p.type === "FOLLOW")?._count._all ?? 0;
  if (seguiu)
    fora.push({ texto: um(seguiu, "1 conta nova seguida", "# contas novas seguidas"), quantos: seguiu, ancora: "pistas" });

  const parou = pistas.find((p) => p.type === "UNFOLLOW")?._count._all ?? 0;
  if (parou)
    fora.push({ texto: um(parou, "1 deixou de seguir", "# deixaram de seguir"), quantos: parou, ancora: "pistas" });

  // A bio: comparar a leitura mais nova com a última anterior à visita.
  const antes = snaps.find((s) => s.startedAt <= desde);
  const agora = snaps[0];
  if (antes && agora) {
    if ((antes.bio ?? "") !== (agora.bio ?? "") && (antes.bio || agora.bio)) {
      fora.push({ texto: "a bio mudou", quantos: 1, ancora: "bio" });
    }
    if (!antes.isPrivate && agora.isPrivate) fora.push({ texto: "a conta ficou privada", quantos: 1 });
    if (antes.isPrivate && !agora.isPrivate) fora.push({ texto: "a conta voltou a ser pública", quantos: 1 });
  }

  return fora;
}
