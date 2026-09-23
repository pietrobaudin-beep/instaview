/**
 * Centralized, validated environment access.
 *
 * Design: NEVER throw at import time. A missing/blank var must not crash the
 * Next.js build (Vercel collects page data before runtime env is guaranteed).
 * Blank strings are treated as "unset" so schema defaults apply. Anything truly
 * required at runtime (e.g. DATABASE_URL) surfaces a clear error when first used
 * (Prisma), not during the build.
 */
import { z } from "zod";

/** Treat empty/whitespace-only values as undefined so `.default()` applies. */
function clean(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

const schema = z.object({
  DATABASE_URL: z.string().default(""),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  APP_SECRET: z.string().default("dev-secret-change-me"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  INSTAGRAM_PROVIDER: z.enum(["mock", "hikerapi"]).default("mock"),
  PROVIDER_FOLLOWER_PAGES: z.coerce.number().int().positive().default(5),
  PROVIDER_PAGE_SIZE: z.coerce.number().int().positive().default(50),

  HIKERAPI_KEY: z.string().default(""),
  /** Token do Apify, para procurar o mesmo @ em outras redes. Vazio = desligado. */
  APIFY_TOKEN: z.string().default(""),
  /**
   * Chave da OpenAI. Vazia = desligado, e é o padrão: nada no Farejo depende
   * dela para funcionar. Entra para ler nome e bio e dizer se a conta é de
   * mulher, de homem ou de marca — hoje isso é um palpite pelo primeiro nome.
   *
   * O que o modelo escrever nunca vira fato na tela: vira leitura.
   */
  OPENAI_API_KEY: z.string().default(""),
  HIKERAPI_BASE_URL: z.string().default("https://api.hikerapi.com"),


  CRON_SECRET: z.string().default("dev-cron-secret-change-me"),
  DEFAULT_COLLECTION_INTERVAL_MINUTES: z.coerce.number().int().positive().default(120),

  AUTH_MODE: z.enum(["dev", "supabase"]).default("dev"),

  STRIPE_SECRET_KEY: z.string().default(""),

  // Admin panel access.
  ADMIN_EMAILS: z.string().default(""), // comma-separated list of admin emails
  ADMIN_TOKEN: z.string().default(""), // shared secret required to log in as admin

  // Sign-in codes by email (Resend). Unset → email codes only work on localhost.
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("Farejo <codigo@farejoapp.com>"),

  // Sign-in codes by WhatsApp (official Meta Cloud API, with an approved
  // "authentication" template). Unset → the WhatsApp option is hidden.
  WHATSAPP_TOKEN: z.string().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(""),
  WHATSAPP_TEMPLATE: z.string().default("codigo_farejo"),
  WHATSAPP_TEMPLATE_LANG: z.string().default("pt_BR"),
  WHATSAPP_API_VERSION: z.string().default("v21.0"),
  // Most WhatsApp codes sent per day, so nobody can run up the bill.
  WHATSAPP_DAILY_CAP: z.coerce.number().int().positive().default(300),
});

const raw = {
  DATABASE_URL: clean(process.env.DATABASE_URL),
  NEXT_PUBLIC_APP_URL: clean(process.env.NEXT_PUBLIC_APP_URL),
  APP_SECRET: clean(process.env.APP_SECRET),
  LOG_LEVEL: clean(process.env.LOG_LEVEL),
  INSTAGRAM_PROVIDER: clean(process.env.INSTAGRAM_PROVIDER),
  PROVIDER_FOLLOWER_PAGES: clean(process.env.PROVIDER_FOLLOWER_PAGES),
  PROVIDER_PAGE_SIZE: clean(process.env.PROVIDER_PAGE_SIZE),
  HIKERAPI_KEY: clean(process.env.HIKERAPI_KEY),
  APIFY_TOKEN: clean(process.env.APIFY_TOKEN),
  OPENAI_API_KEY: clean(process.env.OPENAI_API_KEY),
  HIKERAPI_BASE_URL: clean(process.env.HIKERAPI_BASE_URL),
  CRON_SECRET: clean(process.env.CRON_SECRET),
  DEFAULT_COLLECTION_INTERVAL_MINUTES: clean(process.env.DEFAULT_COLLECTION_INTERVAL_MINUTES),
  AUTH_MODE: clean(process.env.AUTH_MODE),
  STRIPE_SECRET_KEY: clean(process.env.STRIPE_SECRET_KEY),
  ADMIN_EMAILS: clean(process.env.ADMIN_EMAILS),
  ADMIN_TOKEN: clean(process.env.ADMIN_TOKEN),
  RESEND_API_KEY: clean(process.env.RESEND_API_KEY),
  EMAIL_FROM: clean(process.env.EMAIL_FROM),
  WHATSAPP_TOKEN: clean(process.env.WHATSAPP_TOKEN),
  WHATSAPP_PHONE_NUMBER_ID: clean(process.env.WHATSAPP_PHONE_NUMBER_ID),
  WHATSAPP_TEMPLATE: clean(process.env.WHATSAPP_TEMPLATE),
  WHATSAPP_TEMPLATE_LANG: clean(process.env.WHATSAPP_TEMPLATE_LANG),
  WHATSAPP_API_VERSION: clean(process.env.WHATSAPP_API_VERSION),
  WHATSAPP_DAILY_CAP: clean(process.env.WHATSAPP_DAILY_CAP),
};

const parsed = schema.safeParse(raw);

// Fall back to all-defaults if something is still off — the build must proceed.
export const env = parsed.success ? parsed.data : schema.parse({});
export type Env = typeof env;
