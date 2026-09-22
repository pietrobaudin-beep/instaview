/**
 * Quantos perfis diferentes uma pessoa pode consultar, pelo plano dela.
 *
 * Enforced on the server, not in the UI — otherwise it would both be trivially
 * bypassed and, worse, still spend provider credits on every extra analysis.
 *
 * Identity is the signed-in user when there is one, and otherwise an anonymous
 * visitor id kept in a signed httpOnly cookie. A cookie can be cleared, so this
 * is a conversion funnel rather than a security boundary — which is the right
 * trade-off, since the alternative (fingerprinting or storing IPs) collects
 * personal data to enforce a paywall.
 */
import { cookies } from "next/headers";
import { createHmac, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type { User } from "@prisma/client";
import { planFor } from "@/lib/plans";

export const FREE_ANALYSIS_LIMIT = 1;

/**
 * O teto de consultas de quem está pedindo. Vem do plano; quem não tem conta
 * é tratado como Curioso.
 */
export function consultLimitFor(user: User | null): number {
  // O Curioso tem 1 farejo, com ou sem conta: criar conta não dá um perfil
  // novo, dá o direito de revelar uma informação do mesmo perfil.
  return planFor(user?.plan ?? "FREE").maxConsults;
}

/**
 * The limit only applies on the live site. On localhost the owner tests freely
 * — and the local build uses the mock provider, so there are no credits to
 * protect there anyway.
 */
export const FREE_LIMIT_ENFORCED = process.env.NODE_ENV === "production";

const VISITOR_COOKIE = "farejo_v";

function sign(value: string): string {
  const mac = createHmac("sha256", env.APP_SECRET).update(value).digest("hex").slice(0, 32);
  return `${value}.${mac}`;
}

function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  return sign(value) === signed ? value : null;
}

/**
 * The key this request's allowance is counted against. Issues a visitor cookie
 * when there is no session, so it must be called from a route handler.
 */
export function usageKey(user: User | null): string {
  if (user) return `u:${user.id}`;

  const jar = cookies();
  const existing = unsign(jar.get(VISITOR_COOKIE)?.value);
  if (existing) return `v:${existing}`;

  const id = randomBytes(16).toString("hex");
  jar.set(VISITOR_COOKIE, sign(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return `v:${id}`;
}

/**
 * The allowance key without issuing a cookie — safe to call while rendering a
 * page. Returns null for a visitor who has not been given one yet, which means
 * they have used nothing.
 */
export function peekUsageKey(user: User | null): string | null {
  if (user) return `u:${user.id}`;
  const existing = unsign(cookies().get(VISITOR_COOKIE)?.value);
  return existing ? `v:${existing}` : null;
}

export interface Allowance {
  /** False when this profile would exceed the free plan. */
  allowed: boolean;
  /** Profiles already analysed on this identity. */
  used: number;
  limit: number;
  /** True when this exact profile was already analysed (always allowed). */
  claimed: boolean;
  /** The profile the allowance was spent on, to offer a way back to it. */
  spentOn: string | null;
}

/** Começo do mês corrente — a janela do teto de quem assina. */
function inicioDoMes(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Se esta identidade pode consultar `username`, sem registrar nada.
 *
 * `limit` vem do plano (Curioso 1, Cão 3, Pro 10, Detetive 30).
 *
 * ## A janela é mensal (corrigido em 22/09)
 *
 * Isto contava **todas** as análises que a pessoa já tinha feito, sem filtro
 * de data. O teto era vitalício: um assinante PRO analisava 10 perfis — podia
 * ser na primeira semana — e **nunca mais conseguia analisar outro, mesmo
 * pagando todo mês**. Ele cancelaria, e com razão.
 *
 * Agora conta só o mês corrente. Duas consequências de propósito:
 *
 * - **Reabrir um @ já consultado continua grátis, para sempre.** A linha é
 *   única por (identidade, @) e `claimAnalysis` não mexe na data, então um
 *   perfil de meses atrás não volta a ocupar cota.
 * - **O Curioso segue com um farejo só**, porque para quem não paga o limite
 *   não é de fluxo, é de amostra — e um por mês seria um produto grátis
 *   diferente do que foi decidido.
 */
export async function checkAllowance(
  key: string,
  username: string,
  limit: number = FREE_ANALYSIS_LIMIT,
): Promise<Allowance> {
  if (!FREE_LIMIT_ENFORCED) {
    return { allowed: true, used: 0, limit, claimed: false, spentOn: null };
  }

  const [doMes, jaFeito, primeiro] = await Promise.all([
    prisma.analysisUsage.count({
      where: { key, createdAt: { gte: inicioDoMes() } },
    }),
    prisma.analysisUsage.findUnique({
      where: { key_username: { key, username } },
      select: { id: true },
    }),
    prisma.analysisUsage.findFirst({
      where: { key },
      orderBy: { createdAt: "asc" },
      select: { username: true },
    }),
  ]);

  const claimed = Boolean(jaFeito);
  return {
    allowed: claimed || doMes < limit,
    used: doMes,
    limit,
    claimed,
    spentOn: primeiro?.username ?? null,
  };
}

/**
 * Quantos perfis esta identidade consultou **neste mês** — é o número que a
 * tela mostra ao lado do teto do plano, e tem de contar a mesma coisa que
 * `checkAllowance`, senão o contador diz uma coisa e a porta faz outra.
 */
export async function consultsUsed(key: string | null): Promise<number> {
  if (!key) return 0;
  return prisma.analysisUsage.count({ where: { key, createdAt: { gte: inicioDoMes() } } });
}

/** Record that this identity spent its allowance on `username`. Idempotent. */
export async function claimAnalysis(key: string, username: string): Promise<void> {
  await prisma.analysisUsage.upsert({
    where: { key_username: { key, username } },
    create: { key, username },
    update: {},
  });
}
