import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { coletarDestaque, guardar, lerSalva } from "@/lib/analise";
import { comQuem } from "@/lib/custo";
import { direitosDe } from "@/lib/direitos";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/revelacao — o benefício do Curioso com conta.
 *
 * Revela **quem mais aparece nas interações** de um perfil. Uma por conta, no
 * perfil que a pessoa já estava vendo quando criou a conta. Não é análise
 * completa, e não se renova a cada busca.
 *
 * - Reabrir a revelação já feita não gasta nada (lê o que foi salvo).
 * - Sem dado suficiente, a tela diz isso e o benefício **não** é gasto —
 *   inventar um destaque seria pior do que não ter.
 * - A trava é atômica: duas abas pedindo em perfis diferentes, só uma leva.
 *
 * Custo: uma leitura (posts recentes), mais o cartão se não estiver em cache.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { username?: string } | null;
  const username = normalizeUsername(body?.username ?? "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const d = direitosDe(user);
  // Quem tem plano ou é Admin usa a análise, não a revelação.
  if (d.admin || d.plano !== "FREE") return NextResponse.json({ error: "tem_plano" }, { status: 400 });

  const salva = await lerSalva(user.id, username);
  if (salva?.data.origem === "revelacao") {
    return NextResponse.json({ ok: true, destaque: salva.data.destaque ?? null });
  }

  // Marca o @ antes de ler: se outra aba já marcou outro, esta não passa.
  const marcou = await prisma.user.updateMany({
    where: { id: user.id, OR: [{ revelacaoUsername: null }, { revelacaoUsername: username }] },
    data: { revelacaoUsername: username },
  });
  if (marcou.count === 0) {
    const atual = await prisma.user.findUnique({ where: { id: user.id }, select: { revelacaoUsername: true } });
    return NextResponse.json(
      { ok: false, motivo: "ja_usada", em: atual?.revelacaoUsername ?? null },
      { status: 402 },
    );
  }

  const destaque = await comQuem({ userId: user.id, motivo: "revelacao" }, () => coletarDestaque(username));
  if (destaque === null || destaque === "privado") {
    // Não entregou: o benefício volta a estar livre.
    await prisma.user.updateMany({
      where: { id: user.id, revelacaoUsername: username },
      data: { revelacaoUsername: null },
    });
    return NextResponse.json({ ok: false, motivo: destaque === "privado" ? "privado" : "sem_dados" });
  }

  await guardar(user, username, { origem: "revelacao", destaque }, null);
  return NextResponse.json({ ok: true, destaque });
}
