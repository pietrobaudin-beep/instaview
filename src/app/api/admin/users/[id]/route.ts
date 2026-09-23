import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";
import { logger } from "@/lib/logger";

const log = logger.scope("api:admin");
const bodySchema = z.object({ plan: z.enum(["FREE", "WEEK", "PRO", "AGENCY"]) });

/** Change a user's plan. Admin only. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Plano inválido" }, { status: 400 });

  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { plan: parsed.data.plan },
    });
    log.info("plan changed by admin", { adminEmail: admin.email, target: user.email, plan: user.plan });
    return NextResponse.json({ id: user.id, email: user.email, plan: user.plan });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    // O "Faro de Cão" existe no schema mas o banco ainda não recebeu o valor:
    // sem o `prisma db push`, gravar WEEK explode aqui. Dizer isso é melhor do
    // que um "erro" genérico numa tela que parece quebrada.
    if (parsed.data.plan === "WEEK" && /enum|invalid input value/i.test(msg)) {
      return NextResponse.json(
        { error: "O plano semanal ainda não existe no banco. Rode o prisma db push." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Não deu para mudar o plano" }, { status: 404 });
  }
}

/**
 * Apagar a conta de alguém. Admin, e só com `?confirm=1`.
 *
 * Leva junto tudo que é dela (perfis no Faro AI, histórico, desbloqueios), por
 * causa do `onDelete: Cascade`. Não tem desfazer — por isso a tela pergunta
 * duas vezes e a rota exige a confirmação explícita.
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (new URL(req.url).searchParams.get("confirm") !== "1") {
    return NextResponse.json({ error: "Confirmação obrigatória" }, { status: 400 });
  }

  const alvo = await prisma.user.findUnique({ where: { id: params.id } });
  if (!alvo) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (alvo.id === admin.id) {
    return NextResponse.json({ error: "Você não pode apagar a própria conta" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  log.warn("user deleted by admin", { adminEmail: admin.email, target: alvo.email ?? alvo.phone });
  return NextResponse.json({ ok: true });
}
