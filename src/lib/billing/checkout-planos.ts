import type { Produto } from "@/lib/billing/cakto";

/** As chaves de `/checkout?plano=`. */
export const PRODUTO_DA_CHAVE: Record<string, Produto> = {
  farejador: "SINGLE",
  "farejador-mais": "FAREJADOR_MAIS",
  cao: "CAO",
  detetive: "DETETIVE",
};

export function urlDoCheckout(produto: Produto, perfil?: string | null): string {
  const chave = Object.keys(PRODUTO_DA_CHAVE).find((k) => PRODUTO_DA_CHAVE[k] === produto)!;
  return produto === "SINGLE" && perfil
    ? `/checkout?plano=${chave}&perfil=${encodeURIComponent(perfil)}`
    : `/checkout?plano=${chave}`;
}
