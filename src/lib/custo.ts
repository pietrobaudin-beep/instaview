/**
 * O registro de custo: cada chamada paga que saiu do Farejo.
 *
 * Fica separado das franquias de propósito. A franquia é o que o CLIENTE
 * usou; este registro é o que a EMPRESA pagou. Os dois diferem quando uma
 * chamada falha — o cliente não perde a análise, mas o provedor pode ter
 * cobrado —, e quando é o Admin quem gasta.
 *
 * ## Quem gastou
 *
 * As chamadas acontecem fundo na pilha (dentro do provider), longe de quem
 * sabe o usuário. `comQuem` guarda isso no contexto assíncrono da requisição,
 * e o provider lê daqui sem precisar receber parâmetro novo em cada método.
 *
 * Registrar nunca derruba a chamada: se o banco falhar aqui, o gasto é logado
 * e a resposta segue.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.scope("custo");

interface Quem {
  userId?: string | null;
  admin?: boolean;
  motivo?: string;
}

const contexto = new AsyncLocalStorage<Quem>();

/** Roda `fn` sabendo quem está gastando. */
export function comQuem<T>(quem: Quem, fn: () => Promise<T>): Promise<T> {
  return contexto.run({ ...contexto.getStore(), ...quem }, fn);
}

export async function registrarChamada(
  provider: "hikerapi" | "apify" | "openai",
  endpoint: string,
  status: number | null,
): Promise<void> {
  const quem = contexto.getStore() ?? {};
  try {
    await prisma.providerCall.create({
      data: {
        provider,
        endpoint: endpoint.slice(0, 120),
        status,
        userId: quem.userId ?? null,
        admin: !!quem.admin,
        motivo: quem.motivo?.slice(0, 60) ?? null,
      },
    });
  } catch (e) {
    log.warn("não registrou chamada", { provider, endpoint, erro: (e as Error).message });
  }
}
