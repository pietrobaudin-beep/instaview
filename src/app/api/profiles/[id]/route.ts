import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

const log = logger.scope("api:profiles");

/**
 * Tirar um perfil do Faro AI, de vez.
 *
 * Leva junto tudo o que era dele: pistas, eventos, fotografias da lista e o
 * agendamento. É o que o `onDelete: Cascade` faz. Não tem desfazer, então a
 * rota exige `?confirm=1` e a tela pergunta duas vezes.
 *
 * O que **não** é apagado: as cópias de imagem. Elas são compartilhadas — a
 * mesma foto serve para todo mundo que acompanha aquele perfil — e somem
 * sozinhas quando ninguém mais as pede.
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (new URL(req.url).searchParams.get("confirm") !== "1") {
    return NextResponse.json({ error: "Confirmação obrigatória" }, { status: 400 });
  }

  const profile = await prisma.trackedProfile.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, username: true },
  });
  if (!profile) return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });

  await prisma.trackedProfile.delete({ where: { id: profile.id } });
  log.info("perfil tirado do Faro AI", { username: profile.username });
  return NextResponse.json({ ok: true });
}
