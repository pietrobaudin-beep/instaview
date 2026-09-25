/**
 * Cakto: o checkout brasileiro (PIX, cartão, boleto).
 *
 * Não usa a API da Cakto (OAuth): cada produto tem um **link de checkout**
 * criado no painel, e a Cakto avisa o pagamento por **webhook**.
 *
 * ## Variáveis (Vercel)
 * - `CAKTO_CHECKOUT_SINGLE`, `CAKTO_CHECKOUT_FAREJADOR_MAIS`,
 *   `CAKTO_CHECKOUT_CAO`, `CAKTO_CHECKOUT_DETETIVE`: o link
 *   `https://pay.cakto.com.br/<oferta>_<checkout>` de cada produto.
 * - `CAKTO_WEBHOOK_SECRET`: o segredo do webhook, do painel da Cakto.
 *
 * O plano sai da **oferta** paga (o id no fim do link), nunca de algo que o
 * navegador mande. Quem pagou sai do `callback` que o Farejo põe no link
 * (`?callback=`), com o e-mail do comprador como reserva.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/db";

export type Produto = "SINGLE" | "CAO" | "DETETIVE" | "FAREJADOR_MAIS";

const ENV: Record<Produto, string> = {
  SINGLE: "CAKTO_CHECKOUT_SINGLE",
  CAO: "CAKTO_CHECKOUT_CAO",
  DETETIVE: "CAKTO_CHECKOUT_DETETIVE",
  FAREJADOR_MAIS: "CAKTO_CHECKOUT_FAREJADOR_MAIS",
};

export function linkDe(p: Produto): string | null {
  // Sem o segredo do webhook, ninguém é liberado depois de pagar: o checkout
  // só abre quando os dois existem.
  if (!process.env.CAKTO_WEBHOOK_SECRET?.trim()) return null;
  const v = process.env[ENV[p]]?.trim();
  return v && /^https:\/\//.test(v) ? v : null;
}

/**
 * Os ids que o link carrega. O link do painel é `pay.cakto.com.br/<oferta>_<checkout>`
 * (ex.: `mwyij2q_1138762`); o webhook manda `offer.id` = `mwyij2q`.
 */
function idsDoLink(link: string): string[] {
  try {
    const ultimo = new URL(link).pathname.split("/").filter(Boolean).pop() ?? "";
    return [ultimo, ultimo.split("_")[0]].filter(Boolean);
  } catch {
    return [];
  }
}

/** Qual produto foi pago: pela oferta, ou pelo link do checkout do evento. */
export function produtoDaOferta(oferta: string | null | undefined, checkoutUrl?: string | null): Produto | null {
  const candidatos = [oferta, ...(checkoutUrl ? idsDoLink(checkoutUrl) : [])].filter(Boolean) as string[];
  if (!candidatos.length) return null;
  for (const p of Object.keys(ENV) as Produto[]) {
    const link = linkDe(p);
    if (link && idsDoLink(link).some((id) => candidatos.includes(id))) return p;
  }
  return null;
}

export const planoDoProduto = (p: Produto): Plan | null => (p === "SINGLE" ? null : p);

export function caktoConfigurado(): boolean {
  return !!process.env.CAKTO_WEBHOOK_SECRET?.trim();
}

/**
 * Quem está comprando, no `callback`/`sck` do link:
 * - `u|<conta>` / `s|<conta>|<@>`: logado (plano / avulso);
 * - `g|<ficha>` / `g|<ficha>|<@>`: sem conta — a ficha é o cookie da compra, e
 *   a conta sai do e-mail digitado no checkout da Cakto.
 * Não é segredo: forjar só faria alguém pagar por outra pessoa.
 */
export function callbackDe(dono: { userId?: string; ficha?: string }, username?: string): string {
  if (dono.ficha) return username ? `g|${dono.ficha}|${username}` : `g|${dono.ficha}`;
  return username ? `s|${dono.userId}|${username}` : `u|${dono.userId}`;
}

export type Callback =
  | { userId: string; ficha?: undefined; username: string | null }
  | { ficha: string; userId?: undefined; username: string | null };

export function lerCallback(v: unknown): Callback | null {
  if (typeof v !== "string") return null;
  const [tipo, id, username] = v.split("|");
  if (!id) return null;
  if (tipo === "u") return { userId: id, username: null };
  if (tipo === "s" && username) return { userId: id, username };
  if (tipo === "g") return { ficha: id, username: username || null };
  return null;
}

export function linkDeCheckout(
  p: Produto,
  opts: { userId?: string; ficha?: string; email?: string | null; username?: string },
): string | null {
  const link = linkDe(p);
  if (!link) return null;
  if (!opts.userId && !opts.ficha) return link;
  const url = new URL(link);
  // `callback` pela documentação; `sck` é o que aparece no modelo do webhook
  // do painel. Os dois levam o mesmo valor, e o webhook lê o que vier.
  const cb = callbackDe(opts, opts.username);
  url.searchParams.set("callback", cb);
  url.searchParams.set("sck", cb);
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

/**
 * O @ que a pessoa estava comprando no avulso, anotado quando ela toca em
 * pagar. É a reserva para quando o webhook não devolve o `sck`/`callback`:
 * aí só vem o e-mail, e o e-mail diz quem é, não qual perfil.
 *
 * Mora no `section_cache` (chave @ + `cakto-pendente:<conta>`) para não
 * precisar de tabela nova.
 */
const PENDENTE = (userId: string) => `cakto-pendente:${userId}`;

export async function anotarAvulso(userId: string, username: string): Promise<void> {
  await prisma.sectionCache
    .upsert({
      where: { username_section: { username, section: PENDENTE(userId) } },
      create: { username, section: PENDENTE(userId), data: {} },
      update: { fetchedAt: new Date() },
    })
    .catch(() => null);
}

/** O último @ anotado nas últimas 48h. */
export async function avulsoAnotado(userId: string): Promise<string | null> {
  const row = await prisma.sectionCache
    .findFirst({ where: { section: PENDENTE(userId) }, orderBy: { fetchedAt: "desc" } })
    .catch(() => null);
  if (!row || Date.now() - row.fetchedAt.getTime() > 48 * 60 * 60 * 1000) return null;
  return row.username;
}

/**
 * Compra sem conta: a ficha (cookie `farejo_compra`) guarda o que está sendo
 * comprado e, quando o webhook confirma, o e-mail de quem pagou — para a tela
 * mandar o código de entrada para ele.
 */
export const COOKIE_COMPRA = "farejo_compra";
const FICHA = "cakto-convidado";

export interface Ficha {
  produto: Produto;
  perfil: string | null;
  email?: string;
  pago?: boolean;
}

export async function anotarFicha(ficha: string, f: Ficha): Promise<void> {
  const data = f as unknown as object;
  await prisma.sectionCache
    .upsert({
      where: { username_section: { username: ficha, section: FICHA } },
      create: { username: ficha, section: FICHA, data },
      update: { data, fetchedAt: new Date() },
    })
    .catch(() => null);
}

export async function lerFicha(ficha: string): Promise<Ficha | null> {
  if (!/^[a-f0-9]{32}$/.test(ficha)) return null;
  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username: ficha, section: FICHA } } })
    .catch(() => null);
  if (!row || Date.now() - row.fetchedAt.getTime() > 7 * 24 * 60 * 60 * 1000) return null;
  return row.data as unknown as Ficha;
}
