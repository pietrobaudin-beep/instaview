import { NextResponse } from "next/server";
import { handleElsewhere } from "@/lib/handle-elsewhere";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/elsewhere?username=<@>
 *
 * O mesmo @ no TikTok, no X e no Telegram, só quando a conta existe de
 * verdade. Do Telegram vem também a foto, porque ele a publica na página de
 * prévia do link. Não toca
 * no provedor do Instagram — portanto não custa crédito — e guarda o resultado
 * por 7 dias.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = normalizeUsername(url.searchParams.get("username") || "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  // `?pagas=1` liga as redes que passam pelo Apify — só quando a pessoa
  // aperta o botão, porque cada consulta dessas custa.
  const pagas = url.searchParams.get("pagas") === "1";
  return NextResponse.json({ links: await handleElsewhere(username, pagas), pagas });
}
