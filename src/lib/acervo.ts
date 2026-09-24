/**
 * O acervo de stories: o que cada plano deixa ver, e a limpeza de verdade.
 *
 * ## A janela
 *
 * Um story capturado fica visível por um prazo contado **da publicação** (não
 * da captura): Farejador + 48h, Cão 3 dias, Detetive 7 dias. Favorito fica
 * enquanto o plano estiver ativo. Isso é decidido aqui, no servidor — antes a
 * janela só existia na tela, e o banco guardava tudo para sempre.
 *
 * ## Por que apagar, e não só esconder
 *
 * Esconder o vencido não reduz armazenamento: a miniatura continuava no banco
 * (`section_cache`, seção `img`) sem prazo, e nada nunca apagava. A limpeza
 * diária remove o evento vencido, a leitura da IA dele e a cópia da imagem —
 * esta só quando nenhum outro evento, de nenhuma conta, aponta para ela.
 *
 * ## Depois do plano
 *
 * Plano encerrado: as coletas param na hora. Os stories comuns saem na
 * limpeza seguinte (a janela do Curioso é zero). Os favoritos ficam 30 dias
 * depois do fim do plano, para quem voltar não perder nada, e então saem.
 */
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { direitosDe } from "@/lib/direitos";
import { imageKey } from "@/lib/img-store";
import { lerSalvos } from "@/lib/stories-salvos";
import { logger } from "@/lib/logger";
import type { EventData } from "@/lib/faro-watch";

const log = logger.scope("acervo");

const HORA = 60 * 60 * 1000;

/**
 * A limpeza só alcança o que foi capturado a partir da estrutura nova.
 *
 * O acervo anterior (e o dos planos antigos) é de contas reais em produção:
 * apagá-lo no primeiro deploy seria apagar dado sem autorização. Para ele há
 * a limpeza única `incluirAntigos`, rodada só com o OK do dono.
 */
export const LIMPEZA_DESDE = new Date("2026-09-25T00:00:00Z");
/** Favoritos sobrevivem ao fim do plano por este tanto. */
export const FAVORITOS_APOS_FIM_DIAS = 30;
/** Cópias feitas pelo proxy de imagem (fotos da tela) — conveniência, não acervo. */
const COPIA_PROXY_DIAS = 10;
/** Fotos de quem apareceu numa pista. */
const COPIA_ROSTO_DIAS = 90;

type Conta = Pick<User, "email" | "plan" | "planEndsAt">;

/** Quando um story foi publicado; sem data de publicação, a da captura. */
export function publicadoEm(e: { data: unknown; detectedAt: Date }): Date {
  const t = (e.data as EventData | null)?.takenAt;
  const d = t ? new Date(t) : null;
  return d && !Number.isNaN(d.getTime()) ? d : e.detectedAt;
}

/** O story ainda está dentro da janela do plano? */
export function visivel(
  dono: Conta,
  e: { id: string; data: unknown; detectedAt: Date },
  favoritos: ReadonlySet<string>,
  agora = new Date(),
): boolean {
  const { config, admin } = direitosDe(dono);
  if (admin) return true;
  if (favoritos.has(e.id)) {
    // Favorito vale enquanto o plano der acompanhamento — e mais 30 dias
    // depois que ele acaba.
    if (config.maxProfiles > 0) return true;
    const fim = dono.planEndsAt;
    return !!fim && agora.getTime() - fim.getTime() < FAVORITOS_APOS_FIM_DIAS * 24 * HORA;
  }
  if (!Number.isFinite(config.storiesHours)) return true;
  return agora.getTime() - publicadoEm(e).getTime() < config.storiesHours * HORA;
}

function chaveDe(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return imageKey(new URL(url));
  } catch {
    return null;
  }
}

export interface Limpeza {
  eventos: number;
  imagens: number;
}

/**
 * A limpeza diária. Roda no cron do Faro AI.
 *
 * Idempotente e conservadora: na dúvida sobre uma imagem (outro evento ainda
 * aponta para ela), a imagem fica.
 */
export async function limparAcervo(
  agora = new Date(),
  opcoes: { incluirAntigos?: boolean } = {},
): Promise<Limpeza> {
  const perfis = await prisma.trackedProfile.findMany({
    select: { id: true, user: { select: { email: true, plan: true, planEndsAt: true } } },
  });

  const apagarIds: string[] = [];
  const talvezImagens = new Set<string>();

  for (const p of perfis) {
    // Planos antigos mantêm o acervo como estava até a transição combinada.
    if (!opcoes.incluirAntigos && direitosDe(p.user).config.legado) continue;
    const favoritos = new Set(await lerSalvos(p.id));
    const eventos = await prisma.profileEvent.findMany({
      where: {
        profileId: p.id,
        kind: "story",
        ...(opcoes.incluirAntigos ? {} : { detectedAt: { gte: LIMPEZA_DESDE } }),
      },
      select: { id: true, data: true, detectedAt: true },
    });
    for (const e of eventos) {
      if (visivel(p.user, e, favoritos, agora)) continue;
      apagarIds.push(e.id);
      const k = chaveDe((e.data as EventData | null)?.thumbnailUrl);
      if (k) talvezImagens.add(k);
    }
  }

  if (apagarIds.length) {
    await prisma.profileEvent.deleteMany({ where: { id: { in: apagarIds } } });
    // A leitura da IA e o veredito do alerta desses stories não servem mais.
    await prisma.sectionCache.deleteMany({
      where: { section: { in: ["ia:story", "ia:alerta"] }, username: { in: apagarIds } },
    });
  }

  // Imagens de story: só as que nenhum evento restante usa.
  let imagens = 0;
  if (talvezImagens.size) {
    const restantes = await prisma.profileEvent.findMany({
      where: { kind: "story" },
      select: { data: true },
    });
    const emUso = new Set(restantes.map((e) => chaveDe((e.data as EventData | null)?.thumbnailUrl)));
    const orfas = [...talvezImagens].filter((k) => !emUso.has(k));
    if (orfas.length) {
      imagens += (
        await prisma.sectionCache.deleteMany({ where: { section: "img", username: { in: orfas } } })
      ).count;
    }
  }

  // Cópias de conveniência, por idade.
  imagens += await prisma.$executeRawUnsafe(
    `DELETE FROM section_cache WHERE section = 'img' AND data->>'kind' = 'proxy' AND "fetchedAt" < ($1::timestamptz AT TIME ZONE 'UTC')`,
    new Date(agora.getTime() - COPIA_PROXY_DIAS * 24 * HORA),
  );
  imagens += await prisma.$executeRawUnsafe(
    `DELETE FROM section_cache WHERE section = 'img' AND data->>'kind' = 'rosto' AND "fetchedAt" < ($1::timestamptz AT TIME ZONE 'UTC')`,
    new Date(agora.getTime() - COPIA_ROSTO_DIAS * 24 * HORA),
  );

  log.info("limpeza", { eventos: apagarIds.length, imagens });
  return { eventos: apagarIds.length, imagens };
}
