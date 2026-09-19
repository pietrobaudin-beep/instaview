import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin";
import { signInWithVerifiedTarget } from "@/lib/auth";
import { verifyCode } from "@/lib/login-code/codes";
import { normalizeTarget } from "@/lib/login-code/targets";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  channel: z.enum(["email", "whatsapp"]),
  target: z.string().min(3).max(254),
  code: z.string().min(4).max(12),
});

/** Step 2: trade the code for a session. Creates the account the first time. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  const { channel, code } = parsed.data;
  const target = normalizeTarget(channel, parsed.data.target);
  if (!target || (channel === "email" && isAdminEmail(target))) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const result = await verifyCode(target, code);
  if (!result.ok) {
    const error = {
      invalid: "Código errado. Confira e tente de novo.",
      expired: "Esse código expirou. Peça um novo.",
      locked: "Muitas tentativas. Peça um novo código.",
    }[result.reason];
    return NextResponse.json({ error, reason: result.reason }, { status: 400 });
  }

  const { user, isNew } = await signInWithVerifiedTarget(channel, target);
  return NextResponse.json({ ok: true, isNew, needsName: !user.name });
}
