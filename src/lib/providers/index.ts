/**
 * Provider factory. The rest of the app imports `getProvider()` and never
 * references a concrete adapter. Switch providers with the INSTAGRAM_PROVIDER
 * env var — no other code changes.
 */
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { EnsembleDataProvider } from "./ensembledata-provider";
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
    case "ensembledata":
      cached = new EnsembleDataProvider({
        token: env.ENSEMBLEDATA_TOKEN,
        baseUrl: env.ENSEMBLEDATA_BASE_URL,
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
