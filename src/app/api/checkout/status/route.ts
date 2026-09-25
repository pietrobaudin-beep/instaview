import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_COMPRA, lerFicha } from "@/lib/billing/cakto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * O pagamento já caiu? A tela de checkout pergunta a cada poucos segundos.
 * Só lê o banco — quem grava é o webhook da Cakto.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    // Compra sem conta: a ficha diz se o webhook já confirmou.
    const f = await lerFicha(cookies().get(COOKIE_COMPRA)?.value ?? "");
    return NextResponse.json({ pago: !!f?.pago, convidado: true });
  }
  const q = new URL(req.url).searchParams;
  const produto = q.get("produto");
  const agora = new Date();

  if (produto === "SINGLE") {
    const username = normalizeUsername(q.get("perfil") ?? "");
    if (!isValidUsername(username)) return NextResponse.json({ pago: false });
    const u = await prisma.profileUnlock.findUnique({
      where: { userId_username: { userId: user.id, username } },
      select: { createdAt: true, expiresAt: true },
    });
    return NextResponse.json({ pago: !!u && (!u.expiresAt || u.expiresAt > agora) });
  }
  if (produto === "FAREJADOR_MAIS" || produto === "CAO" || produto === "DETETIVE") {
    const vivo = user.plan === produto && (!user.planEndsAt || user.planEndsAt > agora);
    return NextResponse.json({ pago: vivo });
  }
  return NextResponse.json({ pago: false });
}
