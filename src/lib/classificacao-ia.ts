/**
 * Quem é essa conta: mulher, homem ou marca — lido pela IA.
 *
 * ## Por que existe
 *
 * A separação mulheres/homens do Farejo era um palpite pelo primeiro nome
 * ({@link guessGender}): uma lista de nomes brasileiros e, fora dela, a regra
 * "termina em A é mulher". Isso erra em nome estrangeiro, em apelido, em nome
 * unissex — e não tem a menor chance com **marca**, que hoje só é reconhecida
 * quando tem selo de verificado. Loja de bairro sem selo entrava na conta como
 * se fosse gente.
 *
 * Aqui o modelo lê @, nome e bio e responde as três coisas de uma vez.
 *
 * ## O que este arquivo promete
 *
 * - **Nunca derruba a análise.** Sem chave, com erro, com demora ou com teto
 *   estourado, devolve vazio e quem chamou segue com o palpite de antes.
 * - **Nunca repete pergunta paga.** Cada pessoa vira uma linha em
 *   `section_cache`, boa por {@link TTL}. Nome e bio mudam devagar.
 * - **Nunca vira fato.** O que sai daqui alimenta contagem e rótulo de tela,
 *   que o produto já apresenta como estimativa.
 */
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";


const log = logger.scope("ia");

/** Quanto vale a resposta guardada. Nome e bio mudam devagar. */
const TTL = 90 * 24 * 60 * 60 * 1000;

/**
 * Quantas pessoas por chamada — e por que tão poucas.
 *
 * Medido em 23/09 contra nomes reais do banco: com 40 de uma vez, o modelo
 * desanda. Chamou de homem "Amanda Pereira", "Sofia Santos", "Laura Almeida"
 * e "Maria Eduarda" — 25 divergências em 40, quase todas para o mesmo lado,
 * que é a cara de resposta gerada no piloto automático. Com 8, os mesmos
 * nomes saem todos certos, nos dois modelos.
 *
 * Então vão em lotes pequenos, **em paralelo**: a espera é a de uma chamada
 * só, e a qualidade é a do lote pequeno.
 */
const LOTE = 10;

/** Quantos lotes de uma vez. 6 × 10 cobre a lista de "seguindo" inteira. */
const LOTES_EM_PARALELO = 6;

/**
 * Teto de espera.
 *
 * Isto roda no caminho da análise, na frente de quem está olhando a tela de
 * carregamento. Passado o prazo, a análise sai com o palpite antigo — atrasar
 * a tela para melhorar um rótulo seria trocar o certo pelo bonito.
 */
const TETO_MS = 6000;

const SECAO = "ia:quem";

export type Quem = "f" | "m" | "marca" | "u";

export interface PessoaParaLer {
  username: string;
  displayName?: string | null;
  bio?: string | null;
}

export function iaLigada(): boolean {
  return !!env.OPENAI_API_KEY;
}

function valida(v: unknown): Quem | null {
  return v === "f" || v === "m" || v === "marca" || v === "u" ? v : null;
}

/**
 * Só o que ajuda a decidir.
 *
 * Campo vazio não vai: `"b":""` em cinquenta pessoas é meio milhar de tokens
 * pagos para dizer nada. E bio longa é custo sem ganho — a decisão se faz nas
 * primeiras palavras.
 */
function resumir(p: PessoaParaLer) {
  const n = (p.displayName ?? "").trim().slice(0, 40);
  const b = (p.bio ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  return { u: p.username, ...(n ? { n } : {}), ...(b ? { b } : {}) };
}

const INSTRUCAO =
  'Você recebe contas do Instagram (u=@, n=nome, b=bio). Para cada uma responda ' +
  'se é o perfil de uma mulher, de um homem, ou de uma marca (empresa, loja, ' +
  'veículo, organização, projeto, página temática). Responda APENAS o JSON ' +
  '{"r":[{"u":"<o mesmo @ recebido>","g":"f|m|marca|u"}]}, uma entrada por conta ' +
  'recebida, na mesma ordem. Use "u" quando não houver como saber — chutar é ' +
  'pior do que admitir. Não explique nada.';

async function perguntar(pessoas: PessoaParaLer[]): Promise<Map<string, Quem>> {
  const fora = new Map<string, Quem>();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      messages: [
        { role: "system", content: INSTRUCAO },
        { role: "user", content: JSON.stringify(pessoas.map(resumir)) },
      ],
      response_format: { type: "json_object" },
      // Dez respostas cabem folgado. Passou disso, o modelo saiu do trilho —
      // e aí é melhor cortar do que pagar para ver.
      max_completion_tokens: 400,
    }),
    signal: AbortSignal.timeout(TETO_MS),
  });

  if (!res.ok) {
    log.warn("openai recusou", { status: res.status });
    return fora;
  }

  const corpo = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const texto = corpo.choices?.[0]?.message?.content;
  if (!texto) return fora;

  let lido: { r?: { u?: string; g?: string }[] };
  try {
    lido = JSON.parse(texto);
  } catch {
    log.warn("openai devolveu algo que não é JSON");
    return fora;
  }

  for (const item of lido.r ?? []) {
    // O modelo às vezes devolve o @ com arroba na frente; o nosso nunca tem.
    const u = String(item.u ?? "").replace(/^@+/, "").toLowerCase();
    const g = valida(item.g);
    if (u && g) fora.set(u, g);
  }

  log.info("classificou", {
    pedidas: pessoas.length,
    respondidas: fora.size,
    entrada: corpo.usage?.prompt_tokens,
    saida: corpo.usage?.completion_tokens,
  });
  return fora;
}

/**
 * Lê o que já sabemos e pergunta só o resto.
 *
 * Devolve um mapa @ → resposta. O que não estiver no mapa é porque não foi
 * possível saber — e quem chamou deve seguir com o próprio palpite.
 */
export async function quemSao(pessoas: PessoaParaLer[]): Promise<Map<string, Quem>> {
  const sabido = new Map<string, Quem>();
  if (!iaLigada() || pessoas.length === 0) return sabido;

  const unicas = new Map<string, PessoaParaLer>();
  for (const p of pessoas) {
    const u = p.username.trim().replace(/^@+/, "").toLowerCase();
    if (u && !unicas.has(u)) unicas.set(u, { ...p, username: u });
  }

  const guardadas = await prisma.sectionCache
    .findMany({
      where: { section: SECAO, username: { in: [...unicas.keys()] } },
      select: { username: true, data: true, fetchedAt: true },
    })
    .catch(() => []);

  const faltando = new Map(unicas);
  for (const linha of guardadas) {
    if (Date.now() - linha.fetchedAt.getTime() >= TTL) continue;
    const g = valida((linha.data as { g?: string } | null)?.g);
    if (!g) continue;
    sabido.set(linha.username, g);
    faltando.delete(linha.username);
  }

  if (faltando.size === 0) return sabido;

  try {
    const pendentes = [...faltando.values()].slice(0, LOTE * LOTES_EM_PARALELO);
    const lotes: PessoaParaLer[][] = [];
    for (let i = 0; i < pendentes.length; i += LOTE) lotes.push(pendentes.slice(i, i + LOTE));

    const respostas = await Promise.all(
      lotes.map((lote) => perguntar(lote).catch(() => new Map<string, Quem>())),
    );
    const novas = new Map<string, Quem>();
    for (const r of respostas) for (const [u, g] of r) novas.set(u, g);

    /*
     * As cinquenta linhas numa ida só, em SQL.
     *
     * Medido em 23/09 com este banco: uma a uma, a rota levava 44 SEGUNDOS;
     * em `$transaction`, 20 — porque a transação continua sendo cinquenta
     * idas, só que dentro de uma. A OpenAI, no meio disso tudo, leva 1,3s.
     *
     * Um `INSERT ... VALUES (...), (...)` é uma ida só. Os valores vão como
     * parâmetros, nunca interpolados: `@` vem do provedor, é texto de fora.
     */
    const linhas = [...novas.entries()];
    for (const [u, g] of linhas) sabido.set(u, g);

    if (linhas.length) {
      // $1,$2,$3 · $4,$5,$6 … — os valores viajam como parâmetros, nunca
      // colados na string: o @ vem do provedor, é texto de fora.
      const marcas = linhas
        .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3}::jsonb, NOW())`)
        .join(", ");
      const params = linhas.flatMap(([u, g]) => [u, SECAO, JSON.stringify({ g })]);
      await prisma
        .$executeRawUnsafe(
          `INSERT INTO section_cache (username, section, data, "fetchedAt") VALUES ${marcas} ` +
            `ON CONFLICT (username, section) DO UPDATE SET data = EXCLUDED.data, "fetchedAt" = NOW()`,
          ...params,
        )
        .catch((e: Error) => log.warn("não consegui guardar", { erro: e.message }));
    }
  } catch (e) {
    // Qualquer tropeço — rede, prazo, resposta estranha — cai no palpite antigo.
    log.warn("classificação falhou", { erro: (e as Error).message });
  }

  return sabido;
}
