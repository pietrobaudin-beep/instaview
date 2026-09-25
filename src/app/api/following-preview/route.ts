import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRecentFollowingChanges, type RecentItem } from "@/lib/following-tracker";
import { prisma } from "@/lib/db";
import { acessoA } from "@/lib/access";
import { consumirAnalise, ofertaDeAnalise } from "@/lib/consulta";
import { direitosDe } from "@/lib/direitos";
import { previaSeguindo } from "@/lib/previa-seguindo";
import type { SeguindoSalvo } from "@/lib/analise";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * A análise de um perfil — a parte "quem essa pessoa segue".
 *
 * GET  → o que já existe. Análise salva: devolve, sem provedor. Sem análise:
 *        devolve a prévia trancada, também sem provedor — e, para quem tem
 *        franquia, quantas análises restam, para a tela oferecer.
 * GET ?confirmar=1 → gasta a análise (quem assina ou comprou o Farejador)
 *        e devolve o resultado.
 *
 * O Curioso não dispara leitura nenhuma aqui. Antes a lista de seguindo era
 * lida de verdade para ser mostrada borrada: pagava-se por um conteúdo que a
 * pessoa não via. A prévia agora é só a forma da tela.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = normalizeUsername(url.searchParams.get("username") || "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const confirmar = url.searchParams.get("confirmar") === "1";

  const user = await getCurrentUser();
  let acesso = await acessoA(user, username);

  if ((!acesso.salva || acesso.access === "free") && user && confirmar) {
    const r = await consumirAnalise(user, username);
    if (!r.ok) {
      if (r.motivo === "limite" || r.motivo === "sem_plano") {
        return NextResponse.json(
          { limited: true, error: "limit_reached", motivo: r.motivo, used: r.usados ?? 0, limit: r.limite ?? 0 },
          { status: 402 },
        );
      }
      return NextResponse.json({
        locked: true,
        access: "free",
        falhou: r.motivo,
        private: r.motivo === "privado",
        following: [],
        counts: null,
      });
    }
    acesso = { ...acesso, access: r.access, salva: r.salva };
  }

  // Revelado: devolve o que foi salvo.
  if (acesso.access !== "free" && acesso.salva) {
    // A lista pode ter falhado dentro de uma análise que entregou o resto.
    const s: SeguindoSalvo = acesso.salva.data.seguindo ?? {
      following: [],
      counts: null,
      seguindoOculto: false,
      private: false,
      real: false,
    };
    let recent: { started: RecentItem[]; stopped: RecentItem[] } = { started: [], stopped: [] };
    if (user && acesso.noFaro) {
      const tracked = await prisma.trackedProfile.findUnique({
        where: { userId_username: { userId: user.id, username } },
        select: { id: true },
      });
      if (tracked) recent = await getRecentFollowingChanges(tracked.id, 12);
    }
    return NextResponse.json({
      locked: false,
      access: acesso.access,
      seguindoOculto: s.seguindoOculto,
      counts: s.counts,
      following: s.following,
      recent,
      real: s.real,
      private: s.private,
      coletadoEm: acesso.salva.collectedAt.toISOString(),
      expiraEm: acesso.salva.expiresAt?.toISOString() ?? null,
    });
  }

  // Revelado, mas ainda sem coleta: Farejador recém-comprado, perfil no Faro
  // AI ou consulta de antes. A coleta é paga (ou já era direito), então a
  // tela pode pedi-la sem perguntar de novo.
  const podeColetarSemGastar = acesso.access !== "free";

  const oferta = user && !podeColetarSemGastar ? await ofertaDeAnalise(user) : null;
  const d = direitosDe(user);

  /*
   * Sem conta ou na conta grátis: a prévia de verdade — quantas mulheres e
   * homens, e os seguidos borrados (nomes mascarados aqui no servidor). Uma
   * leitura por identidade, cache de 24h por @. Ver `previa-seguindo.ts`.
   */
  const gratis = !podeColetarSemGastar && !d.admin && d.plano === "FREE";
  const previa = gratis ? await previaSeguindo(user, username) : null;
  return NextResponse.json({
    locked: true,
    access: "free",
    following: previa?.following ?? [],
    counts: previa?.counts ?? null,
    seguindoOculto: previa?.seguindoOculto ?? false,
    recent: { started: [], stopped: [] },
    real: !!previa?.following.length,
    private: previa?.private ?? false,
    /** A tela deve pedir a coleta com `confirmar=1` sem perguntar. */
    coletarAgora: podeColetarSemGastar,
    /** A tela deve PERGUNTAR antes de gastar: "usar 1 de N análises?". */
    precisaConfirmar: !!oferta && oferta.restam > 0,
    analises: oferta,
    admin: d.admin,
  });
}
