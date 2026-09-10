import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { runDueJobs } from "@/lib/monitoring/runner";

const log = logger.scope("api:cron");

// Never cache; this must run fresh every invocation.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds (Vercel)

/**
 * Collection tick. Protected by CRON_SECRET.
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 * You can also call it manually:
 *   curl -X POST localhost:3000/api/cron -H "Authorization: Bearer $CRON_SECRET"
 */
async function handle(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "");
  const url = new URL(req.url);
  const queryKey = url.searchParams.get("key");

  if (provided !== env.CRON_SECRET && queryKey !== env.CRON_SECRET) {
    log.warn("cron unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await runDueJobs();
  return NextResponse.json({ ok: true, ...report });
}

export async function POST(req: Request) {
  return handle(req);
}

// Vercel Cron issues GET requests.
export async function GET(req: Request) {
  return handle(req);
}
