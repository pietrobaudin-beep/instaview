import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { iaLigada } from "@/lib/ia";
import { leiturasGuardadas, lerVarios } from "@/lib/stories-ia";
import { normalizeUsername } from "@/lib/utils";
import type { EventData } from "@/lib/faro-watch";
import { comQuem } from "@/lib/custo";
import { direitosDe } from "@/lib/direitos";
import { devolver, reservar, saldo } from "@/lib/franquia";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * O que os stories deste perfil disseram.
 *
 * `GET` devolve só o que já foi lido — é o que a tela usa para abrir sem
 * custo e para a busca funcionar. `POST` é o botão "Resumir stories": aí sim
 * as imagens que faltam vão para o modelo.
 *
 * A separação existe porque ler imagem custa, e custo só acontece quando
 * alguém pede.
 */
async function storiesDoPerfil(userId: string, username: string) {
  const profile = await prisma.trackedProfile.findUnique({
    where: { userId_username: { userId, username } },
    select: { id: true },
  });
  if (!profile) return null;

  const eventos = await prisma.profileEvent.findMany({
    where: { profileId: profile.id, kind: "story" },
    orderBy: { detectedAt: "desc" },
    take: 40,
    select: { id: true, data: true, detectedAt: true },
  });

  return eventos.map((e) => ({
    id: e.id,
    detectedAt: e.detectedAt.toISOString(),
    thumbnailUrl: (e.data as unknown as EventData)?.thumbnailUrl ?? null,
  }));
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const username = normalizeUsername(new URL(req.url).searchParams.get("username") ?? "");
  const stories = await storiesDoPerfil(user.id, username);
  if (!stories) return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });

  const lidos = await leiturasGuardadas(stories.map((s) => s.id));
  return NextResponse.json({
    ligada: iaLigada(),
    total: stories.length,
    lidos: [...lidos.entries()].map(([id, l]) => ({ id, ...l })),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  // Ler imagem é recurso de quem paga: é a parte mais cara da casa.
  const d = direitosDe(user);
  if (!d.admin && d.config.resumos <= 0) return NextResponse.json({ error: "plano" }, { status: 402 });

  const corpo = (await req.json().catch(() => null)) as { username?: string } | null;
  const username = normalizeUsername(corpo?.username ?? "");
  const stories = await storiesDoPerfil(user.id, username);
  if (!stories) return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });

  /*
   * Cada imagem NOVA lida pela IA gasta 1 resumo. O que já foi lido volta de
   * graça — e a busca por assunto só usa o que já foi lido, sem IA.
   *
   * Reserva quantos vão ser lidos; os que falharem voltam para a franquia.
   * Se não couberem todos, lê os que cabem e diz quantos ficaram de fora.
   */
  const comImagem = stories.filter((s) => s.thumbnailUrl);
  const jaLidos = await leiturasGuardadas(comImagem.map((s) => s.id));
  const faltam = comImagem.filter((s) => !jaLidos.has(s.id));
  const cabem = d.admin ? 15 : Math.min(15, (await saldo(user, "resumo")).restam);
  const alvo = faltam.slice(0, cabem);

  const reserva = alvo.length && !d.admin ? await reservar(user, "resumo", alvo.length) : null;
  if (reserva && !reserva.ok) {
    return NextResponse.json({ error: "franquia", usados: reserva.usados, limite: reserva.limite }, { status: 402 });
  }

  const novos = await comQuem({ userId: user.id, admin: d.admin, motivo: "resumo" }, () =>
    lerVarios(alvo, alvo.length),
  );
  const lidosAgora = alvo.filter((s) => novos.has(s.id)).length;
  if (reserva) await devolver(reserva, alvo.length - lidosAgora);

  const todos = new Map([...jaLidos, ...novos]);
  const s = d.admin ? null : await saldo(user, "resumo");
  return NextResponse.json({
    ligada: iaLigada(),
    total: stories.length,
    lidos: [...todos.entries()].map(([id, l]) => ({ id, ...l })),
    // Stories que ficaram sem ler porque a franquia do ciclo acabou.
    semFranquia: faltam.length - alvo.length,
    franquia: s ? { usados: s.usados, limite: s.limite } : null,
  });
}
