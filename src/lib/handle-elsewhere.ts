/**
 * O mesmo @ no TikTok e no X — mostrado só quando a conta realmente existe.
 *
 * O Farejo pede a página pública do perfil e olha apenas para o sinal de
 * existência: um 404 é "não existe", uma página com o nome do perfil é
 * "existe". Qualquer outra coisa — bloqueio, captcha, tempo esgotado, formato
 * inesperado — vira "não sei", e "não sei" some da tela.
 *
 * Errar escondendo é aceitável; errar mostrando não é, porque um @ igual em
 * outra rede pode ser de outra pessoa.
 *
 * Nada do conteúdo é guardado: só existe/não existe, por 7 dias, para não
 * bater nessas redes a cada abertura de perfil.
 */
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.scope("elsewhere");
const TTL = 7 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 4000;

export type Network = "tiktok" | "x";

export interface Elsewhere {
  network: Network;
  label: string;
  handle: string;
  url: string;
  /** Nome que a própria rede devolve, quando devolve. */
  displayName?: string | null;
}

const NETWORKS: Record<
  Network,
  { label: string; url: (h: string) => string; valid: RegExp }
> = {
  // O @ do TikTok aceita ponto e sublinhado; o do X, só letras, números e _.
  tiktok: { label: "TikTok", url: (h) => `https://www.tiktok.com/@${h}`, valid: /^[\w.]{2,24}$/ },
  x: { label: "X", url: (h) => `https://x.com/${h}`, valid: /^\w{1,15}$/ },
};

type Verdict = "yes" | "unknown";
type Result = { verdict: Verdict; displayName?: string | null };

/**
 * TikTok pelo oEmbed — o endpoint público que eles mantêm para quem quer
 * embutir um perfil. É a via oficial: responde 200 com o nome do criador
 * quando a conta existe e 400 quando não existe. Pedir a página HTML não
 * funciona: vem uma casca vazia, porque exige JavaScript.
 */
async function checkTikTok(handle: string): Promise<Result> {
  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(`https://www.tiktok.com/@${handle}`)}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: "application/json" } },
    );
    if (res.status !== 200) return { verdict: "unknown" };
    const data = (await res.json()) as { author_url?: string; author_name?: string; embed_type?: string };
    const confere = (data.author_url ?? "").toLowerCase().endsWith(`/@${handle}`);
    return confere ? { verdict: "yes", displayName: data.author_name ?? null } : { verdict: "unknown" };
  } catch {
    return { verdict: "unknown" };
  }
}

async function ask(url: string): Promise<{ status: number; body: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Um navegador comum: sem isso a resposta é uma página de bloqueio.
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "accept-language": "pt-BR,pt;q=0.9",
      },
    });
    // Só os primeiros KB interessam: o título e o cabeçalho da página.
    const body = (await res.text()).slice(0, 60_000);
    return { status: res.status, body };
  } catch {
    return null;
  }
}

async function check(network: Network, handle: string): Promise<Result> {
  if (network === "tiktok") return checkTikTok(handle);
  const url = NETWORKS[network].url(handle);
  const r = await ask(url);
  if (!r) return { verdict: "unknown" };
  if (r.status !== 200) return { verdict: "unknown" }; // 404, bloqueio, captcha: não aparece

  const html = r.body.toLowerCase();
  const naoExiste = [
    "couldn't find this account",
    "não foi possível encontrar esta conta",
    "esta conta não existe",
    "this account doesn't exist",
    "page not available",
    "página não disponível",
    "user not found",
  ];
  if (naoExiste.some((t) => html.includes(t))) return { verdict: "unknown" };

  // Positivo só com o @ escrito na própria página, como o X faz no título.
  return html.includes(`(@${handle.toLowerCase()})`) ? { verdict: "yes" } : { verdict: "unknown" };
}

const key = (network: Network) => `net:${network}`;

/** Consulta com memória de 7 dias; só devolve as redes confirmadas. */
export async function handleElsewhere(username: string): Promise<Elsewhere[]> {
  const handle = username.trim().replace(/^@+/, "").toLowerCase();
  const out: Elsewhere[] = [];

  for (const network of Object.keys(NETWORKS) as Network[]) {
    const cfg = NETWORKS[network];
    if (!cfg.valid.test(handle)) continue; // o @ nem é válido nessa rede

    const row = await prisma.sectionCache
      .findUnique({ where: { username_section: { username: handle, section: key(network) } } })
      .catch(() => null);

    let result: Result;
    if (row && Date.now() - row.fetchedAt.getTime() < TTL) {
      result = row.data as Result;
    } else {
      result = await check(network, handle);
      log.info("checked", { network, handle, verdict: result.verdict });
      const data = result as unknown as Parameters<typeof prisma.sectionCache.create>[0]["data"]["data"];
      await prisma.sectionCache
        .upsert({
          where: { username_section: { username: handle, section: key(network) } },
          create: { username: handle, section: key(network), data },
          update: { data, fetchedAt: new Date() },
        })
        .catch(() => null);
    }

    if (result?.verdict === "yes") {
      out.push({
        network,
        label: cfg.label,
        handle,
        url: cfg.url(handle),
        displayName: result.displayName ?? null,
      });
    }
  }

  return out;
}
