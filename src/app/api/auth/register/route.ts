import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, registerUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

const log = logger.scope("api:register");
const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    const user = await registerUser(parsed.data.email, parsed.data.password, parsed.data.name);
    return NextResponse.json({ id: user.id, email: user.email });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 409 });
    log.error("register failed", { error: e });
    return NextResponse.json({ error: "Could not create account. Try again." }, { status: 500 });
  }
}
