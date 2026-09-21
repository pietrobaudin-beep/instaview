/**
 * Cópias de imagem guardadas pelo Farejo.
 *
 * Serve a dois casos:
 *
 * 1. **Foto de perfil** — o endereço do Instagram vem assinado e vence; sem a
 *    cópia, a foto some da tela horas depois.
 * 2. **Story** — o story em si expira em 24h no Instagram. Quando o perfil está
 *    no Faro, a miniatura é guardada no momento em que o Faro a encontra, e é
 *    ela que sustenta a tela depois — dentro do prazo do plano.
 *
 * O que se guarda é a **miniatura**, não o vídeo: uma foto de story tem ~100 KB
 * e cabe no banco; vídeo exigiria armazenamento de arquivos.
 *
 * Nada disso é conteúdo privado: é o que estava público no momento da captura.
 * O prazo de guarda precisa constar na Política de Privacidade, e um pedido de
 * "remover meu perfil" tem de apagar estas cópias também.
 */
import { createHash } from "crypto";
import { prisma } from "@/lib/db";

/**
 * Teto de guarda das cópias.
 *
 * Era de 30 dias, o que fazia sentido quando o story só precisava sobreviver a
 * uma janela de 72 horas. Desde 21/09 o story fica guardado **enquanto o perfil
 * estiver no Faro**, então a cópia precisa durar o mesmo tanto: quem apaga é a
 * saída do Faro, não o relógio.
 *
 * O que a pessoa VÊ continua sendo decidido pelo plano, nunca por isto.
 */
export const COPY_TTL = Number.POSITIVE_INFINITY;
const MAX_BYTES = 400_000;
const TIMEOUT_MS = 10_000;

const ALLOWED = /(?:^|\.)(?:fbcdn\.net|cdninstagram\.com)$/i;

export interface StoredImage {
  type: string;
  bytes: Buffer;
  at: Date;
}

/** A chave ignora a assinatura do endereço: mesmo arquivo, mesma cópia. */
export function imageKey(url: URL): string {
  return `img:${createHash("sha1").update(url.origin + url.pathname).digest("hex").slice(0, 32)}`;
}

export function allowedImageHost(url: URL): boolean {
  return url.protocol === "https:" && ALLOWED.test(url.hostname);
}

export async function readStored(key: string): Promise<StoredImage | null> {
  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username: key, section: "img" } } })
    .catch(() => null);
  const data = row?.data as { type?: string; b64?: string } | undefined;
  if (!row || !data?.b64) return null;
  if (Date.now() - row.fetchedAt.getTime() >= COPY_TTL) return null;
  return { type: data.type || "image/jpeg", bytes: Buffer.from(data.b64, "base64"), at: row.fetchedAt };
}

export async function writeStored(key: string, type: string, bytes: Buffer): Promise<void> {
  if (bytes.byteLength > MAX_BYTES) return;
  const data = { type, b64: bytes.toString("base64") };
  await prisma.sectionCache
    .upsert({
      where: { username_section: { username: key, section: "img" } },
      create: { username: key, section: "img", data },
      update: { data, fetchedAt: new Date() },
    })
    .catch(() => null);
}

/** Baixa e guarda, se ainda não houver cópia. Devolve se há cópia no fim. */
export async function keepImage(rawUrl: string | null | undefined): Promise<boolean> {
  if (!rawUrl) return false;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (!allowedImageHost(url)) return false;

  const key = imageKey(url);
  if (await readStored(key)) return true; // já temos

  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        referer: "https://www.instagram.com/",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const bytes = Buffer.from(await res.arrayBuffer());
    await writeStored(key, res.headers.get("content-type") || "image/jpeg", bytes);
    return true;
  } catch {
    return false;
  }
}
