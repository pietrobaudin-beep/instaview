/**
 * O mesmo @ no TikTok, no X e no Telegram — só quando a conta existe mesmo.
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
import { LABELS, apifyLigado, viaApify, type Achado, type RedePaga } from "@/lib/elsewhere-apify";

const log = logger.scope("elsewhere");
const TTL = 7 * 24 * 60 * 60 * 1000;
/** Quanto vale um "não achei" das redes pagas — ver o porquê no laço delas. */
const TTL_FALHA = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 4000;

export type Network = "tiktok" | "x" | "telegram" | RedePaga;

export interface Elsewhere {
  network: Network;
  label: string;
  handle: string;
  url: string;
  /** Nome que a própria rede devolve, quando devolve. */
  displayName?: string | null;
  /**
   * Foto de perfil, quando a rede publica uma.
   *
   * De graça vêm as do Telegram e a do X, as duas das marcas `og:` que essas
   * redes publicam para montar o cartão de link. O TikTok não expõe imagem
   * por via oficial: a dele vem do Apify, junto com a do YouTube. Onde não há
   * nenhuma, a tela continua desenhando a silhueta.
   */
  avatarUrl?: string | null;
}

/** As redes de graça. As pagas (via Apify) ficam em `elsewhere-apify`. */
type RedeGratis = "tiktok" | "x" | "telegram";

const NETWORKS: Record<
  RedeGratis,
  { label: string; url: (h: string) => string; valid: RegExp }
> = {
  // O @ do TikTok aceita ponto e sublinhado; o do X, só letras, números e _.
  tiktok: { label: "TikTok", url: (h) => `https://www.tiktok.com/@${h}`, valid: /^[\w.]{2,24}$/ },
  x: { label: "X", url: (h) => `https://x.com/${h}`, valid: /^\w{1,15}$/ },
  // O @ do Telegram: letras, números e sublinhado, começando por letra.
  telegram: {
    label: "Telegram",
    url: (h) => `https://t.me/${h}`,
    valid: /^[a-z][\w]{4,31}$/,
  },
};

type Verdict = "yes" | "unknown";
type Result = { verdict: Verdict; displayName?: string | null; avatarUrl?: string | null };

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

/**
 * Telegram pela página de prévia.
 *
 * O `t.me/<@>` devolve um HTML com as marcas `og:` que o próprio Telegram
 * publica para montar o cartãozinho do link — de lá saem **nome, foto e bio**.
 * Conta que não existe vem sem essas marcas, e aí o veredito é "não sei".
 */
async function checkTelegram(handle: string): Promise<Result> {
  const r = await ask(`https://t.me/${handle}`);
  if (!r || r.status !== 200) return { verdict: "unknown" };

  const og = (prop: string) =>
    r.body.match(new RegExp(`<meta property="og:${prop}" content="([^"]*)"`, "i"))?.[1] ?? null;

  const titulo = og("title");
  const foto = og("image");

  /*
   * O @ que não existe também responde 200 — e com marcas `og:` preenchidas.
   * A diferença está no conteúdo: o título vira "Telegram: Contact @fulano" e
   * a imagem é o logotipo em telegram.org. A conta de verdade traz o nome da
   * pessoa e uma foto no CDN (cdn*.telesco.pe).
   *
   * Sem esta checagem, TODO @ aparecia como tendo Telegram. Foi o que
   * aconteceu no primeiro teste.
   */
  const ehCdn = !!foto && /(^|\.)telesco\.pe\//i.test(foto);
  const tituloGenerico = !titulo || /^telegram(:|$)/i.test(titulo.trim());
  if (!ehCdn || tituloGenerico) return { verdict: "unknown" };

  return { verdict: "yes", displayName: titulo, avatarUrl: foto };
}

/**
 * X pela própria página, incluindo a foto.
 *
 * A página que o x.com serve para quem não está logado é uma casca de
 * JavaScript, mas o cabeçalho dela traz as marcas `og:` do cartão de link — e
 * ali estão o nome e a foto de perfil. Já buscávamos essa página para
 * confirmar a conta e jogávamos os dois fora; agora não. Não custa pedido
 * nenhum a mais, e foi o que tornou desnecessário pagar um raspador só pela
 * foto do X.
 *
 * A imagem vem em `_200x200`; `_400x400` é a mesma, maior.
 */
async function checkX(handle: string): Promise<Result> {
  const r = await ask(`https://x.com/${handle}`);
  if (!r || r.status !== 200) return { verdict: "unknown" };

  const og = (prop: string) =>
    r.body.match(new RegExp(`<meta property="og:${prop}" content="([^"]*)"`, "i"))?.[1] ?? null;

  // O sinal de que a conta existe continua sendo o @ escrito na página, como
  // em "NASA (@NASA) on X" — não a simples presença das marcas.
  const titulo = og("title");
  if (!titulo || !titulo.toLowerCase().includes(`(@${handle.toLowerCase()})`)) {
    return { verdict: "unknown" };
  }

  const foto = og("image");
  return {
    verdict: "yes",
    // De "NASA (@NASA) on X" sobra "NASA".
    displayName: titulo.split("(@")[0].trim() || null,
    avatarUrl: foto ? foto.replace(/_200x200\.(jpg|jpeg|png|webp)$/i, "_400x400.$1") : null,
  };
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

/**
 * Cada rede tem o seu jeito, e é melhor assim.
 *
 * Havia aqui um caminho genérico — pedir a página e procurar frases de "não
 * existe" — que sobrou de quando nenhuma das três era tratada em separado.
 * Agora as três têm função própria, e o genérico virou código morto.
 */
async function check(network: RedeGratis, handle: string): Promise<Result> {
  if (network === "tiktok") return checkTikTok(handle);
  if (network === "telegram") return checkTelegram(handle);
  return checkX(handle);
}

const key = (network: Network) => `net:${network}`;

/**
 * Consulta com memória de 7 dias; só devolve as redes confirmadas.
 *
 * `incluirPagas` liga as redes que passam pelo Apify (TikTok com foto e
 * YouTube). Elas custam por execução, então só rodam quando alguém aperta
 * "Procurar em outras redes" — nunca sozinhas.
 */
export async function handleElsewhere(
  username: string,
  incluirPagas = false,
): Promise<Elsewhere[]> {
  const handle = username.trim().replace(/^@+/, "").toLowerCase();
  const out: Elsewhere[] = [];

  /*
   * As três redes de graça em paralelo, não em fila.
   *
   * Cada uma faz uma leitura no banco e, em caso de cache velho, um pedido
   * externo. Em sequência isso somava — e esta rota é esperada pela tela de
   * carregamento, então o tempo dela aparece para quem está olhando.
   */
  const gratis = await Promise.all(
    (Object.keys(NETWORKS) as RedeGratis[]).map(async (network) => {
      const cfg = NETWORKS[network];
      if (!cfg.valid.test(handle)) return null; // o @ nem é válido nessa rede

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

      if (result?.verdict !== "yes") return null;
      return {
        network,
        label: cfg.label,
        handle,
        url: cfg.url(handle),
        displayName: result.displayName ?? null,
        avatarUrl: result.avatarUrl ?? null,
      } as Elsewhere;
    }),
  );

  // A ordem da lista segue a ordem de `NETWORKS`, não quem respondeu primeiro.
  for (const item of gratis) if (item) out.push(item);

  if (incluirPagas && apifyLigado()) {
    // Em paralelo, e não em fila: medido em 21/09, o TikTok leva ~11s e o
    // YouTube ~6s. Juntos, a espera é a da rede mais lenta, não a soma.
    const achados = await Promise.all(
      (Object.keys(LABELS) as RedePaga[]).map(async (rede) => {
        const secao = key(rede);
        const row = await prisma.sectionCache
          .findUnique({ where: { username_section: { username: handle, section: secao } } })
          .catch(() => null);

        // "Achei" vale 7 dias; "não achei" vale 6 horas. O ator falha por
        // motivo passageiro — limite de memória da conta, tempo esgotado — e
        // guardar isso por uma semana apagaria a rede daquele @ sem motivo.
        const validade = (row?.data as unknown as Achado | undefined)?.verdict === "yes"
          ? TTL
          : TTL_FALHA;
        if (row && Date.now() - row.fetchedAt.getTime() < validade) {
          return [rede, row.data as unknown as Achado] as const;
        }

        const achado = await viaApify(rede, handle);
        log.info("apify", { rede, handle, verdict: achado.verdict });

        // `erro` é "não consegui perguntar", não uma resposta: guardar isso
        // faria a rede sumir até o cache vencer, mesmo estando lá. Fica sem
        // gravar, para a próxima tentativa perguntar de novo.
        if (achado.verdict !== "erro") {
          const data = achado as unknown as Parameters<typeof prisma.sectionCache.create>[0]["data"]["data"];
          await prisma.sectionCache
            .upsert({
              where: { username_section: { username: handle, section: secao } },
              create: { username: handle, section: secao, data },
              update: { data, fetchedAt: new Date() },
            })
            .catch(() => null);
        }
        return [rede, achado] as const;
      }),
    );

    for (const [rede, achado] of achados) {
      // Sem endereço não há link para oferecer. Mandar para uma busca do
      // Google, como antes, seria fingir que sabemos onde a conta está.
      if (achado?.verdict !== "yes" || !achado.url) continue;

      const achadoPago: Elsewhere = {
        network: rede,
        label: LABELS[rede],
        handle,
        url: achado.url,
        displayName: achado.displayName ?? null,
        avatarUrl: achado.avatarUrl ?? null,
      };

      /*
       * O TikTok é a mesma rede por dois caminhos: o oEmbed de graça confirma
       * a conta mas não dá foto; o ator do Apify dá. Sem isto a tela mostrava
       * "TikTok" duas vezes, uma com foto e outra sem — conferido em 21/09.
       * A linha paga, mais completa, toma o lugar da grátis.
       */
      const iguais = out.findIndex((l) => l.label === achadoPago.label);
      if (iguais >= 0) out[iguais] = achadoPago;
      else out.push(achadoPago);
    }
  }

  return out;
}
