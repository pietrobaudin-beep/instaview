import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.scope("api:full-capture");
const bodySchema = z.object({ enabled: z.boolean() });

/** Toggle full follower-list capture (enables unfollow detection) for a profile. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "enabled is required" }, { status: 400 });

  const profile = await prisma.trackedProfile.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.trackedProfile.update({
    where: { id: profile.id },
    data: { captureFull: parsed.data.enabled },
  });
  log.info("full capture toggled", { profileId: profile.id, enabled: parsed.data.enabled });
  return NextResponse.json({ ok: true, captureFull: parsed.data.enabled });
}
