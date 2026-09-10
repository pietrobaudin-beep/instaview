import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { collectProfile } from "@/lib/monitoring/snapshot";

/** Manual "Refresh now" — runs a collection on demand for the owner. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await prisma.trackedProfile.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const summary = await collectProfile(profile.id);
  return NextResponse.json(summary);
}
