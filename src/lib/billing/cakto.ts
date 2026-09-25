/**
 * Cakto: o checkout brasileiro (PIX, cartão, boleto).
 *
 * Não usa a API da Cakto (OAuth): cada produto tem um **link de checkout**
 * criado no painel, e a Cakto avisa o pagamento por **webhook**.
 *
 * ## Variáveis (Vercel)
 * - `CAKTO_CHECKOUT_SINGLE`, `CAKTO_CHECKOUT_CAO`, `CAKTO_CHECKOUT_DETETIVE`
 *   (e `CAKTO_CHECKOUT_FAREJADOR_MAIS`, quando o semanal abrir): o link
 *   `https://pay.cakto.com.br/<oferta>` de cada oferta.
 * - `CAKTO_WEBHOOK_SECRET`: o segredo do webhook, do painel da Cakto.
 *
 * O plano sai da **oferta** paga (o id no fim do link), nunca de algo que o
 * navegador mande. Quem pagou sai do `callback` que o Farejo põe no link
 * (`?callback=`), com o e-mail do comprador como reserva.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Plan } from "@prisma/client";

export type Produto = "SINGLE" | "CAO" | "DETETIVE" | "FAREJADOR_MAIS";

const ENV: Record<Produto, string> = {
  SINGLE: "CAKTO_CHECKOUT_SINGLE",
  CAO: "CAKTO_CHECKOUT_CAO",
  DETETIVE: "CAKTO_CHECKOUT_DETETIVE",
  FAREJADOR_MAIS: "CAKTO_CHECKOUT_FAREJADOR_MAIS",
};

export function linkDe(p: Produto): string | null {
  const v = process.env[ENV[p]]?.trim();
  return v && /^https:\/\//.test(v) ? v : null;
}

/** O id da oferta é o último pedaço do link: pay.cakto.com.br/<id>. */
function ofertaDoLink(link: string): string | null {
  try {
    return new URL(link).pathname.split("/").filter(Boolean).pop() ?? null;
  } catch {
    return null;
  }
}

export function produtoDaOferta(oferta: string | null | undefined): Produto | null {
  if (!oferta) return null;
  for (const p of Object.keys(ENV) as Produto[]) {
    const link = linkDe(p);
    if (link && ofertaDoLink(link) === oferta) return p;
  }
  return null;
}

export const planoDoProduto = (p: Produto): Plan | null => (p === "SINGLE" ? null : p);

export function caktoConfigurado(): boolean {
  return !!process.env.CAKTO_WEBHOOK_SECRET?.trim();
}

/**
 * `u|<userId>` para plano, `s|<userId>|<@>` para o Farejador avulso.
 * Não é segredo: forjar só faria alguém pagar por outra pessoa.
 */
export function callbackDe(userId: string, username?: string): string {
  return username ? `s|${userId}|${username}` : `u|${userId}`;
}

export function lerCallback(v: unknown): { userId: string; username: string | null } | null {
  if (typeof v !== "string") return null;
  const [tipo, userId, username] = v.split("|");
  if (!userId) return null;
  if (tipo === "u") return { userId, username: null };
  if (tipo === "s" && username) return { userId, username };
  return null;
}

export function linkDeCheckout(p: Produto, opts: { userId: string; email?: string | null; username?: string }): string | null {
  const link = linkDe(p);
  if (!link) return null;
  const url = new URL(link);
  url.searchParams.set("callback", callbackDe(opts.userId, opts.username));
  if (opts.email) url.searchParams.set("email", opts.email);
  return url.toString();
}

const iguais = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * O webhook é mesmo da Cakto? Assinatura no cabeçalho (HMAC-SHA256 de
 * "<timestamp>.<corpo>", até 5 min de idade) quando vier; senão o `secret`
 * do corpo, comparado em tempo constante.
 */
export function webhookValido(raw: string, headers: Headers, corpo: { secret?: unknown }): boolean {
  const segredo = process.env.CAKTO_WEBHOOK_SECRET?.trim();
  if (!segredo) return false;
  const assinatura = headers.get("x-cakto-signature");
  const ts = headers.get("x-cakto-timestamp");
  if (assinatura && ts) {
    const idade = Math.abs(Date.now() / 1000 - Number(ts));
    if (!Number.isFinite(idade) || idade > 300) return false;
    const esperado = "v1=" + createHmac("sha256", segredo).update(`${ts}.${raw}`).digest("hex");
    return iguais(assinatura, esperado);
  }
  return typeof corpo.secret === "string" && iguais(corpo.secret, segredo);
}
