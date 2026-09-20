import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usageKey } from "@/lib/usage";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * "Estou aqui" — o sinal que a página manda a cada 30 segundos.
 *
 * Grava **uma linha por visitante**, regravada a cada sinal: não é um registro
 * por pageview, é o estado atual de quem está com o site aberto. Quem está
 * "agora" é quem deu sinal nos últimos 2 minutos.
 *
 * O que se guarda: um número anônimo (o mesmo cookie de uso), a página aberta,
 * o país/cidade que a Vercel calcula na borda, celular ou computador, e de
 * onde a pessoa veio. **Nunca o IP**, nem nada que diga quem ela é.
 */
const LIMPAR_APOS = 24 * 60 * 60 * 1000;

function origem(ref: string | null): string | null {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    return h.endsWith("farejoapp.com") ? null : h;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { path?: string; referrer?: string };
  const path = (body.path || "/").slice(0, 120);

  // Chave anônima: para quem está logado é o id da conta; para visitante, o
  // cookie assinado que já existe para contar farejos.
  const user = await getCurrentUser().catch(() => null);
  const visitorId = usageKey(user);

  const h = req.headers;
  const ua = h.get("user-agent") ?? "";
  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? "celular" : "computador";
  const country = h.get("x-vercel-ip-country");
  const cityRaw = h.get("x-vercel-ip-city");
  const city = cityRaw ? decodeURIComponent(cityRaw) : null;

  const dados = {
    path,
    country,
    city,
    device,
    referrer: origem(body.referrer ?? h.get("referer")),
    lastSeenAt: new Date(),
  };

  await prisma.liveVisit
    .upsert({ where: { visitorId }, create: { visitorId, ...dados }, update: dados })
    .catch(() => null);

  // Varre o que é velho de vez em quando, para a tabela não crescer sem fim.
  if (Math.random() < 0.02) {
    await prisma.liveVisit
      .deleteMany({ where: { lastSeenAt: { lt: new Date(Date.now() - LIMPAR_APOS) } } })
      .catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
