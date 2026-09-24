/**
 * O mesmo @ em redes que só um raspador alcança — via Apify.
 *
 * TikTok e YouTube não têm caminho oficial que devolva a imagem do perfil. O
 * Apify roda "atores" que fazem isso e cobram por execução. Aqui cada rede é um ator, e o resto do
 * sistema não sabe que o Apify existe: a resposta sai no mesmo formato do
 * Telegram e do TikTok oficial.
 *
 * **Custo.** Medido em 21/09 com @nasa: as três redes juntas saem por frações
 * de centavo de dólar. Ainda assim nada disto roda sozinho — é o botão
 * "Procurar em outras redes" que dispara, e o resultado fica 7 dias no cache:
 * o segundo que procurar o mesmo @ não paga.
 *
 * Sem `APIFY_TOKEN` a função devolve "não sei" e a tela simplesmente não
 * mostra essas redes.
 */
import { registrarChamada } from "@/lib/custo";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const log = logger.scope("apify");

// Medido em 21/09: TikTok 11s, YouTube 6s, Twitter **40s**. Com os 25s de
// antes o Twitter era cortado sempre — nunca aparecia, e parecia que o @ não
// existia lá. O teto do lado do Apify (`&timeout=`) vai junto, senão ele
// desiste primeiro.
const TIMEOUT_MS = 70_000;
const TIMEOUT_APIFY_S = 60;

/*
 * Memória: não mandamos nenhuma, de propósito.
 *
 * Cheguei a fixar um valor suspeitando que as redes em paralelo estourassem o
 * teto da conta. Estava errado — a conta tem 16 GB e 5 execuções simultâneas,
 * e o ator do X pede 256 MB por padrão. O que derrubava o X era tempo
 * (`run-failed … TIMED-OUT` no log), não memória. Pior: com um valor fixo o
 * TikTok passou a devolver lista vazia. Cada ator conhece a própria
 * necessidade melhor do que eu.
 */

/**
 * O Kwai saiu da lista em 21/09.
 *
 * O ator `luan.r.dev~kwai-profile-scraper` responde HTTP 403
 * "full-permission-actor-not-approved": ele exige **acesso total à conta do
 * Apify** para rodar. Isso é uma permissão de dono, não de uso — e não se
 * concede para achar uma foto de perfil. Fica de fora até existir um ator de
 * Kwai que rode com permissão comum.
 *
 * O **Pinterest** saiu pelo mesmo motivo prático: `epctex~pinterest-scraper`
 * responde HTTP 403 "actor-is-not-rented" — o teste grátis acabou e rodar
 * exige assinar o ator (mensalidade à parte do crédito). É uma compra, e fica
 * para quando você decidir se vale. A entrada e os campos dele continuam
 * escritos aqui, prontos, mas **nunca foram vistos funcionando**.
 *
 * O **X** saiu por medição, não por impedimento: `apidojo~twitter-user-scraper`
 * respondeu em 4s na primeira chamada, 40s na segunda e depois passou a
 * estourar o tempo toda vez (`run-failed … TIMED-OUT` aos 60s, três seguidas
 * em 21/09) — jeito de ator que levou bloqueio do próprio X. E o que ele
 * acrescenta é só a foto: a existência da conta no X o caminho de graça já
 * confirma. Não vale 60 segundos de espera para, no fim, falhar.
 */
export type RedePaga = "tiktokFoto" | "youtube";

export interface Achado {
  /**
   * `yes` achou · `unknown` o ator respondeu e não achou · `erro` não houve
   * resposta.
   *
   * `erro` existe porque os dois últimos não são a mesma coisa: o ator do X
   * às vezes estoura o tempo (`run-failed … TIMED-OUT`, visto em 21/09) e
   * guardar isso como "não tem X" esconderia a rede por horas. Quem guarda
   * cache trata `erro` como "não perguntei".
   */
  verdict: "yes" | "unknown" | "erro";
  displayName?: string | null;
  avatarUrl?: string | null;
  url?: string | null;
}

/**
 * Os atores escolhidos, com o preço que eles publicam.
 *
 * `campos` diz onde procurar cada coisa na resposta: os atores não combinam
 * entre si, e chutar nome de campo seria inventar. O `probe` (ver
 * `scripts/apify-probe.ts`) imprime a resposta crua de um ator para conferir.
 */
export const ATORES: Record<
  RedePaga,
  {
    ator: string;
    label: string;
    url: (h: string) => string;
    entrada: (h: string) => unknown;
  }
> = {
  tiktokFoto: {
    ator: "accountable_eel~tiktok-profile-lookup", // US$ 2/1.000, não cobra quando não acha
    label: "TikTok",
    url: (h) => `https://www.tiktok.com/@${h}`,
    // O campo é `profiles`, não `usernames`: com o nome errado o ator devolve
    // HTTP 400 ("Field input.profiles is required"), conferido em 21/09.
    entrada: (h) => ({ profiles: [h], onlyFound: true, maxResults: 1 }),
  },
  youtube: {
    ator: "streamers~youtube-channel-scraper",
    label: "YouTube",
    url: (h) => `https://www.youtube.com/@${h}`,
    // Este ator varre os vídeos do canal; queremos só o canal. Os tetos em 1/0
    // existem para não pagar por uma raspagem inteira à toa.
    entrada: (h) => ({
      startUrls: [{ url: `https://www.youtube.com/@${h}` }],
      maxResults: 1,
      maxResultsShorts: 0,
      maxResultStreams: 0,
    }),
  },
};

/**
 * O que ficou apurado do X, para quem retomar: ator
 * `apidojo~twitter-user-scraper`, entrada
 * `{ twitterHandles: ["<@>"], maxItems: 1, getFollowers: false, getFollowing: false }`,
 * e os campos da resposta são `name`, `profilePicture` e `url` — todos vistos
 * funcionando antes de o ator começar a estourar o tempo. A foto vem em
 * `_normal.jpg` (48 px) e aceita a troca por `_400x400.jpg`.
 *
 * O que ficou apurado do Pinterest, para quem retomar não recomeçar do zero:
 * ator `epctex~pinterest-scraper`, `proxy` é campo **obrigatório** na entrada
 * (sem ele, HTTP 400), e a chamada seria
 * `{ startUrls: ["https://www.pinterest.com/<@>/"], includeUserInfoOnly: true,
 * maxItems: 1, proxy: { useApifyProxy: true } }`. Os nomes dos campos da
 * resposta continuam desconhecidos — o 403 vem antes de rodar.
 */

export const LABELS = Object.fromEntries(
  Object.entries(ATORES).map(([k, v]) => [k, v.label]),
) as Record<RedePaga, string>;

export function apifyLigado(): boolean {
  return Boolean(env.APIFY_TOKEN);
}

/** Procura o primeiro valor não vazio entre vários nomes de campo possíveis. */
function pegar(obj: Record<string, unknown>, nomes: string[]): string | null {
  for (const nome of nomes) {
    const v = obj[nome];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Onde cada ator guarda nome, foto e endereço — conferido na resposta real
 * (`scripts/apify-probe.ts`, 21/09), não deduzido.
 *
 * A lista única que havia antes custou caro no YouTube: como o ator devolve um
 * **vídeo** com dados do canal grudados, `title` e `thumbnailUrl` existem e
 * vêm primeiro — a tela mostrava o título do último vídeo e a capa dele no
 * lugar do canal. Por isso a ordem é por rede.
 */
const CAMPOS: Record<RedePaga, { nome: string[]; foto: string[]; url: string[] }> = {
  tiktokFoto: { nome: ["nickname"], foto: ["avatarUrl"], url: ["profileUrl"] },
  // `channelName`/`channelAvatarUrl`: os "title"/"thumbnailUrl" são do vídeo.
  youtube: { nome: ["channelName"], foto: ["channelAvatarUrl"], url: ["channelUrl"] },
};

/**
 * Sobe a resolução quando a rede publica a foto em tamanho de miniatura.
 *
 * O YouTube devolve a foto em `s68` (68 px); trocar esse pedaço do endereço
 * traz a mesma imagem grande. Numa lista com avatar de 36 px isso é a
 * diferença entre nítido e borrado na tela retina.
 */
function melhorFoto(rede: RedePaga, url: string | null): string | null {
  if (!url) return null;
  if (rede === "youtube") return url.replace(/=s\d+-c-k/, "=s240-c-k");
  return url;
}

/**
 * Traduz um item do ator para o formato do Farejo.
 *
 * Está separado de `viaApify` para a sondagem (`scripts/apify-probe.ts`) poder
 * conferir o mapeamento no item que ela já buscou, sem rodar o ator de novo —
 * cada execução custa.
 */
export function mapear(rede: RedePaga, item: Record<string, unknown>, handle: string): Achado {
  const campos = CAMPOS[rede];
  const nome = pegar(item, campos.nome);
  const foto = melhorFoto(rede, pegar(item, campos.foto));

  // Sem nenhum dos dois, não dá para dizer que achou.
  if (!nome && !foto) return { verdict: "unknown" };

  return {
    verdict: "yes",
    displayName: nome,
    avatarUrl: foto,
    url: pegar(item, campos.url) ?? ATORES[rede].url(handle),
  };
}

/**
 * Roda o ator e espera o resultado na mesma chamada.
 *
 * `run-sync-get-dataset-items` devolve os itens direto; sem isso seria preciso
 * criar a execução, ficar perguntando se terminou e só então buscar os dados.
 */
export async function viaApify(rede: RedePaga, handle: string): Promise<Achado> {
  if (!env.APIFY_TOKEN) return { verdict: "erro" };
  const cfg = ATORES[rede];

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${cfg.ator}/run-sync-get-dataset-items?token=${env.APIFY_TOKEN}&timeout=${TIMEOUT_APIFY_S}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cfg.entrada(handle)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    await registrarChamada("apify", cfg.ator, res.status);
    if (!res.ok) {
      // O motivo vai junto: "400" sozinho não distingue entrada errada de
      // limite de memória da conta, e foi o segundo que derrubou o Twitter
      // quando as redes passaram a rodar em paralelo.
      const motivo = await res.text().catch(() => "");
      log.info("ator recusou", { rede, status: res.status, motivo: motivo.slice(0, 200) });
      return { verdict: "erro" };
    }

    const itens = (await res.json()) as Record<string, unknown>[];
    const item = Array.isArray(itens) ? itens.find((i) => i && typeof i === "object") : null;
    // Aqui o ator respondeu: lista vazia é resposta — esse @ não existe nessa
    // rede. Isso vale ser guardado.
    if (!item) return { verdict: "unknown" };

    return mapear(rede, item, handle);
  } catch {
    // Tempo esgotado do nosso lado, rede caída: não é resposta.
    return { verdict: "erro" };
  }
}
