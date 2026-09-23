import { NextResponse } from "next/server";
import { handleElsewhere } from "@/lib/handle-elsewhere";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { peekUsageKey, usageKey } from "@/lib/usage";
import { votar, votosDoPerfil, type Voto } from "@/lib/elsewhere-votos";
import { TETO_REDES_PAGAS, consumirTeto } from "@/lib/teto-diario";

export const dynamic = "force-dynamic";

/**
 * GET /api/elsewhere?username=<@>
 *
 * O mesmo @ no TikTok, no X e no Telegram, só quando a conta existe de
 * verdade. Do Telegram e do X vem também a foto, porque os dois a publicam nas
 * marcas `og:` da página. Não toca no provedor do Instagram — portanto não
 * custa crédito — e guarda o resultado por 7 dias.
 *
 * O que foi marcado como "não é essa pessoa" não volta aqui: some para quem
 * marcou, e para todos quando gente suficiente concorda.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = normalizeUsername(url.searchParams.get("username") || "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  /*
   * `?pagas=1` liga as redes que passam pelo Apify. Cada @ novo custa, e isto
   * passou a rodar sozinho em todo perfil aberto — por qualquer visitante,
   * sem conta. O teto diário evita que o crédito do mês vá embora numa tarde.
   *
   * O @ que já está no cache não consome teto: quem paga é o @ novo.
   */
  const pagas = url.searchParams.get("pagas") === "1";

  // `peek`, e não `usageKey`: um GET não deve criar identidade para quem ainda
  // não tem nenhuma. Sem chave, vale só a regra global.
  const chave = peekUsageKey(await getCurrentUser());

  /*
   * O teto só é cobrado quando o Apify vai MESMO rodar.
   *
   * Antes ele era consumido aqui em cima, antes de qualquer leitura: abrir
   * cinco perfis já guardados queimava o dia inteiro, e o sexto — esse sim
   * novo — voltava sem a foto do TikTok. Agora quem decide o momento é a
   * busca, que só pede permissão depois de o cache não responder.
   */
  const permitir = async () => (await consumirTeto(chave, "redes-pagas", TETO_REDES_PAGAS)).ok;

  // As duas em paralelo, e os votos numa leitura só: esta rota é esperada
  // pela tela de carregamento, então cada ida ao banco aparece para quem olha.
  const [links, { escondidas, meus }] = await Promise.all([
    handleElsewhere(username, pagas ? permitir : false),
    votosDoPerfil(username, chave),
  ]);

  return NextResponse.json({
    links: links.filter((l) => !escondidas.includes(l.network)),
    // `true` quando a etapa paga foi pedida — tenha ela gastado ou vindo do
    // cache. É o que diz à tela que não falta mais nada por vir.
    pagas,
    // O VSCO é montado na tela, não vem daqui — por isso a lista vai inteira,
    // para a tela poder escondê-lo também.
    escondidas,
    votos: meus,
  });
}

/**
 * POST /api/elsewhere — "essa conta é mesmo dessa pessoa?"
 *
 * Corpo: `{ username, rede, voto: "sim" | "nao" }`.
 *
 * Aqui `usageKey` pode criar o identificador do visitante: quem vota está
 * agindo, e sem identidade não dá para trocar de ideia depois nem impedir que
 * a mesma pessoa afunde um resultado sozinha.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { username?: string; rede?: string; voto?: string }
    | null;

  const username = normalizeUsername(body?.username ?? "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const rede = String(body?.rede ?? "").trim();
  // Nome de rede curto e sem espaço: o que entra aqui vira chave no banco.
  if (!rede || rede.length > 20 || !/^[\w-]+$/.test(rede)) {
    return NextResponse.json({ error: "rede_invalida" }, { status: 400 });
  }

  const voto = body?.voto === "sim" || body?.voto === "nao" ? (body.voto as Voto) : null;
  if (!voto) return NextResponse.json({ error: "voto_invalido" }, { status: 400 });

  const placar = await votar(username, rede, usageKey(await getCurrentUser()), voto);
  return NextResponse.json({ ok: true, ...placar });
}
