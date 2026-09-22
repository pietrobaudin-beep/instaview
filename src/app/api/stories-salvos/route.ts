import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { alternarSalvo } from "@/lib/stories-salvos";

export const dynamic = "force-dynamic";

/**
 * POST /api/stories-salvos — marca ou desmarca um story guardado.
 *
 * Corpo: `{ profileId, storyId, salvar: boolean }`.
 *
 * O `profileId` vem da tela, então é conferido aqui: sem esta checagem
 * qualquer pessoa logada poderia escrever na lista de um perfil que não é
 * dela, bastando adivinhar o id.
 *
 * Marcar tem consequência de verdade: o story marcado **não expira** com o
 * prazo do plano. Por isso a cota mensal é conferida no servidor, e não só
 * escondida na tela.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { profileId?: string; storyId?: string; salvar?: boolean }
    | null;

  const profileId = String(body?.profileId ?? "");
  const storyId = String(body?.storyId ?? "");
  if (!profileId || !storyId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const profile = await prisma.trackedProfile.findFirst({
    where: { id: profileId, userId: user.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // O story tem de ser mesmo deste perfil — senão a lista encheria de ids que
  // a tela nunca vai conseguir mostrar.
  const evento = await prisma.profileEvent.findFirst({
    where: { id: storyId, profileId, kind: "story" },
    select: { id: true },
  });
  if (!evento) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const r = await alternarSalvo(
    user.id,
    user.plan,
    profileId,
    storyId,
    body?.salvar !== false,
  );
  // A cota volta junto para a tela dizer quantos restam sem importar o módulo
  // do servidor (que carrega o Prisma).
  return NextResponse.json({ ok: r.ok, ids: r.ids, cota: r.cota });
}
