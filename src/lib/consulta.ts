/**
 * Gastar uma análise — em um lugar só.
 *
 * ## A regra
 *
 * - **Reabrir** uma análise salva nunca vai ao provedor e nunca conta de novo.
 * - **Análise nova** de quem assina: reserva 1 da franquia do ciclo, coleta o
 *   pacote (`analise.ts`), guarda. Se a coleta não entregar — perfil que não
 *   existe, privado, provedor fora —, a reserva é devolvida.
 * - **Farejador** (avulso): já foi pago por nome; coleta sem tocar em
 *   franquia, e o prazo de 7 dias começa agora.
 * - **Plano antigo** que já tinha consultado o @ pela regra de antes: coleta
 *   uma vez sem cobrar franquia nova — era direito dele.
 * - **Curioso**: não tem análise. Tem a revelação (`revelacao.ts`).
 *
 * Nada aqui é chamado sem confirmação de quem usa: gastar uma de três
 * análises do mês só porque a página abriu seria cobrar por clique errado.
 */
import type { User } from "@prisma/client";
import { acessoA, DIAS_DO_AVULSO, type Access } from "@/lib/access";
import { coletarAnalise, guardar, type Origem, type Salva } from "@/lib/analise";
import { comQuem } from "@/lib/custo";
import { direitosDe } from "@/lib/direitos";
import { devolver, reservar, saldo } from "@/lib/franquia";
import { prisma } from "@/lib/db";

export type Consumo =
  | { ok: true; access: Access; salva: Salva }
  | { ok: false; motivo: "sem_plano" | "limite" | "nao_encontrado" | "privado" | "indisponivel"; usados?: number; limite?: number };

export async function consumirAnalise(user: User, username: string): Promise<Consumo> {
  const acesso = await acessoA(user, username);
  if (acesso.salva && acesso.access !== "free") {
    return { ok: true, access: acesso.access, salva: acesso.salva };
  }

  const d = direitosDe(user);
  let origem: Origem;
  let reserva: Awaited<ReturnType<typeof reservar>> | null = null;

  if (acesso.avulso) origem = "avulso";
  else if (d.admin) origem = "admin";
  else if (acesso.jaConsultadoAntes || (acesso.noFaro && d.config.maxProfiles > 0)) origem = "legado";
  else if (d.config.maxConsults > 0) {
    origem = "plano";
    reserva = await reservar(user, "analise");
    if (!reserva.ok) return { ok: false, motivo: "limite", usados: reserva.usados, limite: reserva.limite };
  } else {
    return { ok: false, motivo: "sem_plano" };
  }

  const r = await comQuem({ userId: user.id, admin: d.admin, motivo: `analise:${origem}` }, () =>
    coletarAnalise(username, origem),
  );
  if (!r.ok) {
    if (reserva) await devolver(reserva);
    return { ok: false, motivo: r.motivo };
  }

  // Duas abas confirmando o mesmo @ ao mesmo tempo: a que chegar depois
  // encontra a análise gravada e devolve a sua reserva. As leituras dobradas
  // ficam no registro de custo — pagas, mas não cobradas duas vezes do cliente.
  const jaGravada = await acessoA(user, username);
  if (jaGravada.salva && jaGravada.access !== "free") {
    if (reserva) await devolver(reserva);
    return { ok: true, access: jaGravada.access, salva: jaGravada.salva };
  }

  const agora = new Date();
  const expira =
    origem === "avulso" ? new Date(agora.getTime() + DIAS_DO_AVULSO * 24 * 60 * 60 * 1000) : null;
  const salva = await guardar(user, username, r.data, expira);
  if (origem === "avulso" && acesso.avulso) {
    await prisma.profileUnlock.update({ where: { id: acesso.avulso.id }, data: { expiresAt: expira } });
  }
  return { ok: true, access: origem === "avulso" ? "single" : "pro", salva };
}

/** O que a tela precisa para oferecer a análise sem gastá-la. */
export async function ofertaDeAnalise(user: User) {
  const d = direitosDe(user);
  if (d.config.maxConsults <= 0) return null;
  return saldo(user, "analise");
}
