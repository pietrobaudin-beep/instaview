import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { env } from "@/lib/env";
import { timingSafeEqual } from "crypto";
import { clearFailures, isLocked, recordFailure } from "@/lib/attempt-limit";

const bodySchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
});

/** Constant-time comparison, so response timing reveals nothing about the token. */
function sameToken(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Admin login. Requires the email to be in ADMIN_EMAILS AND a matching
 * ADMIN_TOKEN. Upserts the user and sets the session. Repeated failures are
 * slowed down (see lib/attempt-limit): 5 per place / 30 overall per 15 min.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { email, token } = parsed.data;

  if (await isLocked("admin", req)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Espere 15 minutos e tente de novo." },
      { status: 429 },
    );
  }

  // One answer for both mistakes, so a guess never learns which part was wrong.
  if (!env.ADMIN_TOKEN || !sameToken(token, env.ADMIN_TOKEN) || !isAdminEmail(email)) {
    await recordFailure("admin", req);
    return NextResponse.json({ error: "E-mail ou token de admin inválido." }, { status: 401 });
  }
  await clearFailures("admin", req);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: email.split("@")[0] },
    update: {},
  });
  setSessionCookie(user.id);
  return NextResponse.json({ ok: true, email: user.email });
}
