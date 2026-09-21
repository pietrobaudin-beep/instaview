/**
 * A lista de "Pesquisados" e o que foi escondido dela.
 *
 * A lista nasce de `analysis_usage`, que é o caderno do limite do plano.
 * Apagar uma linha de lá devolveria a consulta — bastaria apagar para farejar
 * de graça outra vez. Por isso o que a pessoa tira da lista fica **escondido**
 * numa linha do cache, e a consulta segue contada.
 */
export const OCULTOS = "pesquisados-ocultos";

/** Onde a lista de escondidos de uma pessoa fica guardada. */
export function chaveOcultos(key: string): string {
  return `oculto:${key}`;
}
