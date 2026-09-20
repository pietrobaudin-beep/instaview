/**
 * Who may trigger a scheduled job. Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>`; a manual call may pass `?key=`.
 *
 * On the live site the secret must be a real one: the built-in default is
 * public (it's in the code), and these jobs spend provider credits.
 */
import { env } from "@/lib/env";

const DEFAULT_SECRET = "dev-cron-secret-change-me";

export function cronAllowed(req: Request): boolean {
  const secret = env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret === DEFAULT_SECRET)) return false;
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const key = new URL(req.url).searchParams.get("key");
  return bearer === secret || key === secret;
}
