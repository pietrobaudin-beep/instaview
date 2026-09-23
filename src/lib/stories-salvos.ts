/**
 * Os stories que a pessoa marcou para não perder de vista.
 *
 * O Faro AI já guarda **todos** os stories que encontra, enquanto o perfil estiver
 * nele. Isto é outra coisa: dentro desse monte, quais importam. Depois de umas
 * semanas de acompanhamento são dezenas de miniaturas, e a que interessava
 * fica enterrada.
 *
 * Nada é copiado de novo ao marcar — a miniatura já está guardada. O que se
 * guarda aqui é só a lista de quais.
 *
 * ## A cota do mês
 *
 * Quantos podem ser salvos por mês vem do plano (`storiesSalvosMes`). Duas
 * regras que valem entender, porque definem o que a pessoa está comprando:
 *
 * - **Conta só o que entra no mês.** O que já foi salvo fica para sempre e não
 *   ocupa a cota seguinte: a coleção cresce mês a mês, e quem fica ganha.
 * - **Desmarcar no mesmo mês devolve o crédito.** Sem isso, um toque errado
 *   custaria um salvamento pago — e a estrela viraria um botão com medo.
 *
 * Tudo em `section_cache`, sem tabela nova. A lista por perfil usa o
 * `profileId` como chave (que já pertence a um dono); a cota é por **usuário**,
 * porque é o usuário quem assina.
 */
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { planFor } from "@/lib/plans";
import type { Plan } from "@prisma/client";

const SECAO = "stories-salvos";
const SECAO_COTA = "stories-salvos-cota";

/** O mês corrente, como "2026-09" — é por ele que a cota vira. */
function mesAtual(): string {
  const agora = new Date();
  return `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface Guardado {
  ids: string[];
}

/** Os ids salvos **neste mês**, para saber o que devolve crédito. */
interface Cota {
  mes: string;
  ids: string[];
}

export async function lerSalvos(profileId: string): Promise<string[]> {
  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username: profileId, section: SECAO } } })
    .catch(() => null);
  const dados = row?.data as unknown as Guardado | undefined;
  return Array.isArray(dados?.ids) ? dados.ids : [];
}

async function lerCota(userId: string): Promise<Cota> {
  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username: `u:${userId}`, section: SECAO_COTA } } })
    .catch(() => null);
  const dados = row?.data as unknown as Cota | undefined;
  // Mês diferente = cota zerada. Não há faxina a fazer: a linha é reescrita no
  // primeiro salvamento do mês novo.
  if (!dados || dados.mes !== mesAtual()) return { mes: mesAtual(), ids: [] };
  return { mes: dados.mes, ids: Array.isArray(dados.ids) ? dados.ids : [] };
}

async function gravarCota(userId: string, cota: Cota): Promise<void> {
  const data = cota as unknown as Prisma.InputJsonValue;
  await prisma.sectionCache
    .upsert({
      where: { username_section: { username: `u:${userId}`, section: SECAO_COTA } },
      create: { username: `u:${userId}`, section: SECAO_COTA, data },
      update: { data, fetchedAt: new Date() },
    })
    .catch(() => null);
}

export interface EstadoDaCota {
  usados: number;
  limite: number;
  restam: number;
}

/** Quanto desta cota mensal já foi gasto — para a tela dizer antes de clicar. */
export async function cotaDoMes(userId: string, plan: Plan): Promise<EstadoDaCota> {
  const limite = planFor(plan).storiesSalvosMes;
  const cota = await lerCota(userId);
  return { usados: cota.ids.length, limite, restam: Math.max(0, limite - cota.ids.length) };
}

export type ResultadoSalvar =
  | { ok: true; ids: string[]; cota: EstadoDaCota }
  | { ok: false; motivo: "sem_cota"; ids: string[]; cota: EstadoDaCota };

/**
 * Marca ou desmarca um story. Devolve a lista nova e o estado da cota.
 *
 * Idempotente: marcar o que já estava marcado não gasta cota nem duplica, e
 * desmarcar o que não estava não quebra — a tela pode repetir o pedido sem
 * medo.
 */
export async function alternarSalvo(
  userId: string,
  plan: Plan,
  profileId: string,
  storyId: string,
  salvar: boolean,
): Promise<ResultadoSalvar> {
  const limite = planFor(plan).storiesSalvosMes;
  const atuais = await lerSalvos(profileId);
  const cota = await lerCota(userId);
  const tem = atuais.includes(storyId);

  const estado = (c: Cota): EstadoDaCota => ({
    usados: c.ids.length,
    limite,
    restam: Math.max(0, limite - c.ids.length),
  });

  // Nada a fazer: já está como se pediu.
  if (salvar === tem) return { ok: true, ids: atuais, cota: estado(cota) };

  if (salvar) {
    // Um story salvo em mês anterior e desmarcado agora pode voltar sem
    // gastar de novo? Não: ele saiu da coleção. Entrar é sempre entrar.
    if (cota.ids.length >= limite) {
      return { ok: false, motivo: "sem_cota", ids: atuais, cota: estado(cota) };
    }
    cota.ids = [storyId, ...cota.ids];
  } else {
    // Devolve o crédito só se foi salvo NESTE mês; de meses passados não há
    // crédito para devolver.
    cota.ids = cota.ids.filter((id) => id !== storyId);
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

  await gravarCota(userId, cota);

  return { ok: true, ids, cota: estado(cota) };
}
