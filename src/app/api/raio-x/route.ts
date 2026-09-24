import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { acessoA } from "@/lib/access";
import { prisma } from "@/lib/db";
import { guardarStoriesJaLidos } from "@/lib/faro-watch";
import { SECTIONS, getCachedSection, previewOf, type Section } from "@/lib/raio-x";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** As seções que fazem parte da análise salva. */
const DA_ANALISE = ["stories", "tagged", "about"] as const;
type DaAnalise = (typeof DA_ANALISE)[number];

/**
 * GET /api/raio-x?username=<@>&section=<stories|tagged|about|…>
 *
 * Uma seção do perfil — **lida da análise salva**, nunca do provedor.
 *
 * Antes cada aba ia ao provedor quando o cache compartilhado vencia (24h),
 * mesmo para quem já tinha a análise: reabrir custava. Agora stories,
 * marcações e sobre são coletados junto com a análise, e aqui só se devolve.
 *
 * `&cached=1` continua servindo o cartão de carregamento: só cache
 * compartilhado fresco, nunca provedor.
 *
 * As outras seções (posts, reels, destaques…) saíram da tela; sem análise que
 * as contenha, a resposta é "indisponível" — sem chamada paga.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = normalizeUsername(url.searchParams.get("username") || "");
  const section = url.searchParams.get("section") as Section;
  if (!isValidUsername(username) || !SECTIONS.includes(section)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const acesso = await acessoA(user, username);
  const paid = acesso.access !== "free";

  if (url.searchParams.get("cached") === "1") {
    // Stories só para quem tem a análise: nem a prévia borrada vale uma leitura.
    if (!paid && section === "stories") return NextResponse.json({ status: "locked", locked: true });
    const hit = await getCachedSection(username, section);
    if (!hit || hit.status !== "ok") return NextResponse.json({ status: "miss" });
    return NextResponse.json({
      status: "ok",
      access: acesso.access,
      locked: !paid,
      fetchedAt: hit.fetchedAt,
      data: paid ? hit.data : previewOf(hit.data),
    });
  }

  if (!paid || !acesso.salva) {
    return NextResponse.json({ status: "locked", access: acesso.access, locked: true });
  }
  if (!(DA_ANALISE as readonly string[]).includes(section)) {
    return NextResponse.json({ status: "unsupported", access: acesso.access, locked: false });
  }

  const data = acesso.salva.data.secoes?.[section as DaAnalise];
  if (!data) return NextResponse.json({ status: "error", access: acesso.access, locked: false });

  // Stories da análise, de um perfil que está no Faro AI de quem olha, vão
  // para o acervo do Faro AI. A leitura já foi paga.
  if (user && acesso.noFaro && data.section === "stories") {
    const noFaro = await prisma.trackedProfile
      .findUnique({ where: { userId_username: { userId: user.id, username } }, select: { id: true } })
      .catch(() => null);
    if (noFaro) await guardarStoriesJaLidos(noFaro.id, data.items).catch(() => 0);
  }

  return NextResponse.json({
    status: "ok",
    access: acesso.access,
    locked: false,
    fetchedAt: acesso.salva.collectedAt.toISOString(),
    data,
  });
}
