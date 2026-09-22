/**
 * Provider factory. The rest of the app imports `getProvider()` and never
 * references a concrete adapter. Switch providers with the INSTAGRAM_PROVIDER
 * env var — no other code changes.
 *
 * O EnsembleData saiu em 22/09. Não era usado em lugar nenhum (o cache do
 * banco só tinha chaves `hikerapi:` e `mock:`), mas continuava aceitável como
 * valor da variável — e os perfis que quebraram na época dele seguiam
 * travados com mensagens de um provedor que não existe mais.
 */
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { HikerApiProvider } from "./hiker-provider";
import { MockProvider } from "./mock-provider";
import type { InstagramDataProvider } from "./types";

let cached: InstagramDataProvider | null = null;

export function getProvider(): InstagramDataProvider {
  if (cached) return cached;

  switch (env.INSTAGRAM_PROVIDER) {
    case "hikerapi":
      cached = new HikerApiProvider({
        apiKey: env.HIKERAPI_KEY,
        baseUrl: env.HIKERAPI_BASE_URL,
        defaultPageSize: env.PROVIDER_PAGE_SIZE,
      });
      break;
    case "mock":
    default:
      cached = new MockProvider();
      break;
  }

  logger.info("instagram provider initialized", {
    provider: cached.name,
    supportsFollowerList: cached.supportsFollowerList,
  });
  return cached;
}

export * from "./types";
