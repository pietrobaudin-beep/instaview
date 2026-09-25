import { getCurrentUser } from "@/lib/auth";
import { allowedImageHost } from "@/lib/img-store";

export const dynamic = "force-dynamic";

/**
 * Proxy do vídeo de um story — **só passa, não guarda**.
 *
 * O link do vídeo vem na mesma leitura de stories que o Faro AI já faz, então
 * tocar não custa crédito nenhum. O CDN do Instagram não deixa outro site
 * embutir o arquivo direto; aqui o servidor busca e repassa, em pedaços
 * (Range), como um vídeo normal.
 *
 * Nada fica salvo: quando o link do Instagram vence, isto responde 404 e a
 * tela volta a mostrar a capa. Só para quem está logado e só para endereços
 * do Instagram — sem isso seria um proxy de vídeo aberto para qualquer um.
 */
export async function GET(req: Request) {
  if (!(await getCurrentUser())) return new Response("login", { status: 401 });

  const raw = new URL(req.url).searchParams.get("url");
  let alvo: URL;
  try {
    alvo = new URL(raw ?? "");
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (!allowedImageHost(alvo)) return new Response("forbidden host", { status: 403 });

  const range = req.headers.get("range");
  let res: Response;
  try {
    res = await fetch(alvo, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        referer: "https://www.instagram.com/",
        ...(range ? { range } : {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return new Response("upstream", { status: 404 });
  }
  if (!res.ok && res.status !== 206) return new Response("expirou", { status: 404 });

  const headers = new Headers({
    "content-type": res.headers.get("content-type") ?? "video/mp4",
    "cache-control": "private, max-age=3600",
    "accept-ranges": "bytes",
  });
  for (const h of ["content-length", "content-range"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(res.body, { status: res.status, headers });
}
