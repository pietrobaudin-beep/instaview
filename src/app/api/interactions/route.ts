import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { acessoA } from "@/lib/access";
import { direitosDe } from "@/lib/direitos";

export const dynamic = "force-dynamic";

/**
 * O ranking de interações — lido da análise salva, nunca do provedor.
 *
 * A leitura dos posts acontece uma vez, quando a análise é consumida
 * (`analise.ts`). Aqui só se devolve o que foi guardado: reabrir não paga.
 *
 * Curioso com conta que usou a revelação neste perfil recebe só o destaque —
 * o primeiro lugar —, e o resto continua trancado.
 */
export async function GET(req: Request) {
  const username = normalizeUsername(new URL(req.url).searchParams.get("username") || "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = await getCurrentUser();
  const acesso = await acessoA(user, username);
  const salva = acesso.salva?.data;

  if (salva?.origem === "revelacao") {
    return NextResponse.json({
      locked: true,
      revelado: salva.destaque ?? null,
      semDados: salva.destaque == null,
      items: [],
    });
  }
  if (acesso.access === "free" || !salva) return NextResponse.json({ locked: true, items: [] });
  return NextResponse.json({ locked: false, items: salva.interacoes ?? [], curtidas: salva.curtidas ?? null,
    curtidasPedidas: salva.curtidas !== undefined,
    podeCurtidas: !!user && (direitosDe(user).admin || !!direitosDe(user).config.verCurtidas),
  });
}
