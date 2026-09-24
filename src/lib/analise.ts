/**
 * A análise completa de um perfil: coletada UMA vez, guardada, reaberta daqui.
 *
 * ## O que muda em relação a antes
 *
 * Antes cada pedaço da tela buscava o seu, com o cache compartilhado na frente.
 * Vencido o cache, reabrir um perfil já analisado voltava ao provedor — sem
 * gastar a análise do cliente, mas gastando dinheiro da empresa. E o cache da
 * lista de "seguindo" morava na memória de uma instância da Vercel, que
 * esquece a cada chamada fria.
 *
 * Agora a análise é um pacote: as leituras são feitas juntas, no momento em
 * que a análise é consumida, e o resultado vai para `SavedAnalysis`. Reabrir
 * lê o pacote — mesmo que o cache compartilhado tenha vencido.
 *
 * ## O pacote (≈ 6 leituras, menos as que o cache compartilhado já tem)
 *
 * 1. cartão do perfil       — `getProfileCached`
 * 2. uma página de seguindo — amostra de até 50 contas, não a lista inteira
 * 3. posts recentes         — de onde sai o ranking de interações
 * 4. stories disponíveis
 * 5. marcações
 * 6. sobre a conta
 *
 * Mais o id do perfil, que a HikerAPI precisa e que fica guardado por 24h.
 * Outras redes NÃO entram: são sob demanda, com franquia própria.
 */
import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { ProviderError, type FollowerEntry, type ProfileData } from "@/lib/providers/types";
import { getProfileCached } from "@/lib/profile-cache";
import { getRecentMediaCached } from "@/lib/media-cache";
import { rankInteractions, type Interaction } from "@/lib/interactions";
import { getSection, type SectionData } from "@/lib/raio-x";
import { guessGender } from "@/lib/gender";
import { quemSao } from "@/lib/classificacao-ia";
import { logger } from "@/lib/logger";

const log = logger.scope("analise");

export type Origem = "plano" | "avulso" | "revelacao" | "admin" | "legado";

export interface PessoaClassificada extends FollowerEntry {
  gender: "f" | "m" | "u";
}

export interface SeguindoSalvo {
  /** Até 12 contas da amostra, com a classificação estimada. */
  following: PessoaClassificada[];
  counts: {
    girls: number;
    boys: number;
    brands: number;
    total: number;
    percent: { girls: number; boys: number; brands: number };
  } | null;
  /** A conta fechou a lista de quem segue. */
  seguindoOculto: boolean;
  private: boolean;
  real: boolean;
}

export interface AnaliseSalva {
  origem: Origem;
  /** O cartão como estava na coleta — reabrir não relê o perfil. */
  perfil?: ProfileData;
  seguindo?: SeguindoSalvo;
  interacoes?: Interaction[];
  /** Stories, marcações e sobre, como o provedor entregou. */
  secoes?: Partial<Record<"stories" | "tagged" | "about", SectionData | null>>;
  /** Curioso com conta: só o destaque, ou `null` quando não há dado. */
  destaque?: Interaction | null;
}

export interface Salva {
  data: AnaliseSalva;
  collectedAt: Date;
  expiresAt: Date | null;
}

/** A análise guardada desta conta para este @, se ainda vale. */
export async function lerSalva(userId: string, username: string): Promise<Salva | null> {
  const row = await prisma.savedAnalysis.findUnique({
    where: { userId_username: { userId, username } },
  });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt <= new Date()) return null;
  return { data: row.data as unknown as AnaliseSalva, collectedAt: row.collectedAt, expiresAt: row.expiresAt };
}

/** Existe, vencida ou não — para a tela dizer "seu acesso a esta análise acabou". */
export async function salvaVencida(userId: string, username: string): Promise<Date | null> {
  const row = await prisma.savedAnalysis.findUnique({
    where: { userId_username: { userId, username } },
    select: { expiresAt: true },
  });
  return row?.expiresAt && row.expiresAt <= new Date() ? row.expiresAt : null;
}

export async function guardar(
  user: Pick<User, "id">,
  username: string,
  data: AnaliseSalva,
  expiresAt: Date | null,
): Promise<Salva> {
  const json = data as unknown as Prisma.InputJsonValue;
  const row = await prisma.savedAnalysis.upsert({
    where: { userId_username: { userId: user.id, username } },
    create: { userId: user.id, username, data: json, expiresAt },
    update: { data: json, expiresAt, collectedAt: new Date() },
  });
  return { data, collectedAt: row.collectedAt, expiresAt: row.expiresAt };
}

/** Uma página de seguindo, classificada. É a parte que usa IA. */
async function coletarSeguindo(username: string): Promise<SeguindoSalvo> {
  let all: FollowerEntry[] = [];
  let brands = 0;
  let isPrivate = false;
  let seguindoOculto = false;
  try {
    const result = await getProvider().getFollowing(username, { maxPages: 1, pageSize: 50 });
    brands = result.followers.filter((u) => u.isVerified).length;
    all = result.followers.filter((u) => !u.isVerified);
  } catch (e) {
    if (e instanceof ProviderError && e.code === "PRIVATE") isPrivate = true;
    else if (e instanceof ProviderError && e.code === "HIDDEN") seguindoOculto = true;
    else throw e;
  }

  // A IA é perguntada só sobre quem o palpite pelo primeiro nome não resolve
  // (medido em 23/09: onde o palpite tem convicção, os dois concordam 22 de 23).
  const duvidosos = all.filter((u) => guessGender(u.displayName, u.username) === "u");
  const lidos = await quemSao(duvidosos.map((u) => ({ username: u.username, displayName: u.displayName })));
  const quemEh = (u: FollowerEntry): "f" | "m" | "u" => {
    const ia = lidos.get(u.username.toLowerCase());
    if (ia === "marca") return "u";
    if (ia === "f" || ia === "m") return ia;
    return guessGender(u.displayName, u.username);
  };
  let marcasIA = 0;
  const g = { girls: 0, boys: 0 };
  for (const u of all) {
    if (lidos.get(u.username.toLowerCase()) === "marca") marcasIA++;
    const q = quemEh(u);
    if (q === "f") g.girls++;
    else if (q === "m") g.boys++;
  }
  const total = all.length + brands;
  const marcas = brands + marcasIA;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return {
    following: all.slice(0, 12).map((u) => ({ ...u, gender: quemEh(u) })),
    counts:
      total > 0
        ? { ...g, brands: marcas, total, percent: { girls: pct(g.girls), boys: pct(g.boys), brands: pct(marcas) } }
        : null,
    seguindoOculto,
    private: isPrivate,
    real: all.length > 0,
  };
}

/** O ranking de interações a partir dos posts recentes. */
async function coletarInteracoes(username: string): Promise<Interaction[]> {
  const posts = await getRecentMediaCached(username);
  return rankInteractions(posts, username, 60)
    .filter((i) => !i.isVerified)
    .slice(0, 10);
}

async function secao(username: string, s: "stories" | "tagged" | "about"): Promise<SectionData | null> {
  const r = await getSection(username, s);
  return r.status === "ok" ? r.data : null;
}

export type Resultado =
  | { ok: true; data: AnaliseSalva }
  | { ok: false; motivo: "nao_encontrado" | "privado" | "indisponivel" };

/**
 * Faz as leituras do pacote. Não grava nada e não consome franquia: quem
 * chama reserva antes e devolve se isto não entregar.
 *
 * "Entregou" = o perfil existe e pelo menos um pedaço veio. Conta privada
 * volta como `privado`: pagar não contorna a privacidade, e a análise não é
 * cobrada do cliente.
 */
export async function coletarAnalise(username: string, origem: Origem): Promise<Resultado> {
  let perfil: ProfileData;
  try {
    perfil = (await getProfileCached(username)).profile;
    if (perfil.isPrivate) return { ok: false, motivo: "privado" };
  } catch (e) {
    if (e instanceof ProviderError && e.code === "NOT_FOUND") return { ok: false, motivo: "nao_encontrado" };
    log.warn("cartão falhou", { username, erro: (e as Error).message });
    return { ok: false, motivo: "indisponivel" };
  }

  const [seguindo, interacoes, stories, tagged, about] = await Promise.allSettled([
    coletarSeguindo(username),
    coletarInteracoes(username),
    secao(username, "stories"),
    secao(username, "tagged"),
    secao(username, "about"),
  ]);
  const valor = <T>(r: PromiseSettledResult<T>): T | undefined =>
    r.status === "fulfilled" ? r.value : undefined;

  const data: AnaliseSalva = {
    origem,
    perfil,
    seguindo: valor(seguindo),
    interacoes: valor(interacoes),
    secoes: { stories: valor(stories) ?? null, tagged: valor(tagged) ?? null, about: valor(about) ?? null },
  };

  const algo = data.seguindo || data.interacoes?.length || stories.status === "fulfilled";
  if (!algo) return { ok: false, motivo: "indisponivel" };
  return { ok: true, data };
}

/**
 * O destaque do Curioso com conta: só a conta que mais aparece nas
 * interações. Uma leitura (posts recentes). `null` = sem dado suficiente —
 * e aí a revelação não é gasta.
 */
export async function coletarDestaque(username: string): Promise<Interaction | null | "privado"> {
  try {
    const { profile } = await getProfileCached(username);
    if (profile.isPrivate) return "privado";
  } catch {
    return null;
  }
  const lista = await coletarInteracoes(username).catch(() => []);
  // Um sinal só é pouco para chamar de "quem mais aparece".
  const primeiro = lista[0];
  return primeiro && primeiro.count >= 2 ? primeiro : null;
}
