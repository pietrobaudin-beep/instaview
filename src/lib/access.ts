/**
 * O que uma pessoa pode ver de UM perfil.
 *
 * - "pro"    — análise revelada, com as ferramentas do plano (Faro AI etc.).
 * - "single" — Farejador: análise revelada daquele perfil, por 7 dias, sem
 *              acompanhamento nem IA interativa.
 * - "free"   — prévia borrada. Inclui quem assina mas ainda não gastou uma
 *              análise NESTE perfil: ter plano não revela perfil nenhum
 *              sozinho — é a análise consumida que revela.
 *
 * Toda rota que decide entre borrado e revelado pergunta aqui.
 */
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";
import { direitosDe } from "@/lib/direitos";
import { lerSalva, type Salva } from "@/lib/analise";
import { SINGLE_UNLOCK } from "@/lib/plans";

export type Access = "free" | "single" | "pro";

export interface Acesso {
  access: Access;
  salva: Salva | null;
  /** O perfil está no Faro AI desta conta. */
  noFaro: boolean;
  /** Farejador comprado para este @ e ainda válido, com ou sem coleta feita. */
  avulso: { id: string; expiresAt: Date | null } | null;
  /**
   * Plano antigo que já tinha consultado este @ pela regra de antes: continua
   * aberto, e a primeira abertura coleta sem gastar franquia nova.
   */
  jaConsultadoAntes: boolean;
}

export async function acessoA(user: User | null, username: string): Promise<Acesso> {
  const vazio: Acesso = { access: "free", salva: null, noFaro: false, avulso: null, jaConsultadoAntes: false };
  if (!user) return vazio;
  const d = direitosDe(user);

  const [salva, tracked, unlock, antes] = await Promise.all([
    lerSalva(user.id, username),
    prisma.trackedProfile.findUnique({
      where: { userId_username: { userId: user.id, username } },
      select: { id: true },
    }),
    prisma.profileUnlock.findUnique({
      where: { userId_username: { userId: user.id, username } },
      select: { id: true, expiresAt: true },
    }),
    d.config.legado
      ? prisma.analysisUsage.findUnique({
          where: { key_username: { key: `u:${user.id}`, username } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const avulso = unlock && (!unlock.expiresAt || unlock.expiresAt > new Date()) ? unlock : null;
  const noFaro = !!tracked;
  const temFaro = d.config.maxProfiles > 0;
  const base = { salva, noFaro, avulso, jaConsultadoAntes: !!antes };

  if (d.admin) return { ...base, access: "pro" };
  // Perfil no Faro AI de quem tem Faro: o painel é dele.
  if (noFaro && temFaro) return { ...base, access: "pro" };
  if (salva) {
    if (salva.data.origem === "revelacao") return { ...base, access: "free" };
    if (salva.data.origem === "avulso") return { ...base, access: "single" };
    // Análise feita pelo plano: aberta enquanto o plano der análises.
    if (d.config.maxConsults > 0) return { ...base, access: "pro" };
  }
  if (avulso) return { ...base, access: "single" };
  if (antes) return { ...base, access: "pro" };
  return { ...base, access: "free" };
}

export async function accessFor(user: User | null, username: string): Promise<Access> {
  return (await acessoA(user, username)).access;
}

/**
 * Registra um Farejador pago. Idempotente — o webhook repetido não duplica.
 * O prazo de 7 dias começa na coleta, não na compra: quem compra e abre dois
 * dias depois não perde dois dias.
 */
export async function grantUnlock(
  userId: string,
  username: string,
  stripeSessionId: string | null,
): Promise<void> {
  await prisma.profileUnlock.upsert({
    where: { userId_username: { userId, username } },
    create: { userId, username, stripeSessionId },
    // Comprar de novo um @ cujo acesso venceu reabre: nova coleta, novo prazo.
    update: { expiresAt: null, ...(stripeSessionId ? { stripeSessionId } : {}) },
  });
}

export const DIAS_DO_AVULSO = SINGLE_UNLOCK.diasDeAcesso;
