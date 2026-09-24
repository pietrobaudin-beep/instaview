/**
 * Os stories que a pessoa marcou com a estrela — os favoritos.
 *
 * O Faro AI guarda os stories que encontra por um prazo que depende do plano
 * (3 dias no Cão, 7 no Detetive). Favoritar tira um story desse prazo: ele
 * fica guardado enquanto o plano estiver ativo.
 *
 * ## Vagas e espaço (24/09)
 *
 * Favorito ocupa vaga e armazenamento: Cão 5 favoritos e 10 MB de
 * miniaturas; Detetive 20 e 30 MB. Tirar a estrela libera os dois na hora.
 * Não é mais "tantos por mês": um teto por mês deixava a coleção crescer sem
 * fim, e cada miniatura guardada é espaço pago.
 *
 * Nada é copiado de novo ao marcar — a miniatura já está guardada. O que se
 * guarda aqui é só a lista de quais.
 */
import { prisma } from "@/lib/db";
import type { Prisma, User } from "@prisma/client";
import { direitosDe } from "@/lib/direitos";
import { imageKey } from "@/lib/img-store";
import type { EventData } from "@/lib/faro-watch";

const SECAO = "stories-salvos";

interface Guardado {
  ids: string[];
}

export async function lerSalvos(profileId: string): Promise<string[]> {
  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username: profileId, section: SECAO } } })
    .catch(() => null);
  const dados = row?.data as unknown as Guardado | undefined;
  return Array.isArray(dados?.ids) ? dados.ids : [];
}

export interface EstadoDaCota {
  usados: number;
  limite: number;
  restam: number;
  /** Megabytes de miniaturas ocupados pelos favoritos, e o teto. */
  mb: number;
  limiteMb: number;
}

/** Os favoritos de todos os perfis da conta, e quanto ocupam. */
async function favoritosDaConta(userId: string): Promise<{ ids: string[]; bytes: number }> {
  const perfis = await prisma.trackedProfile.findMany({ where: { userId }, select: { id: true } });
  const ids = (await Promise.all(perfis.map((p) => lerSalvos(p.id)))).flat();
  return { ids, bytes: await bytesDe(ids) };
}

/** O tamanho das miniaturas guardadas destes stories. */
async function bytesDe(storyIds: string[]): Promise<number> {
  if (!storyIds.length) return 0;
  const eventos = await prisma.profileEvent.findMany({
    where: { id: { in: storyIds } },
    select: { data: true },
  });
  const chaves = eventos
    .map((e) => (e.data as unknown as EventData)?.thumbnailUrl)
    .filter((u): u is string => !!u)
    .map((u) => {
      try {
        return imageKey(new URL(u));
      } catch {
        return null;
      }
    })
    .filter((k): k is string => !!k);
  if (!chaves.length) return 0;
  const linhas = await prisma.$queryRawUnsafe<{ n: bigint | number | null }[]>(
    `SELECT COALESCE(SUM(length(data->>'b64')), 0) AS n FROM section_cache WHERE section = 'img' AND username = ANY($1::text[])`,
    chaves,
  );
  // base64 ocupa 4/3 do arquivo.
  return Math.round((Number(linhas[0]?.n ?? 0) * 3) / 4);
}

type Conta = Pick<User, "id" | "email" | "plan" | "planEndsAt">;

function estado(user: Conta, usados: number, bytes: number): EstadoDaCota {
  const { config } = direitosDe(user);
  return {
    usados,
    limite: config.favoritos,
    restam: Math.max(0, config.favoritos - usados),
    mb: Math.round((bytes / 1_000_000) * 10) / 10,
    limiteMb: config.favoritosMB,
  };
}

/** Quanto das vagas de favorito já está ocupado — para a tela dizer antes de clicar. */
export async function cotaDoMes(user: Conta): Promise<EstadoDaCota> {
  const { ids, bytes } = await favoritosDaConta(user.id);
  return estado(user, ids.length, bytes);
}

export type ResultadoSalvar =
  | { ok: true; ids: string[]; cota: EstadoDaCota }
  | { ok: false; motivo: "sem_cota" | "sem_espaco"; ids: string[]; cota: EstadoDaCota };

/**
 * Marca ou desmarca um story. Idempotente: repetir o pedido não gasta vaga
 * nem duplica.
 */
export async function alternarSalvo(
  user: Conta,
  profileId: string,
  storyId: string,
  salvar: boolean,
): Promise<ResultadoSalvar> {
  const { config } = direitosDe(user);
  const atuais = await lerSalvos(profileId);
  const tem = atuais.includes(storyId);
  const conta = await favoritosDaConta(user.id);

  if (salvar === tem) return { ok: true, ids: atuais, cota: estado(user, conta.ids.length, conta.bytes) };

  if (salvar) {
    if (conta.ids.length >= config.favoritos) {
      return { ok: false, motivo: "sem_cota", ids: atuais, cota: estado(user, conta.ids.length, conta.bytes) };
    }
    const deste = await bytesDe([storyId]);
    if (conta.bytes + deste > config.favoritosMB * 1_000_000) {
      return { ok: false, motivo: "sem_espaco", ids: atuais, cota: estado(user, conta.ids.length, conta.bytes) };
    }
  }

  const ids = salvar ? [storyId, ...atuais] : atuais.filter((id) => id !== storyId);
  const data = { ids } as unknown as Prisma.InputJsonValue;
  await prisma.sectionCache
    .upsert({
      where: { username_section: { username: profileId, section: SECAO } },
      create: { username: profileId, section: SECAO, data },
      update: { data, fetchedAt: new Date() },
    })
    .catch(() => null);

  const depois = await favoritosDaConta(user.id);
  return { ok: true, ids, cota: estado(user, depois.ids.length, depois.bytes) };
}
