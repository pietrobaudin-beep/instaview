import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** "Agora" = deu sinal nos últimos 2 minutos (o sinal é de 30 em 30 segundos). */
const AGORA_MS = 2 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

const NOMES: Record<string, string> = {
  BR: "Brasil",
  PT: "Portugal",
  US: "Estados Unidos",
  AR: "Argentina",
  ES: "Espanha",
  MX: "México",
  CL: "Chile",
  CO: "Colômbia",
  GB: "Reino Unido",
  FR: "França",
  DE: "Alemanha",
  IT: "Itália",
  JP: "Japão",
  CA: "Canadá",
  PY: "Paraguai",
  UY: "Uruguai",
};

function contar<T extends string | null>(valores: T[], limite = 6) {
  const mapa = new Map<string, number>();
  for (const v of valores) {
    const k = v ?? "—";
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([nome, total]) => ({ nome, total }));
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const agoraDesde = new Date(Date.now() - AGORA_MS);
  const diaDesde = new Date(Date.now() - DIA_MS);

  const [vivos, doDia] = await Promise.all([
    prisma.liveVisit.findMany({
      where: { lastSeenAt: { gte: agoraDesde } },
      orderBy: { lastSeenAt: "desc" },
      take: 200,
    }),
    prisma.liveVisit.findMany({
      where: { lastSeenAt: { gte: diaDesde } },
      select: { lastSeenAt: true, country: true },
    }),
  ]);

  // Movimento hora a hora nas últimas 24h: quantas pessoas diferentes foram
  // vistas em cada hora. É o último sinal de cada uma, então é uma amostra —
  // quem ficou o dia todo aparece só na hora em que saiu.
  const horas = Array.from({ length: 24 }, (_, k) => {
    const ini = new Date(Date.now() - (23 - k) * 60 * 60 * 1000);
    return {
      hora: ini.getHours(),
      pessoas: doDia.filter(
        (v) =>
          v.lastSeenAt.getTime() >= ini.getTime() - 30 * 60 * 1000 &&
          v.lastSeenAt.getTime() < ini.getTime() + 30 * 60 * 1000,
      ).length,
    };
  });

  return NextResponse.json({
    agora: vivos.length,
    noDia: doDia.length,
    paises: contar(vivos.map((v) => (v.country ? (NOMES[v.country] ?? v.country) : null))),
    cidades: contar(vivos.map((v) => v.city)),
    paginas: contar(vivos.map((v) => v.path)),
    aparelhos: contar(vivos.map((v) => v.device)),
    origens: contar(vivos.map((v) => v.referrer)),
    horas,
    paisesDoDia: contar(doDia.map((v) => (v.country ? (NOMES[v.country] ?? v.country) : null))),
  });
}
