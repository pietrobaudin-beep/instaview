import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { COOKIE_COMPRA, anotarFicha } from "@/lib/billing/cakto";
import { PRODUTO_DA_CHAVE } from "@/lib/billing/checkout-planos";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Compra sem conta: dá uma ficha nova (cookie) e volta para /checkout.
 * A página não pode gravar cookie; este caminho existe só para isso.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const chave = url.searchParams.get("plano") ?? "";
  const produto = PRODUTO_DA_CHAVE[chave];
  if (!produto) return NextResponse.redirect(new URL("/pricing", url));
  const lido = normalizeUsername(url.searchParams.get("perfil") ?? "");
  const perfil = produto === "SINGLE" && isValidUsername(lido) ? lido : null;

  const ficha = randomBytes(16).toString("hex");
  await anotarFicha(ficha, { produto, perfil });

  const volta = new URL("/checkout", url);
  volta.searchParams.set("plano", chave);
  if (perfil) volta.searchParams.set("perfil", perfil);
  const res = NextResponse.redirect(volta);
  res.cookies.set(COOKIE_COMPRA, ficha, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
