import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Only proxy Instagram's CDN hosts (avoids an open proxy / SSRF).
const ALLOWED = /(?:^|\.)(?:fbcdn\.net|cdninstagram\.com)$/i;

/**
 * Image proxy for Instagram profile pictures. The IG CDN blocks hotlinking from
 * other origins, so the browser can't load those URLs directly. This fetches
 * them server-side (which works) and serves the bytes from our own origin.
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
  if (target.protocol !== "https:" || !ALLOWED.test(target.hostname)) {
    return new NextResponse("forbidden host", { status: 403 });
  }

  try {
    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0", accept: "image/*" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return new NextResponse("upstream error", { status: 502 });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "content-type": res.headers.get("content-type") || "image/jpeg",
        "cache-control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
}
