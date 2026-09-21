import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { usageKey } from "@/lib/usage";
import { normalizeUsername } from "@/lib/utils";
import { OCULTOS, chaveOcultos } from "@/lib/pesquisados";

export const dynamic = "force-dynamic";

/**
 * Apagar um @ da lista de "Pesquisados".
 *
 * A lista é feita das consultas que a pessoa gastou (`analysis_usage`), e essa
 * tabela **é o caderno do limite do plano**. Apagar a linha devolveria a
 * consulta — bastaria apagar para farejar de graça outra vez. Então aqui o @ é
 * **escondido**, não apagado: a consulta continua contada, e a lista para de
 * mostrá-lo. Reabrir aquele @ continua não custando nada, como sempre foi.
 */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  const key = usageKey(user);

  const url = new URL(req.url);
  const tudo = url.searchParams.get("tudo") === "1";
  const username = normalizeUsername(url.searchParams.get("username") || "");
  if (!tudo && !username) return NextResponse.json({ error: "username" }, { status: 400 });

  const alvo = chaveOcultos(key);
  const atual = await prisma.sectionCache
    .findUnique({ where: { username_section: { username: alvo, section: OCULTOS } } })
    .catch(() => null);
  const lista = new Set<string>(((atual?.data as string[] | null) ?? []).filter(Boolean));

  if (tudo) {
    const todos = await prisma.analysisUsage.findMany({ where: { key }, select: { username: true } });
    for (const t of todos) lista.add(t.username);
  } else {
    lista.add(username);
  }

  const data = [...lista] as unknown as Prisma.InputJsonValue;
  await prisma.sectionCache.upsert({
    where: { username_section: { username: alvo, section: OCULTOS } },
    create: { username: alvo, section: OCULTOS, data },
    update: { data, fetchedAt: new Date() },
  });

  return NextResponse.json({ ok: true, ocultos: lista.size });
}
