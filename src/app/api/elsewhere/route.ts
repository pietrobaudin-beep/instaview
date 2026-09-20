import { NextResponse } from "next/server";
import { handleElsewhere } from "@/lib/handle-elsewhere";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/elsewhere?username=<@>
 *
 * O mesmo @ no TikTok e no X, e só quando a conta existe de verdade. Não toca
 * no provedor do Instagram — portanto não custa crédito — e guarda o resultado
 * por 7 dias.
 */
export async function GET(req: Request) {
  const username = normalizeUsername(new URL(req.url).searchParams.get("username") || "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  return NextResponse.json({ links: await handleElsewhere(username) });
}
