import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { accessFor } from "@/lib/access";
import { checkAllowance, usageKey } from "@/lib/usage";
import { SECTIONS, getSection, previewOf, type Section } from "@/lib/raio-x";
import { isValidUsername, normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/raio-x?username=<@>&section=<stories|posts|reels|tagged|highlights|reposts|suggested|about>
 *
 * One section of a profile's Raio-X, fetched on demand and shared-cached.
 * Pro and "uso único" see it all; free visitors get the masked preview — and
 * only for the one profile their free analysis was spent on, checked before any
 * provider call so nothing is paid for a profile they can't open.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = normalizeUsername(url.searchParams.get("username") || "");
  const section = url.searchParams.get("section") as Section;
  if (!isValidUsername(username) || !SECTIONS.includes(section)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const access = await accessFor(user, username);
  const paid = access !== "free";

  if (!paid) {
    const allowance = await checkAllowance(usageKey(user), username);
    if (!allowance.allowed) {
      return NextResponse.json({ limited: true, spentOn: allowance.spentOn }, { status: 402 });
    }
  }

  const result = await getSection(username, section);
  if (result.status !== "ok") return NextResponse.json({ status: result.status, access, locked: !paid });

  return NextResponse.json({
    status: "ok",
    access,
    locked: !paid,
    fetchedAt: result.fetchedAt,
    data: paid ? result.data : previewOf(result.data),
  });
}
