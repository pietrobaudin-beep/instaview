import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

const log = logger.scope("api:profiles");

/**
 * Limpar o histórico de um perfil, sem tirá-lo do Faro.
 *
 * Apaga as pistas, os eventos (posts, stories, marcações) e as fotografias da
 * lista de seguidos. O perfil continua sendo acompanhado, e a **próxima**
 * leitura vira a nova base: dali em diante só o que for novo aparece — do
 * mesmo jeito que aconteceu quando ele entrou no Faro.
 *
 * As miniaturas de story guardadas somem da tela junto, porque o que as
 * mostrava eram esses eventos.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
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

  const [eventos, pistas, fotos] = await prisma.$transaction([
    prisma.profileEvent.deleteMany({ where: { profileId: profile.id } }),
    prisma.followerChange.deleteMany({ where: { profileId: profile.id } }),
    prisma.followerSnapshot.deleteMany({ where: { profileId: profile.id } }),
  ]);

  log.info("histórico limpo", {
    username: profile.username,
    eventos: eventos.count,
    pistas: pistas.count,
    fotografias: fotos.count,
  });
  return NextResponse.json({ ok: true, eventos: eventos.count, pistas: pistas.count });
}
