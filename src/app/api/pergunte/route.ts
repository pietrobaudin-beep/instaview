import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { iaLigada } from "@/lib/ia";
import { montarDossie, perguntar } from "@/lib/pergunte";
import { normalizeUsername } from "@/lib/utils";
import { comQuem } from "@/lib/custo";
import { direitosDe } from "@/lib/direitos";
import { devolver, reservar } from "@/lib/franquia";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/pergunte — "Pergunte ao Faro AI".
 *
 * Só sobre perfil que ESTÁ no Faro de quem pergunta: o dossiê é feito do que
 * o Farejo acompanhou ao longo do tempo, e isso só existe para quem colocou
 * o perfil lá. Não é recurso de busca avulsa.
 *
 * Devolve a resposta e o tamanho do dossiê que a sustentou — a tela mostra
 * isso, porque a pessoa tem direito de saber sobre o que o modelo olhou.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const d = direitosDe(user);
  if (!d.admin && d.config.perguntas <= 0) return NextResponse.json({ error: "plano" }, { status: 402 });
  if (!iaLigada()) return NextResponse.json({ error: "desligada" }, { status: 503 });

  const corpo = (await req.json().catch(() => null)) as
    | { username?: string; pergunta?: string }
    | null;

  const username = normalizeUsername(corpo?.username ?? "");
  const pergunta = (corpo?.pergunta ?? "").trim();
  if (!pergunta) return NextResponse.json({ error: "pergunta_vazia" }, { status: 400 });

  const profile = await prisma.trackedProfile.findUnique({
    where: { userId_username: { userId: user.id, username } },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });

  // Reserva antes de perguntar; resposta que não veio devolve a pergunta.
  const reserva = d.admin ? null : await reservar(user, "pergunta");
  if (reserva && !reserva.ok) {
    return NextResponse.json(
      { error: "franquia", usados: reserva.usados, limite: reserva.limite },
      { status: 402 },
    );
  }

  const dossie = await montarDossie(profile.id, username);
  const resposta = await comQuem({ userId: user.id, admin: d.admin, motivo: "pergunta" }, () =>
    perguntar(dossie, pergunta),
  );

  if (!resposta) {
    if (reserva) await devolver(reserva);
    return NextResponse.json({ error: "sem_resposta" }, { status: 503 });
  }

  return NextResponse.json({
    resposta,
    // Quantas linhas de registro o modelo tinha na frente. Não é enfeite: é o
    // que permite à pessoa desconfiar de uma resposta magra.
    linhasDeDossie: dossie.texto.split("\n").filter(Boolean).length,
    cortado: dossie.cortado,
    franquia: reserva ? { usados: reserva.usados, limite: reserva.limite } : null,
  });
}
