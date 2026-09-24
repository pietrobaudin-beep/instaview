import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { guardarPedido, lerPedido } from "@/lib/alerta-escrito";

export const dynamic = "force-dynamic";

/**
 * O "me avise quando…" de cada perfil.
 *
 * `GET` devolve o pedido guardado; `POST` grava (texto vazio desliga). O
 * pedido é por perfil e por dono — só quem acompanha aquele perfil escreve
 * o alerta dele.
 */
async function meuPerfil(userId: string, profileId: string) {
  return prisma.trackedProfile.findFirst({ where: { id: profileId, userId }, select: { id: true } });
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const profileId = new URL(req.url).searchParams.get("profileId") ?? "";
  if (!(await meuPerfil(user.id, profileId)))
    return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });

  return NextResponse.json({ texto: (await lerPedido(profileId)) ?? "" });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  if (user.plan === "FREE") return NextResponse.json({ error: "plano" }, { status: 402 });

  const corpo = (await req.json().catch(() => null)) as
    | { profileId?: string; texto?: string }
    | null;
  const profileId = corpo?.profileId ?? "";
  if (!(await meuPerfil(user.id, profileId)))
    return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });

  await guardarPedido(profileId, corpo?.texto ?? "");
  return NextResponse.json({ ok: true, texto: (corpo?.texto ?? "").trim().slice(0, 200) });
}
