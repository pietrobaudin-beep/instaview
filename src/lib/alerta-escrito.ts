/**
 * "Me avise quando…" — o alerta que a pessoa escreve com as próprias palavras.
 *
 * Os alertas do Farejo sempre foram de tipo fixo: novo seguido, unfollow,
 * story. Aqui a pessoa descreve o que quer em português — "quando publicar
 * sobre um lançamento", "quando aparecer cupom de desconto" — e cada
 * publicação nova é comparada com esse pedido na hora da coleta.
 *
 * ## Onde isso roda, e por quê
 *
 * Na coleta, nunca na tela. Duas razões: a publicação só existe uma vez (não
 * adianta avaliar de novo a cada visita), e a pessoa não está olhando quando
 * o Faro AI passa — é justamente esse o ponto do produto.
 *
 * ## O que o modelo decide, e o que ele não decide
 *
 * Ele responde uma coisa só: **esta publicação casa com o pedido?** Sim ou
 * não, mais uma frase dizendo o que viu. Não julga intenção de ninguém, não
 * fala de pessoas, não conclui nada além do que está na publicação.
 */
import { prisma } from "@/lib/db";
import { conversarJson, iaLigada } from "@/lib/ia";
import { logger } from "@/lib/logger";
import type { EventData } from "@/lib/faro-watch";
import type { Prisma } from "@prisma/client";

const log = logger.scope("alerta-escrito");

/** O pedido de cada perfil. Uma linha por perfil acompanhado. */
const SECAO = "alerta-escrito";

/** O veredito, guardado por publicação: o mesmo post não é avaliado duas vezes. */
const SECAO_VEREDITO = "ia:alerta";

export interface Veredito {
  bate: boolean;
  porque: string;
  pedido: string;
}

export async function lerPedido(profileId: string): Promise<string | null> {
  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username: profileId, section: SECAO } } })
    .catch(() => null);
  const texto = (row?.data as { texto?: string } | null)?.texto;
  return texto?.trim() || null;
}

export async function guardarPedido(profileId: string, texto: string): Promise<void> {
  const limpo = texto.trim().slice(0, 200);
  const data = { texto: limpo } as unknown as Prisma.InputJsonValue;
  await prisma.sectionCache
    .upsert({
      where: { username_section: { username: profileId, section: SECAO } },
      create: { username: profileId, section: SECAO, data },
      update: { data, fetchedAt: new Date() },
    })
    .catch(() => null);
}

const INSTRUCAO =
  "Alguém pediu para ser avisado sobre um assunto. Você recebe o PEDIDO e uma " +
  "PUBLICAÇÃO de um perfil do Instagram. Responda em JSON " +
  '{"bate":true|false,"porque":"uma frase curta em português dizendo o que na publicação casa (ou não) com o pedido"}. ' +
  "Julgue apenas o conteúdo da publicação contra o pedido. " +
  "Não especule intenção de ninguém, não fale sobre pessoas, não conclua nada " +
  "além do que está escrito. Na dúvida, responda false.";

/**
 * Avalia as publicações novas contra o pedido. Devolve as que bateram.
 *
 * Roda uma vez por publicação — o veredito fica guardado. Se a pessoa mudar o
 * pedido, o veredito antigo continua valendo para os posts antigos: reavaliar
 * o passado inteiro a cada troca de frase custaria caro e não é o que se
 * espera de um alerta.
 */
export async function avaliarNovidades(
  profileId: string,
  eventos: { id: string; kind: string; data: unknown }[],
): Promise<{ eventId: string; veredito: Veredito }[]> {
  const pedido = await lerPedido(profileId);
  if (!pedido || !iaLigada() || !eventos.length) return [];

  const jaVistos = await prisma.sectionCache
    .findMany({
      where: { section: SECAO_VEREDITO, username: { in: eventos.map((e) => e.id) } },
      select: { username: true },
    })
    .catch(() => []);
  const vistos = new Set(jaVistos.map((v) => v.username));

  const fora: { eventId: string; veredito: Veredito }[] = [];

  // No máximo 10 por passagem: alerta é para o que chega, não para varrer o
  // passado, e a coleta roda dentro do tempo de uma função.
  for (const evento of eventos.filter((e) => !vistos.has(e.id)).slice(0, 10)) {
    const d = evento.data as EventData;
    const descricao = [
      `tipo: ${evento.kind}`,
      d?.caption ? `legenda: "${d.caption}"` : null,
      d?.people?.length ? `marca as contas: ${d.people.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const lido = await conversarJson<{ bate?: boolean; porque?: string }>(
      [
        { role: "system", content: INSTRUCAO },
        { role: "user", content: `PEDIDO: ${pedido}\n\nPUBLICAÇÃO:\n${descricao}` },
      ],
      { tarefa: "alerta", tetoMs: 12000, maxTokens: 200 },
    );
    if (!lido) continue;

    const veredito: Veredito = {
      bate: lido.bate === true,
      porque: String(lido.porque ?? "").slice(0, 200),
      pedido,
    };

    await prisma.sectionCache
      .upsert({
        where: { username_section: { username: evento.id, section: SECAO_VEREDITO } },
        create: {
          username: evento.id,
          section: SECAO_VEREDITO,
          data: veredito as unknown as Prisma.InputJsonValue,
        },
        update: { data: veredito as unknown as Prisma.InputJsonValue },
      })
      .catch(() => null);

    if (veredito.bate) fora.push({ eventId: evento.id, veredito });
  }

  if (fora.length) log.info("alerta bateu", { profileId, quantos: fora.length });
  return fora;
}

/** Os vereditos que bateram, para a tela mostrar. */
export async function vereditosQueBateram(
  eventIds: string[],
): Promise<Map<string, Veredito>> {
  const fora = new Map<string, Veredito>();
  if (!eventIds.length) return fora;
  const linhas = await prisma.sectionCache
    .findMany({
      where: { section: SECAO_VEREDITO, username: { in: eventIds } },
      select: { username: true, data: true },
    })
    .catch(() => []);
  for (const l of linhas) {
    const v = l.data as unknown as Veredito;
    if (v?.bate) fora.set(l.username, v);
  }
  return fora;
}
