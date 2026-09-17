import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EMPTY_HISTORY, getProfileHistory } from "@/lib/profile-history";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { logger } from "@/lib/logger";

const log = logger.scope("api:profile-history");

export const dynamic = "force-dynamic";

/**
 * History, timeline and alerts for a profile the signed-in user has saved.
 * Reads only stored snapshots — no provider calls, so it costs nothing.
 */
export async function GET(req: Request) {
  const username = normalizeUsername(new URL(req.url).searchParams.get("username") || "");
  if (!isValidUsername(username)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ saved: false, ...EMPTY_HISTORY });

  try {
    const profile = await prisma.trackedProfile.findUnique({
      where: { userId_username: { userId: user.id, username } },
      select: { id: true, monitoringStartedAt: true },
    });
    if (!profile) return NextResponse.json({ saved: false, ...EMPTY_HISTORY });

    const history = await getProfileHistory(profile.id);
    return NextResponse.json({
      saved: true,
      monitoringSince: profile.monitoringStartedAt.toISOString(),
      ...history,
    });
  } catch (e) {
    log.warn("history failed", { username, error: (e as Error).message });
    return NextResponse.json({ saved: false, ...EMPTY_HISTORY });
  }
}
