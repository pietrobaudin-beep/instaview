import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readPrefs } from "@/lib/tracking-prefs";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

const bodySchema = z.object({
  username: z.string().min(1).max(120),
  prefs: z.record(z.unknown()),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const username = normalizeUsername(parsed.data.username);
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  // Scoped to this user's own tracked profile, so one account cannot touch
  // another's settings.
  const profile = await prisma.trackedProfile.findUnique({
    where: { userId_username: { userId: user.id, username } },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const prefs = readPrefs(parsed.data.prefs);
  await prisma.trackedProfile.update({
    where: { id: profile.id },
    data: { trackingPrefs: { ...prefs } },
  });
  return NextResponse.json({ ok: true, prefs });
}
