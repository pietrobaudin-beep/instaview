/**
 * O estado do "Atualizar agora" e das coletas de um perfil — o que a tela
 * mostra antes de a pessoa clicar.
 *
 * Desde 24/09 não é mais "tantas por dia": é a franquia de coletas do ciclo
 * (10 no Cão, 30 no Detetive) e, para quem pode antecipar (Detetive), um
 * intervalo mínimo desde a última. Antecipar não acrescenta coleta: sai da
 * mesma franquia.
 */
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { direitosDe } from "@/lib/direitos";
import { saldo } from "@/lib/franquia";

export interface RefreshStatus {
  /** Coletas usadas no ciclo. */
  usadas: number;
  limite: number;
  podeAtualizar: boolean;
  /** Última coleta concluída. */
  ultima: Date | null;
  /** Quando a próxima coleta acontece sozinha. */
  proxima: Date | null;
  /** O plano deixa antecipar? (Cão não deixa: a cadência é a promessa.) */
  antecipa: boolean;
  /** A partir de quando o botão volta a valer. */
  liberaEm: Date | null;
  cadenciaHoras: number;
}

const HORA = 60 * 60 * 1000;

export async function refreshStatusFor(
  profileId: string,
  user: Pick<User, "id" | "email" | "plan" | "planEndsAt" | "planStartedAt">,
): Promise<RefreshStatus> {
  const { config, admin } = direitosDe(user);
  const [s, perfil] = await Promise.all([
    saldo(user as User, "coleta"),
    prisma.trackedProfile.findUnique({ where: { id: profileId }, select: { lastCollectedAt: true } }),
  ]);
  const ultima = perfil?.lastCollectedAt ?? null;
  const antecipa = config.atualizarAgoraHoras != null;
  const liberaEm = antecipa && ultima ? new Date(ultima.getTime() + config.atualizarAgoraHoras! * HORA) : null;
  const temColeta = admin || s.restam > 0;

  return {
    usadas: s.usados,
    limite: s.limite,
    podeAtualizar: antecipa && temColeta && (!liberaEm || liberaEm <= new Date()),
    ultima,
    proxima: temColeta
      ? ultima
        ? new Date(ultima.getTime() + config.cadenciaHoras * HORA)
        : new Date()
      : null,
    antecipa,
    liberaEm,
    cadenciaHoras: config.cadenciaHoras,
  };
}
