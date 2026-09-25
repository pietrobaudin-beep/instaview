/**
 * Farejador comprado **sem escolher perfil**: vira 1 crédito de análise, que
 * a pessoa usa depois no @ que quiser (`/api/avulso/usar`).
 *
 * Dois contadores na franquia, sem ciclo (`new Date(0)`): `avulso_comprado`
 * (sobe a cada pagamento) e `avulso_usado` (sobe a cada uso, com teto =
 * comprados — atômico, dois toques não gastam dois créditos).
 * Idempotência do webhook: cada pedido credita uma vez só (marca no
 * `section_cache`).
 */
import { prisma } from "@/lib/db";
import { reservarBruto, usadosBruto } from "@/lib/franquia";
import { grantUnlock } from "@/lib/access";

const SEMPRE = new Date(0);

export async function creditarAvulso(userId: string, pedido: string): Promise<void> {
  const marca = await prisma.sectionCache
    .create({ data: { username: pedido, section: "cakto-credito", data: { userId } } })
    .catch(() => null);
  if (!marca) return; // já creditado (reenvio da Cakto)
  await reservarBruto(userId, "avulso_comprado", SEMPRE, Infinity);
}

export async function creditosAvulso(userId: string): Promise<number> {
  const [comprados, usados] = await Promise.all([
    usadosBruto(userId, "avulso_comprado", SEMPRE),
    usadosBruto(userId, "avulso_usado", SEMPRE),
  ]);
  return Math.max(0, comprados - usados);
}

/** Gasta 1 crédito. Reembolso usa o mesmo caminho para tirar um crédito não usado. */
export async function gastarCredito(userId: string): Promise<boolean> {
  const comprados = await usadosBruto(userId, "avulso_comprado", SEMPRE);
  const r = await reservarBruto(userId, "avulso_usado", SEMPRE, comprados);
  return r.ok;
}

export async function usarCredito(userId: string, username: string): Promise<"ok" | "ja_liberado" | "sem_credito"> {
  const atual = await prisma.profileUnlock.findUnique({
    where: { userId_username: { userId, username } },
    select: { expiresAt: true },
  });
  if (atual && (!atual.expiresAt || atual.expiresAt > new Date())) return "ja_liberado";
  if (!(await gastarCredito(userId))) return "sem_credito";
  await grantUnlock(userId, username, null);
  return "ok";
}
