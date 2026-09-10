/**
 * Centralized, validated environment access.
 * Fails fast at startup if something required is missing.
 */
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  APP_SECRET: z.string().min(1).default("dev-secret-change-me"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  INSTAGRAM_PROVIDER: z.enum(["mock", "hikerapi"]).default("mock"),
  PROVIDER_FOLLOWER_PAGES: z.coerce.number().int().positive().default(5),
  PROVIDER_PAGE_SIZE: z.coerce.number().int().positive().default(50),

  HIKERAPI_KEY: z.string().optional().default(""),
  HIKERAPI_BASE_URL: z.string().default("https://api.hikerapi.com"),

  CRON_SECRET: z.string().min(1).default("dev-cron-secret-change-me"),
  DEFAULT_COLLECTION_INTERVAL_MINUTES: z.coerce.number().int().positive().default(120),

  AUTH_MODE: z.enum(["dev", "supabase"]).default("dev"),

  STRIPE_SECRET_KEY: z.string().optional().default(""),
});

// Parse a subset of process.env. We keep this lenient so the app boots in dev.
const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Only DATABASE_URL is truly fatal; surface a clear message.
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  throw new Error(`Invalid environment configuration:\n${issues.join("\n")}`);
}

export const env = parsed.data;
export type Env = typeof env;
