import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { creditosAvulso, usarCredito } from "@/lib/avulso-credito";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Usa 1 crédito de Farejador neste @: libera o perfil como se tivesse sido comprado para ele. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const username = normalizeUsername(String(b?.username ?? ""));
  if (!isValidUsername(username)) return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });

  const r = await usarCredito(user.id, username);
  if (r === "sem_credito") return NextResponse.json({ error: "Você não tem análise avulsa disponível." }, { status: 402 });
  return NextResponse.json({ ok: true, restam: await creditosAvulso(user.id) });
}

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ creditos: user ? await creditosAvulso(user.id) : 0 });
}
