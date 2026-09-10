import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { env } from "@/lib/env";

const bodySchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
});

/**
 * Admin login. Requires the email to be in ADMIN_EMAILS AND a matching
 * ADMIN_TOKEN. Upserts the user and sets the session.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { email, token } = parsed.data;

  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Invalid admin token" }, { status: 401 });
  }
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "This email is not an admin" }, { status: 403 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: email.split("@")[0] },
    update: {},
  });
  setSessionCookie(user.id);
  return NextResponse.json({ ok: true, email: user.email });
}
