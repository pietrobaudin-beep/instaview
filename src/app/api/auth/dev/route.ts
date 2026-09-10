import { NextResponse } from "next/server";
import { z } from "zod";
import { clearSessionCookie, devSignIn } from "@/lib/auth";
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
  const user = await devSignIn(parsed.data.email, parsed.data.name);
  return NextResponse.json({ id: user.id, email: user.email, plan: user.plan });
}

export async function DELETE() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
