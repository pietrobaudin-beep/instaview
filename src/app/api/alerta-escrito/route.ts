import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { guardarPedido, lerPedido } from "@/lib/alerta-escrito";
import { direitosDe } from "@/lib/direitos";
import { saldo } from "@/lib/franquia";

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

  const d = direitosDe(user);
  const avaliacoes = d.admin ? null : await saldo(user, "alerta");
  return NextResponse.json({
    texto: (await lerPedido(profileId)) ?? "",
    disponivel: d.admin || d.config.alertasEscritos > 0,
    // O consumo à vista: quantas avaliações o ciclo já usou.
    avaliacoes,
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const d = direitosDe(user);
  if (!d.admin && d.config.alertasEscritos <= 0) {
    return NextResponse.json(
      { error: "plano", mensagem: "O alerta \"Me avise quando…\" é do Faro de Detetive." },
      { status: 402 },
    );
  }

  const corpo = (await req.json().catch(() => null)) as
    | { profileId?: string; texto?: string }
    | null;
  const profileId = corpo?.profileId ?? "";
  if (!(await meuPerfil(user.id, profileId)))
    return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });

  // Quantos alertas ativos o plano permite, somando os outros perfis da conta.
  const texto = (corpo?.texto ?? "").trim();
  if (texto && !d.admin) {
    const outros = await prisma.trackedProfile.findMany({
      where: { userId: user.id, id: { not: profileId } },
      select: { id: true },
    });
    let ativos = 0;
    for (const o of outros) if (await lerPedido(o.id)) ativos++;
    if (ativos >= d.config.alertasEscritos) {
      return NextResponse.json(
        { error: "limite", mensagem: `Seu plano tem ${d.config.alertasEscritos} alerta ativo. Apague o outro para criar este.` },
        { status: 402 },
      );
    }
  }

  await guardarPedido(profileId, texto);
  return NextResponse.json({ ok: true, texto: (corpo?.texto ?? "").trim().slice(0, 200) });
}
