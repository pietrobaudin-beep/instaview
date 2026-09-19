import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin";
import { requestCode } from "@/lib/login-code/codes";
import { availableChannels } from "@/lib/login-code/senders";
import { maskTarget, normalizeTarget } from "@/lib/login-code/targets";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  channel: z.enum(["email", "whatsapp"]),
  target: z.string().min(3).max(254),
});

/** Step 1 of signing in: send a one-time code to an email or WhatsApp number. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  const { channel } = parsed.data;
  if (!availableChannels().includes(channel)) {
    return NextResponse.json({ error: "Essa forma de entrar ainda não está disponível." }, { status: 400 });
  }
  const target = normalizeTarget(channel, parsed.data.target);
  if (!target) {
    return NextResponse.json(
      { error: channel === "email" ? "Confira o e-mail digitado." : "Confira o número, com DDD." },
      { status: 400 },
    );
  }
  // Admin accounts keep their stronger door (email + ADMIN_TOKEN at /admin).
  if (channel === "email" && isAdminEmail(target)) {
    return NextResponse.json({ error: "Essa conta entra pelo acesso de admin." }, { status: 403 });
  }

  const result = await requestCode(channel, target);
  if (!result.ok) {
    const error = {
      cooldown: `Espere ${"retryInSec" in result ? result.retryInSec : 60}s para pedir outro código.`,
      too_many: "Muitos códigos pedidos. Tente de novo daqui a uma hora.",
      daily_cap: "O WhatsApp está com muita procura agora. Tente pelo e-mail.",
      delivery: "Não conseguimos enviar o código. Tente de novo em instantes.",
    }[result.reason];
    const status = result.reason === "delivery" ? 502 : 429;
    return NextResponse.json({ error, ...("retryInSec" in result ? { retryInSec: result.retryInSec } : {}) }, { status });
  }

  return NextResponse.json({
    ok: true,
    sentTo: maskTarget(channel, target),
    // Only on localhost without keys: the code wasn't really sent anywhere.
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
}
