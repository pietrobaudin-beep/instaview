import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { acessoA } from "@/lib/access";
import { direitosDe } from "@/lib/direitos";
import { coletarCurtidas, type AnaliseSalva } from "@/lib/analise";
import { devolver, reservarBruto } from "@/lib/franquia";
import { comQuem } from "@/lib/custo";

export const dynamic = "force-dynamic";

/**
 * "Ver o que @x curtiu": sob demanda, uma vez por análise.
 *
 * Só quem tem a análise paga deste perfil. A trava é a franquia
 * `curtidas:<@>` com teto 1 e ciclo = data da coleta — atômica, então dois
 * toques ao mesmo tempo não pagam duas vezes, e uma análise nova libera de novo.
 * O resultado vai para a análise salva: reabrir não paga.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = normalizeUsername(String(body?.username ?? ""));
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const acesso = await acessoA(user, username);
  const salva = acesso.salva;
  if (acesso.access === "free" || !salva || salva.data.origem === "revelacao") {
    return NextResponse.json({ error: "locked" }, { status: 403 });
  }
  if (salva.data.curtidas !== undefined) return NextResponse.json({ curtidas: salva.data.curtidas });
  const d = direitosDe(user);
  if (!d.admin && !d.config.verCurtidas) return NextResponse.json({ error: "plano" }, { status: 403 });

  const alvo = salva.data.interacoes?.[0];
  if (!alvo) return NextResponse.json({ curtidas: null, semAlvo: true });

  const reserva = await reservarBruto(user.id, `curtidas:${username}`, salva.collectedAt, 1);
  if (!reserva.ok) {
    // Outro toque já está conferindo (ou conferiu): devolve o que houver.
    const atual = await acessoA(user, username);
    return NextResponse.json({ curtidas: atual.salva?.data.curtidas ?? null, emAndamento: true });
  }

  const curtidas = await comQuem({ userId: user.id, admin: d.admin, motivo: "curtidas" }, () =>
    coletarCurtidas(username, alvo),
  ).catch(() => null);
  if (!curtidas) {
    await devolver(reserva);
    return NextResponse.json({ error: "indisponivel" }, { status: 503 });
  }

  const data: AnaliseSalva = { ...salva.data, curtidas };
  await prisma.savedAnalysis.update({
    where: { userId_username: { userId: user.id, username } },
    data: { data: data as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json({ curtidas });
}
