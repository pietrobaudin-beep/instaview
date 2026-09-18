import { NextResponse } from "next/server";
import { z } from "zod";
import { clearSessionCookie, devSignIn } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { env } from "@/lib/env";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

/**
 * Passwordless login for LOCAL development only.
 *
 * It signs you in as any email with no password, so it must never answer on a
 * deployed site. AUTH_MODE defaults to "dev" when unset, which is exactly how
 * it ended up open in production — so the environment check below does not
 * rely on configuration: a production build refuses, whatever AUTH_MODE says.
 */
function devLoginAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && env.AUTH_MODE === "dev";
}

export async function POST(req: Request) {
  if (!devLoginAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
