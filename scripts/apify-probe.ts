/**
 * Mostra a resposta CRUA de um ator do Apify, e o que o Farejo entendeu dela.
 *
 * Serve para mapear os campos sem chutar: cada ator nomeia "foto de perfil" do
 * seu jeito, e inventar nome de campo é o caminho mais curto para um recurso
 * que nunca funciona. Por isso imprime os dois lados — os campos que vieram e
 * o `Achado` que `viaApify` montou. Quando o segundo vier "unknown" com o
 * primeiro cheio, o mapeamento é que está errado.
 *
 *   npx tsx scripts/apify-probe.ts tiktokFoto nasa
 *
 * Custa uma execução do ator (centavos). Sem APIFY_TOKEN, sai avisando.
 */
import { loadEnvConfig } from "@next/env";

// Rodando fora do Next ninguém lê o `.env.local` — o `tsx` só enxerga o que já
// está no ambiente do shell. `loadEnvConfig` é o mesmo carregador que o site
// usa, então aqui e lá o token vem do mesmo lugar. Precisa vir ANTES de
// `@/lib/elsewhere-apify`, que lê `process.env` na importação: daí o import
// dinâmico lá embaixo, em vez de um `import` normal no topo.
loadEnvConfig(process.cwd());

/** Encurta valores longos (URL de foto tem 400 caracteres) sem esconder o campo. */
function resumir(v: unknown): unknown {
  if (typeof v === "string") return v.length > 120 ? `${v.slice(0, 120)}… (${v.length})` : v;
  if (Array.isArray(v)) return `[${v.length} itens]`;
  if (v && typeof v === "object") return `{${Object.keys(v).join(", ")}}`;
  return v;
}

async function main() {
  const { mapear, apifyLigado, ATORES } = await import("@/lib/elsewhere-apify");

  const rede = (process.argv[2] ?? "tiktokFoto") as keyof typeof ATORES;
  const handle = process.argv[3] ?? "nasa";
  const cfg = ATORES[rede];

  if (!apifyLigado()) {
    console.log("APIFY_TOKEN não está definido — coloque no .env.local e rode de novo.");
    process.exit(1);
  }
  if (!cfg) {
    console.log(`Rede desconhecida: ${rede}. Use: ${Object.keys(ATORES).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n===== ${rede} · @${handle} · ${cfg.ator} =====`);

  const comeco = Date.now();
  const res = await fetch(
    `https://api.apify.com/v2/acts/${cfg.ator}/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}&timeout=60`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cfg.entrada(handle)),
      signal: AbortSignal.timeout(90_000),
    },
  );
  const segundos = ((Date.now() - comeco) / 1000).toFixed(1);

  if (!res.ok) {
    console.log(`HTTP ${res.status} em ${segundos}s`);
    console.log((await res.text()).slice(0, 600));
    return;
  }

  const itens = (await res.json()) as Record<string, unknown>[];
  console.log(`HTTP 200 · ${segundos}s · ${Array.isArray(itens) ? itens.length : "?"} item(ns)`);

  const item = Array.isArray(itens) ? itens.find((i) => i && typeof i === "object") : null;
  if (!item) {
    console.log("Resposta vazia:", JSON.stringify(itens).slice(0, 400));
    return;
  }

  console.log("\n-- campos que vieram --");
  for (const [k, v] of Object.entries(item)) console.log(`  ${k}: ${JSON.stringify(resumir(v))}`);

  // No item que já veio: rodar o ator de novo só para ver o mapeamento custaria
  // uma segunda execução.
  console.log("\n-- o que o Farejo entendeu --");
  console.log(JSON.stringify(mapear(rede, item, handle), null, 2));
}

main();
