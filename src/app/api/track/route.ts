import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { PlanLimitError, ValidationError, trackProfile } from "@/lib/profiles";

const log = logger.scope("api:track");
const bodySchema = z.object({ username: z.string().min(1).max(120) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "username is required" }, { status: 400 });

  try {
    const profile = await trackProfile(user, parsed.data.username);
    return NextResponse.json({ id: profile.id, username: profile.username });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof PlanLimitError) return NextResponse.json({ error: e.message }, { status: 402 });
    log.error("track failed", { error: e });
    return NextResponse.json({ error: "Failed to start tracking. Please try again." }, { status: 500 });
  }
}
