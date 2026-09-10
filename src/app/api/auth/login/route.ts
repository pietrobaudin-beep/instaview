import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, loginUser } from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const user = await loginUser(parsed.data.email, parsed.data.password);
    return NextResponse.json({ id: user.id, email: user.email });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    return NextResponse.json({ error: "Login failed. Try again." }, { status: 500 });
  }
}
