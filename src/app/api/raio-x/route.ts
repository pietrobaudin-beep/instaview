import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checarConsulta, respostaDeLimite } from "@/lib/consulta";
import { prisma } from "@/lib/db";
import { guardarStoriesJaLidos } from "@/lib/faro-watch";
import { SECTIONS, getCachedSection, getSection, previewOf, type Section } from "@/lib/raio-x";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** As seções que só abrem com uso único ou assinatura. */
const LOCKED_FOR_FREE: readonly Section[] = ["stories", "posts", "reels"];

/**
 * GET /api/raio-x?username=<@>&section=<stories|posts|reels|tagged|highlights|reposts|suggested|about>
 *
 * One section of a profile's Raio-X, fetched on demand and shared-cached.
 * With `&cached=1` it answers only from the cache and never calls the provider
 * — used by the loading card, which must not cost a request.
 * Pro and "uso único" see it all; free visitors get the masked preview — and
 * only for the one profile their free analysis was spent on, checked before any
 * provider call so nothing is paid for a profile they can't open.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = normalizeUsername(url.searchParams.get("username") || "");
  const section = url.searchParams.get("section") as Section;
  if (!isValidUsername(username) || !SECTIONS.includes(section)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const consulta = await checarConsulta(user, username);
  const access = consulta.access;
  const paid = access !== "free";

  // Stories, posts e reels são do plano pago. Para quem é grátis a resposta é
  // "trancado" — e, de propósito, sem nenhuma chamada ao provedor: mostrar uma
  // prévia borrada dessas seções custava crédito por conteúdo que a pessoa não
  // chega a ver.
  if (!paid && LOCKED_FOR_FREE.includes(section)) {
    return NextResponse.json({ status: "locked", access, locked: true });
  }

  if (!consulta.permitido) {
    return NextResponse.json(respostaDeLimite(consulta), { status: 402 });
  }

  // Cache-only: no provider call, so a miss is simply "not now".
  if (url.searchParams.get("cached") === "1") {
    const hit = await getCachedSection(username, section);
    if (!hit || hit.status !== "ok") return NextResponse.json({ status: "miss" });
    return NextResponse.json({
      status: "ok",
      access,
      locked: !paid,
      fetchedAt: hit.fetchedAt,
      data: paid ? hit.data : previewOf(hit.data),
    });
  }

  const result = await getSection(username, section);
  if (result.status !== "ok") return NextResponse.json({ status: result.status, access, locked: !paid });

  // Stories lidos aqui, de um perfil que está no Faro AI de quem olha, vão
  // para o acervo do Faro AI na mesma hora. A leitura já foi paga.
  if (user && section === "stories" && result.data.section === "stories") {
    const noFaro = await prisma.trackedProfile
      .findUnique({ where: { userId_username: { userId: user.id, username } }, select: { id: true } })
      .catch(() => null);
    if (noFaro) {
      await guardarStoriesJaLidos(noFaro.id, result.data.items).catch(() => 0);
    }
  }

  return NextResponse.json({
    status: "ok",
    access,
    locked: !paid,
    fetchedAt: result.fetchedAt,
    data: paid ? result.data : previewOf(result.data),
  });
}
