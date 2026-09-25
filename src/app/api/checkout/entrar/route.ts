import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { COOKIE_COMPRA, lerFicha } from "@/lib/billing/cakto";
import { requestCode, verifyCode } from "@/lib/login-code/codes";
import { signInWithVerifiedTarget } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { maskTarget } from "@/lib/login-code/targets";

export const dynamic = "force-dynamic";

const corpo = z.union([
  z.object({ acao: z.literal("enviar") }),
  z.object({ acao: z.literal("verificar"), code: z.string().min(4).max(12) }),
]);

/**
 * Depois da compra sem conta: o código vai para o e-mail que PAGOU (o da
 * Cakto, gravado pelo webhook), e só o código abre a conta. Quem tem o cookie
 * da compra mas não o e-mail não entra — senão bastaria pagar com o e-mail de
 * outra pessoa para entrar na conta dela.
 */
export async function POST(req: Request) {
  const parsed = corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  const ficha = await lerFicha(cookies().get(COOKIE_COMPRA)?.value ?? "");
  const email = ficha?.pago ? ficha.email : null;
  if (!email || isAdminEmail(email)) {
    return NextResponse.json({ error: "Entre pela página de login." }, { status: 400 });
  }

  if (parsed.data.acao === "enviar") {
    const r = await requestCode("email", email);
    if (!r.ok) {
      const error =
        r.reason === "cooldown"
          ? `Espere ${"retryInSec" in r ? r.retryInSec : 60}s para pedir outro código.`
          : "Não conseguimos enviar o código agora. Tente de novo em instantes.";
      return NextResponse.json({ error }, { status: 429 });
    }
    return NextResponse.json({
      ok: true,
      sentTo: maskTarget("email", email),
      ...(r.devCode ? { devCode: r.devCode } : {}),
    });
  }

  const v = await verifyCode(email, parsed.data.code);
  if (!v.ok) {
    const error = {
      invalid: "Código errado. Confira e tente de novo.",
      expired: "Esse código expirou. Peça um novo.",
      locked: "Muitas tentativas. Peça um novo código.",
    }[v.reason];
    return NextResponse.json({ error }, { status: 400 });
  }
  await signInWithVerifiedTarget("email", email);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_COMPRA);
  return res;
}
