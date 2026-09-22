import { redirect } from "next/navigation";

/**
 * A área antiga, aposentada em 22/09.
 *
 * Era de outra fase do produto — em inglês, fora da navegação atual — e
 * mostrava a lista de seguidores, o único lugar que lia os dados que o ciclo
 * de coleta pagava para buscar. Com ela, saiu o motivo de existir daquela
 * coleta.
 *
 * Fica como redirecionamento em vez de sumir: ainda havia três caminhos
 * mandando gente para cá, um deles **logo depois do pagamento**, e link antigo
 * em e-mail não se apaga.
 */
export default function DashboardAntigo() {
  redirect("/rastros");
}
