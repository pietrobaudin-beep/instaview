import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { allowedImageHost } from "@/lib/img-store";
import { SECAO_PREVIA, type Previa } from "@/lib/previa-seguindo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A foto de "Interage bastante com" na prévia grátis, **já borrada**.
 *
 * O endereço da foto de verdade fica no cache da prévia, no servidor; o
 * navegador só recebe esta imagem: reduzida a 12 px e ampliada com desfoque,
 * dá para ver cor e forma, não o rosto. Nunca lê o provedor — sem prévia no
 * cache, 404.
 */
export async function GET(req: Request) {
  const username = normalizeUsername(new URL(req.url).searchParams.get("username") || "");
  if (!isValidUsername(username)) return new NextResponse("invalid", { status: 400 });

  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username, section: SECAO_PREVIA() } } })
    .catch(() => null);
  const foto = (row?.data as unknown as Previa | undefined)?.destaqueFoto;
  if (!foto) return new NextResponse("not found", { status: 404 });

  let alvo: URL;
  try {
    alvo = new URL(foto);
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
  // Foto de teste (simulado) ou do CDN do Instagram.
  if (!allowedImageHost(alvo) && alvo.hostname !== "i.pravatar.cc") return new NextResponse("forbidden", { status: 403 });

  try {
    const res = await fetch(alvo, {
      headers: { "user-agent": "Mozilla/5.0", referer: "https://www.instagram.com/" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return new NextResponse("not found", { status: 404 });
    const original = Buffer.from(await res.arrayBuffer());
    const borrada = await sharp(await sharp(original).resize(12, 12).toBuffer())
      .resize(96, 96, { kernel: "cubic" })
      .blur(4)
      .jpeg({ quality: 60 })
      .toBuffer();
    return new NextResponse(borrada as unknown as BodyInit, {
      headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=3600" },
    });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}
