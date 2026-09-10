import { NextResponse } from "next/server";
import { z } from "zod";
import { clearSessionCookie, devSignIn } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { env } from "@/lib/env";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export async function POST(req: Request) {
  if (env.AUTH_MODE !== "dev") {
    return NextResponse.json({ error: "Dev login disabled (AUTH_MODE != dev)" }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  // Admin emails cannot be claimed through the public passwordless login —
  // they must go through /api/admin/login with the ADMIN_TOKEN secret.
  if (isAdminEmail(parsed.data.email)) {
    return NextResponse.json({ error: "Use the admin login for this account" }, { status: 403 });
  }
  const user = await devSignIn(parsed.data.email, parsed.data.name);
  return NextResponse.json({ id: user.id, email: user.email, plan: user.plan });
}

export async function DELETE() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
