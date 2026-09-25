import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paraGravar, readPrefs } from "@/lib/tracking-prefs";
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

  // A tela manda `stories`; no banco ele vive como `guardarStories`.
  const vindo = parsed.data.prefs as Record<string, unknown>;
  const prefs = {
    ...readPrefs(vindo),
    ...(typeof vindo?.stories === "boolean" ? { stories: vindo.stories } : {}),
  };
  await prisma.trackedProfile.update({
    where: { id: profile.id },
    data: { trackingPrefs: paraGravar(prefs) },
  });
  return NextResponse.json({ ok: true, prefs });
}
