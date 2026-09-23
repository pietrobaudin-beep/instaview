/**
 * Quantas atualizações um perfil já teve hoje.
 *
 * Cada atualização é uma coleta paga no provedor, então o teto existe por dois
 * motivos: custo e honestidade — atualizar de minuto em minuto não revela mais
 * nada, porque o Instagram não muda tão rápido.
 *
 * Conta as coletas do dia (manuais e automáticas juntas): é o número que a
 * pessoa vê e o que de fato pesa na conta.
 */
import { prisma } from "@/lib/db";
import { FOLLOWING_KIND } from "@/lib/following-tracker";
import { planFor } from "@/lib/plans";
import type { Plan } from "@prisma/client";

export interface RefreshStatus {
  usadas: number;
  limite: number;
  podeAtualizar: boolean;
  /** Última coleta concluída. */
  ultima: Date | null;
  /** Quando a rotina automática passa de novo, quando há Faro AI ativo. */
  proxima: Date | null;
}

function inicioDoDia(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * `plan` decide o teto. Era uma constante global de 3 para todo mundo — o
 * Detetive, que paga sete vezes mais, tinha o mesmo limite do Faro de Cão.
 */
export async function refreshStatusFor(profileId: string, plan: Plan): Promise<RefreshStatus> {
  const limite = planFor(plan).refreshesPorDia;
  const [usadas, ultimaLinha, job] = await Promise.all([
    prisma.followerSnapshot.count({
      where: { profileId, kind: FOLLOWING_KIND, startedAt: { gte: inicioDoDia() } },
    }),
    prisma.followerSnapshot.findFirst({
      where: { profileId, kind: FOLLOWING_KIND, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
    prisma.monitoringJob.findUnique({ where: { profileId }, select: { nextRunAt: true, enabled: true } }),
  ]);

  return {
    usadas,
    limite,
    podeAtualizar: usadas < limite,
    ultima: ultimaLinha?.completedAt ?? null,
    proxima: job?.enabled ? job.nextRunAt : null,
  };
}
