/**
 * O que está escrito e o que aparece num story.
 *
 * ## Por que
 *
 * O story sai do ar em 24 horas. O Farejo guarda a miniatura, mas uma
 * miniatura não se procura: quem quer achar "aquele story do cupom" não tem
 * por onde. Aqui a imagem vira **texto** — assunto, o que está escrito e as
 * marcas citadas — e a partir daí ela existe para a busca.
 *
 * ## O limite, que é regra e não detalhe
 *
 * O modelo descreve **conteúdo**: cena, texto na tela, marca. Ele não
 * identifica pessoa, não diz quem está na foto e não adivinha relação entre
 * ninguém. Reconhecer rosto de gente sem consentimento é dado sensível pela
 * LGPD e é proibido pela própria OpenAI — e mudaria o que o Farejo é.
 *
 * ## De onde vem a imagem
 *
 * Da cópia que o Farejo já guardou (`img-store`), em base64. O endereço do
 * CDN vence em dias e a OpenAI não alcança o nosso localhost; a cópia é o
 * único caminho que funciona sempre.
 */
import { prisma } from "@/lib/db";
import { conversarJson, iaLigada, iaSimulada } from "@/lib/ia";
import { imageKey, readStored } from "@/lib/img-store";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

const log = logger.scope("stories-ia");

/** Guardada por story, para sempre: a imagem não muda mais depois de lida. */
const SECAO = "ia:story";

/** Modelo com visão. O nano não lê imagem. */
const MODELO_VISAO = "gpt-5.4-mini-2026-03-17";

export interface LeituraDeStory {
  /** Uma frase sobre o que o story mostra. */
  assunto: string;
  /** O texto que aparece escrito na imagem, se houver. */
  texto: string | null;
  /** Marcas, lugares ou produtos citados. */
  marcas: string[];
}

const INSTRUCAO =
  "Você vê a imagem de um story do Instagram. Responda em JSON " +
  '{"assunto":"uma frase curta em português sobre o que a imagem mostra",' +
  '"texto":"o texto escrito na imagem, ou null","marcas":["marca ou lugar citado"]}. ' +
  "Descreva apenas o CONTEÚDO: cena, objetos, texto, marca. " +
  "NUNCA identifique pessoas, não diga quem aparece, não descreva rosto nem " +
  'características físicas. Se houver gente, diga apenas "uma pessoa" ou "pessoas".';

async function imagemEmBase64(url: string): Promise<string | null> {
  try {
    const copia = await readStored(imageKey(new URL(url)));
    if (copia) return `data:${copia.type};base64,${copia.bytes.toString("base64")}`;
  } catch {
    /* segue para a tentativa direta */
  }
  // Sem cópia, tenta o endereço original — vale enquanto ele não venceu.
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > 400_000) return null;
    return `data:${res.headers.get("content-type") || "image/jpeg"};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Lê um story, guarda e devolve. Se já foi lido, devolve o que está guardado. */
export async function lerStory(eventId: string, thumbnailUrl: string | null): Promise<LeituraDeStory | null> {
  if (!iaLigada() || !thumbnailUrl) return null;

  const guardada = await prisma.sectionCache
    .findUnique({ where: { username_section: { username: eventId, section: SECAO } } })
    .catch(() => null);
  if (guardada) return guardada.data as unknown as LeituraDeStory;

  const imagem = iaSimulada() ? "data:image/gif;base64,R0lGODlhAQABAAAAACw=" : await imagemEmBase64(thumbnailUrl);
  if (!imagem) return null;

  const lido = await conversarJson<LeituraDeStory>(
    [
      { role: "system", content: INSTRUCAO },
      { role: "user", content: [{ type: "image_url", image_url: { url: imagem } }] },
    ],
    { tarefa: "story", modelo: MODELO_VISAO, tetoMs: 20000, maxTokens: 300 },
  );
  if (!lido?.assunto) return null;

  const limpa: LeituraDeStory = {
    assunto: String(lido.assunto).slice(0, 200),
    texto: lido.texto ? String(lido.texto).slice(0, 400) : null,
    marcas: Array.isArray(lido.marcas) ? lido.marcas.slice(0, 6).map((m) => String(m).slice(0, 40)) : [],
  };

  await prisma.sectionCache
    .upsert({
      where: { username_section: { username: eventId, section: SECAO } },
      create: { username: eventId, section: SECAO, data: limpa as unknown as Prisma.InputJsonValue },
      update: { data: limpa as unknown as Prisma.InputJsonValue },
    })
    .catch(() => null);

  return limpa;
}

/** O que já foi lido destes stories, sem pedir nada ao modelo. */
export async function leiturasGuardadas(ids: string[]): Promise<Map<string, LeituraDeStory>> {
  const fora = new Map<string, LeituraDeStory>();
  if (!ids.length) return fora;
  const linhas = await prisma.sectionCache
    .findMany({ where: { section: SECAO, username: { in: ids } }, select: { username: true, data: true } })
    .catch(() => []);
  for (const l of linhas) fora.set(l.username, l.data as unknown as LeituraDeStory);
  return fora;
}

/**
 * Lê vários, em fila curta.
 *
 * Em fila e não todos de uma vez: cada imagem é um pedido grande, e quinze
 * ao mesmo tempo é a receita para estourar o tempo da função.
 */
export async function lerVarios(
  stories: { id: string; thumbnailUrl: string | null }[],
  teto = 15,
): Promise<Map<string, LeituraDeStory>> {
  const fora = await leiturasGuardadas(stories.map((s) => s.id));
  const faltando = stories.filter((s) => !fora.has(s.id)).slice(0, teto);

  for (let i = 0; i < faltando.length; i += 3) {
    const lote = faltando.slice(i, i + 3);
    const lidos = await Promise.all(lote.map((s) => lerStory(s.id, s.thumbnailUrl)));
    lote.forEach((s, j) => {
      const l = lidos[j];
      if (l) fora.set(s.id, l);
    });
  }

  log.info("stories lidos", { pedidos: stories.length, novos: faltando.length, total: fora.size });
  return fora;
}
