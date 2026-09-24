import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { iaLigada } from "@/lib/ia";
import { leiturasGuardadas, lerVarios } from "@/lib/stories-ia";
import { normalizeUsername } from "@/lib/utils";
import type { EventData } from "@/lib/faro-watch";

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
  if (user.plan === "FREE") return NextResponse.json({ error: "plano" }, { status: 402 });

  const corpo = (await req.json().catch(() => null)) as { username?: string } | null;
  const username = normalizeUsername(corpo?.username ?? "");
  const stories = await storiesDoPerfil(user.id, username);
  if (!stories) return NextResponse.json({ error: "nao_encontrado" }, { status: 404 });

  // Só os que têm miniatura guardada e ainda não foram lidos.
  const lidos = await lerVarios(stories.filter((s) => s.thumbnailUrl).slice(0, 15));

  return NextResponse.json({
    ligada: iaLigada(),
    total: stories.length,
    lidos: [...lidos.entries()].map(([id, l]) => ({ id, ...l })),
  });
}
