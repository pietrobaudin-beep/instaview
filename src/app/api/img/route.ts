import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { allowedImageHost, imageKey, readStored, writeStored } from "@/lib/img-store";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger.scope("api:img");

/**
 * Proxy das fotos do Instagram — perfil e story.
 *
 * O CDN bloqueia carregamento a partir de outro site, então quem busca é o
 * servidor. E **o endereço vence**: vem assinado, com hora de validade. Por
 * isso, na primeira vez que uma imagem é baixada, a cópia fica guardada — é ela
 * que sustenta a tela quando o endereço morre, inclusive depois de um story
 * expirar no Instagram. Ver `src/lib/img-store.ts`.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return new NextResponse("missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (!allowedImageHost(target)) return new NextResponse("forbidden host", { status: 403 });

  const key = imageKey(target);
  const serve = (bytes: Buffer, type: string) =>
    new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });

  /*
   * A cópia guardada primeiro. Antes o proxy tentava o Instagram antes — e o
   * endereço de story e de foto antiga já venceu: cada imagem esperava até 10s
   * de erro para só então cair na cópia, e o painel do Faro AI ficava com os
   * quadrinhos em branco. Com cópia, a resposta sai do banco, na hora.
   */
  const guardada = await readStored(key);
  if (guardada) return serve(guardada.bytes, guardada.type);

  try {
    const res = await fetch(target, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        referer: "https://www.instagram.com/",
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      const type = res.headers.get("content-type") || "image/jpeg";
      const bytes = Buffer.from(await res.arrayBuffer());
      // Cópia só para quem está logado, e com prazo (10 dias, `acervo.ts`).
      // Antes qualquer visitante gravava uma cópia sem prazo de toda imagem
      // que passasse por aqui — e nada apagava.
      if (await getCurrentUser()) await writeStored(key, type, bytes, "proxy");
      return serve(bytes, type);
    }
    log.info("upstream recusou", { status: res.status, host: target.hostname });
  } catch {
    log.info("upstream falhou", { host: target.hostname });
  }

  // Sem cópia: 404 para o <img> cair direto no lugar reservado.
  return new NextResponse("sem imagem", { status: 404 });
}
