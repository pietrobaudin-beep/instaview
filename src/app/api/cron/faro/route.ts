import { NextResponse } from "next/server";
import { cronAllowed } from "@/lib/cron-auth";
import { runFaroDaily } from "@/lib/faro-watch";
import { limparAcervo } from "@/lib/acervo";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds (Vercel)

/**
 * The daily Faro AI (see lib/faro-watch). Scheduled in vercel.json; protected by
 * CRON_SECRET, and refused on the live site until a real secret is set.
 */
async function handle(req: Request) {
  if (!cronAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coleta = await runFaroDaily();
  // A limpeza do acervo roda junto, uma vez por dia (ver `acervo.ts`).
  const limpeza = await limparAcervo().catch(() => null);
  return NextResponse.json({ ok: true, ...coleta, limpeza });
}

export const GET = handle;
export const POST = handle;
