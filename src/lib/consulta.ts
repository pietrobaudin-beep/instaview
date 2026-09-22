/**
 * "Esta pessoa pode consultar este perfil?" — em um lugar só.
 *
 * ## O furo que isto conserta
 *
 * As três rotas que gastam provedor (`profile-preview`, `raio-x`,
 * `following-preview`) perguntavam o limite assim:
 *
 * ```ts
 * const paid = access !== "free";
 * if (!paid) { ...checkAllowance... }
 * ```
 *
 * E `accessFor` devolve `"pro"` para **qualquer** plano diferente de FREE. Ou
 * seja: o teto de consultas de quem paga nunca era conferido. Faro de Cão (3),
 * PRO (10) e Detetive (30) podiam consultar quantos perfis quisessem — cada um
 * é crédito da HikerAPI saindo. Pelo mesmo motivo, `claimAnalysis` também não
 * rodava para assinante: por isso "Perfis consultados: 0 de 10" ficava parado
 * e a tela Pesquisados aparecia vazia justamente para quem paga.
 *
 * ## A regra
 *
 * - **`single`** (Farejador, pago para AQUELE perfil) passa direto: já foi
 *   pago por nome, e cobrar a cota de novo seria cobrar duas vezes.
 * - **Todo o resto** — grátis ou assinante — passa pelo teto do seu plano.
 * - Um perfil **já consultado nunca conta de novo**: reabrir o mesmo @ é
 *   grátis em qualquer plano.
 */
import { accessFor, type Access } from "@/lib/access";
import { checkAllowance, claimAnalysis, consultLimitFor, usageKey } from "@/lib/usage";
import type { Allowance } from "@/lib/usage";
import type { User } from "@prisma/client";

export interface Consulta {
  access: Access;
  /** Falso quando este perfil estouraria o teto do plano. */
  permitido: boolean;
  allowance: Allowance | null;
  /** A identidade contra a qual a cota é contada. */
  chave: string;
}

/**
 * Confere a cota **sem** registrar. Use antes de qualquer chamada ao provedor.
 *
 * `marcar: true` registra o gasto no mesmo passo — para a rota que representa
 * a análise em si (`following-preview`).
 */
export async function checarConsulta(
  user: User | null,
  username: string,
  marcar = false,
): Promise<Consulta> {
  const access = await accessFor(user, username);
  const chave = usageKey(user);

  // Quem pagou por este perfil específico não passa pela cota.
  if (access === "single") {
    return { access, permitido: true, allowance: null, chave };
  }

  const allowance = await checkAllowance(chave, username, consultLimitFor(user));
  if (allowance.allowed && marcar) await claimAnalysis(chave, username);

  return { access, permitido: allowance.allowed, allowance, chave };
}

/** O corpo do 402, igual nas três rotas. */
export function respostaDeLimite(c: Consulta) {
  return {
    limited: true,
    error: "limit_reached",
    used: c.allowance?.used ?? 0,
    limit: c.allowance?.limit ?? 0,
    spentOn: c.allowance?.spentOn ?? null,
  };
}
