import { NextResponse } from "next/server";
import { cronAllowed } from "@/lib/cron-auth";
import { runFaroDaily } from "@/lib/faro-watch";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds (Vercel)

/**
 * The daily Faro (see lib/faro-watch). Scheduled in vercel.json; protected by
 * CRON_SECRET, and refused on the live site until a real secret is set.
 */
async function handle(req: Request) {
  if (!cronAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runFaroDaily()) });
}

export const GET = handle;
export const POST = handle;
