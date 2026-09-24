import { NextResponse } from "next/server";
import { handleElsewhere } from "@/lib/handle-elsewhere";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { peekUsageKey, usageKey } from "@/lib/usage";
import { votar, votosDoPerfil, type Voto } from "@/lib/elsewhere-votos";
import { acessoA } from "@/lib/access";
import { comQuem } from "@/lib/custo";
import { direitosDe, inicioDoCiclo } from "@/lib/direitos";
import { reservarBruto, tetoDe } from "@/lib/franquia";

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
  // não tem nenhuma. Serve aos votos.
  const user = await getCurrentUser();
  const chave = peekUsageKey(user);

  /*
   * As redes pagas (Apify) desde 24/09: **sob demanda, dentro da análise**.
   *
   * Só para quem tem a análise revelada DESTE @, e cada @ novo gasta 1 da
   * franquia de redes do plano (Farejador: 1 por compra). As duas redes do
   * mesmo @ são uma consulta só — a reserva é feita uma vez e reaproveitada.
   * O @ que já está no cache não gasta nada.
   *
   * Visitante sem conta não chega aqui: antes não tinha teto nenhum, porque
   * sem cookie a chave era nula e o teto liberava.
   */
  let permitir: (() => Promise<boolean>) | false = false;
  let negado = false;
  if (pagas && user) {
    const acesso = await acessoA(user, username);
    if (acesso.access !== "free") {
      const d = direitosDe(user);
      let reservado: Promise<boolean> | null = null;
      permitir = () => {
        reservado ??= (async () => {
          if (d.admin) return true;
          const extra = acesso.access === "single" ? 1 : 0;
          const limite = acesso.access === "single" ? 0 : tetoDe(d.config, "redes");
          const ciclo = acesso.access === "single" ? new Date(0) : inicioDoCiclo(user);
          const dono = acesso.access === "single" ? `${user.id}:avulso:${username}` : user.id;
          const ok = (await reservarBruto(dono, "redes", ciclo, limite + extra)).ok;
          if (!ok) negado = true;
          return ok;
        })();
        return reservado;
      };
    }
  }

  // As duas em paralelo, e os votos numa leitura só: esta rota é esperada
  // pela tela de carregamento, então cada ida ao banco aparece para quem olha.
  const [links, { escondidas, meus }] = await Promise.all([
    comQuem({ userId: user?.id ?? null, motivo: "redes" }, () => handleElsewhere(username, permitir)),
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
    // Pediu a busca paga e a franquia de outras redes não deixou.
    semFranquia: negado,
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
