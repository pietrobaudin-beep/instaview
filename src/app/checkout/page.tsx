import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { anotarAvulso, linkDeCheckout, type Produto } from "@/lib/billing/cakto";
import { PLANS, SINGLE_UNLOCK } from "@/lib/plans";
import { isValidUsername, normalizeUsername, withParam } from "@/lib/utils";
import { CheckoutView, type Pedido } from "@/components/checkout-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pagamento · Farejo" };

const PRODUTOS: Record<string, Produto> = {
  farejador: "SINGLE",
  "farejador-mais": "FAREJADOR_MAIS",
  cao: "CAO",
  detetive: "DETETIVE",
};

/**
 * O pagamento dentro do Farejo: o resumo do pedido do nosso lado e o
 * formulário da Cakto (PIX/cartão) embutido. Quem libera o acesso é o webhook;
 * a tela só espera por ele (`/api/checkout/status`).
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { plano?: string; perfil?: string };
}) {
  const chave = searchParams.plano ?? "";
  const produto = PRODUTOS[chave];
  const aqui = withParam(
    withParam("/checkout", "plano", chave),
    "perfil",
    searchParams.perfil ?? "",
  );
  const user = await getCurrentUser();
  if (!user) redirect(withParam("/signup", "next", aqui));
  if (!produto) redirect("/pricing");

  const perfil = produto === "SINGLE" ? normalizeUsername(searchParams.perfil ?? "") : null;
  if (produto === "SINGLE" && !isValidUsername(perfil ?? "")) redirect("/pricing");

  const link = linkDeCheckout(produto, { userId: user.id, email: user.email, username: perfil ?? undefined });
  if (!link) redirect("/pricing");
  if (perfil) await anotarAvulso(user.id, perfil);

  const pedido: Pedido =
    produto === "SINGLE"
      ? {
          produto,
          nome: SINGLE_UNLOCK.name,
          detalhe: `Análise completa de @${perfil}`,
          preco: SINGLE_UNLOCK.price,
          periodo: "pagamento único",
          itens: ["Tudo sobre o perfil, sem borrão", "Resultado aberto por 7 dias", "Sem assinatura"],
          depois: `/p/${perfil}?unlocked=1`,
        }
      : produto === "FAREJADOR_MAIS"
        ? {
            produto,
            nome: PLANS.FAREJADOR_MAIS.name,
            detalhe: "Passe de 7 dias",
            preco: PLANS.FAREJADOR_MAIS.priceMonthly,
            periodo: "por 7 dias",
            itens: ["2 análises completas", "Ver o que a pessoa curtiu", "Não renova sozinho"],
            depois: "/?upgraded=1",
          }
        : {
            produto,
            nome: PLANS[produto].name,
            detalhe: produto === "CAO" ? "Acompanhamento a cada 3 dias" : "Acompanhamento diário",
            preco: PLANS[produto].priceMonthly,
            periodo: "por mês",
            itens:
              produto === "CAO"
                ? ["1 perfil acompanhado", "Quem começou e deixou de seguir", "Cancele quando quiser"]
                : ["1 perfil acompanhado todo dia", "Alertas e Faro AI completo", "Cancele quando quiser"],
            depois: "/rastros?upgraded=1",
          };

  return <CheckoutView pedido={pedido} link={link} perfil={perfil} />;
}
