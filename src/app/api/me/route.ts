import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  // Empty string clears it.
  name: z.string().trim().max(40),
});

/** The signed-in person updates what they want to be called. */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use até 40 caracteres." }, { status: 400 });

  const name = parsed.data.name || null;
  await prisma.user.update({ where: { id: user.id }, data: { name } });
  return NextResponse.json({ ok: true, name });
}
