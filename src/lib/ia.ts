/**
 * A porta única para o modelo.
 *
 * Tudo que fala com a OpenAI passa por aqui — classificação, leitura de
 * story, resposta a pergunta. Um lugar só para as três regras que valem
 * sempre:
 *
 * 1. **Sem chave, não acontece.** Devolve `null` e quem chamou segue sem.
 * 2. **Com teto de tempo.** Nada do Farejo espera modelo indefinidamente.
 * 3. **Com teto de gasto.** O consumo é contado por dia, e passado o limite
 *    a porta fecha até amanhã.
 *
 * O que sai daqui é sempre texto do modelo — nunca vira fato na tela sem o
 * registro que o sustenta ao lado.
 */
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { consumirTeto } from "@/lib/teto-diario";
import { registrarChamada } from "@/lib/custo";

const log = logger.scope("ia");

/**
 * Quantas chamadas ao modelo por dia, no total da casa.
 *
 * Não é por pessoa: é o freio da casa inteira. Com o volume de hoje (11
 * perfis, ~9 análises por dia) isto sobra; existe para o caso de algo entrar
 * em laço e não para limitar uso legítimo.
 */
export const TETO_IA_DIA = 2000;

export interface Mensagem {
  role: "system" | "user";
  content: string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];
}

export interface Opcoes {
  /** Quanto esperar. Depende de onde roda: tela espera pouco, coleta espera mais. */
  tetoMs?: number;
  /** Teto da resposta. Resposta comprida aqui é sinal de que algo saiu do trilho. */
  maxTokens?: number;
  /** Modelo, quando a tarefa pede um diferente do padrão (visão, por exemplo). */
  modelo?: string;
  /** Exigir JSON de volta. A instrução precisa conter a palavra "JSON". */
  json?: boolean;
  /** Para o registro saber quem gastou. */
  tarefa: string;
}

export function iaLigada(): boolean {
  return !!env.OPENAI_API_KEY;
}

/**
 * Pergunta ao modelo. Devolve o texto, ou `null` quando não deu.
 *
 * Nunca lança: quem chama trata a ausência de resposta como "não sei", que é
 * sempre um caminho válido no Farejo.
 */
export async function conversar(
  mensagens: Mensagem[],
  opcoes: Opcoes,
): Promise<string | null> {
  if (!iaLigada()) return null;

  const { ok } = await consumirTeto("ia", `ia:${opcoes.tarefa}`, TETO_IA_DIA);
  if (!ok) {
    log.warn("teto do dia atingido", { tarefa: opcoes.tarefa });
    return null;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: opcoes.modelo ?? env.OPENAI_MODEL,
        messages: mensagens,
        max_completion_tokens: opcoes.maxTokens ?? 400,
        ...(opcoes.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(opcoes.tetoMs ?? 8000),
    });

    await registrarChamada("openai", opcoes.tarefa, res.status);

    if (!res.ok) {
      log.warn("openai recusou", { tarefa: opcoes.tarefa, status: res.status });
      return null;
    }

    const corpo = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    log.info("conversou", {
      tarefa: opcoes.tarefa,
      entrada: corpo.usage?.prompt_tokens,
      saida: corpo.usage?.completion_tokens,
    });

    return corpo.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    log.warn("conversa falhou", { tarefa: opcoes.tarefa, erro: (e as Error).message });
    return null;
  }
}

/** O mesmo, já com o JSON aberto. Devolve `null` se vier qualquer outra coisa. */
export async function conversarJson<T>(mensagens: Mensagem[], opcoes: Opcoes): Promise<T | null> {
  const texto = await conversar(mensagens, { ...opcoes, json: true });
  if (!texto) return null;
  try {
    return JSON.parse(texto) as T;
  } catch {
    log.warn("resposta não era JSON", { tarefa: opcoes.tarefa });
    return null;
  }
}
