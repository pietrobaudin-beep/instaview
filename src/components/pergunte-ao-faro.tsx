"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Panel } from "@/components/ui/brand";

/**
 * "Pergunte ao Faro AI": a caixa onde se escreve em português.
 *
 * Três decisões de tela que são de produto, não de estética:
 *
 * 1. **Sugestões prontas.** Campo em branco não ensina ninguém o que dá para
 *    perguntar. Os três exemplos mostram o alcance — e o limite.
 * 2. **A resposta diz sobre quantos registros foi feita.** Uma resposta
 *    apoiada em 4 linhas merece menos confiança que uma apoiada em 120, e
 *    quem lê tem direito de saber disso.
 * 3. **O aviso fica embaixo, sempre.** O que vem do modelo é leitura do que
 *    o Farejo guardou — não é o Instagram falando.
 */
const EXEMPLOS = [
  "O que mudou nesta semana?",
  "Quem deixou de seguir?",
  "Teve story sobre o quê?",
];

export function PergunteAoFaro({ username }: { username: string }) {
  const [pergunta, setPergunta] = React.useState("");
  const [pensando, setPensando] = React.useState(false);
  const [resposta, setResposta] = React.useState<{
    texto: string;
    linhas: number;
    cortado?: boolean;
    franquia?: { usados: number; limite: number } | null;
  } | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  async function enviar(texto: string) {
    const q = texto.trim();
    if (!q || pensando) return;
    setPensando(true);
    setErro(null);
    setResposta(null);
    try {
      const r = await fetch("/api/pergunte", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, pergunta: q }),
      });
      const b = await r.json();
      if (!r.ok) {
        setErro(
          b?.error === "plano"
            ? "Perguntar ao Faro AI é do Faro de Cão e do Faro de Detetive."
            : b?.error === "franquia"
              ? `As perguntas deste ciclo acabaram (${b.usados} de ${b.limite}). Elas renovam no próximo ciclo.`
              : b?.error === "desligada"
              ? "O Faro AI está sem a chave da IA agora."
              : "Não consegui responder agora.",
        );
        return;
      }
      setResposta({ texto: b.resposta, linhas: b.linhasDeDossie, cortado: !!b.cortado, franquia: b.franquia ?? null });
    } catch {
      setErro("Não consegui responder agora.");
    } finally {
      setPensando(false);
    }
  }

  return (
    <Panel title="Pergunte ao Faro AI">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(pergunta);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder={`O que você quer saber sobre @${username}?`}
          aria-label={`Pergunte sobre @${username}`}
          className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={pensando || !pergunta.trim()}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-pink px-5 text-sm font-bold text-ink transition hover:opacity-90 disabled:opacity-50"
        >
          {pensando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {pensando ? "Farejando…" : "Perguntar"}
        </button>
      </form>

      {!resposta && !pensando && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXEMPLOS.map((e) => (
            <button
              key={e}
              type="button"
              // Só preenche: cada pergunta enviada gasta 1 da franquia do
              // ciclo, e um toque num exemplo não pode gastar sozinho.
              onClick={() => setPergunta(e)}
              className="rounded-2xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-muted-foreground">{erro}</p>}

      {resposta && (
        <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed">{resposta.texto}</p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Lido de <b className="font-semibold">{resposta.linhas} registros</b> dos últimos 30
            dias, que estão nesta página.
            {resposta.cortado && " Só os registros mais recentes couberam — os mais antigos ficaram de fora."}
            {resposta.franquia &&
              ` · ${resposta.franquia.usados} de ${resposta.franquia.limite} perguntas deste ciclo.`}
          </p>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        A resposta é uma leitura do que o Farejo guardou — não é o Instagram falando. O Faro AI não
        sabe por que as coisas aconteceram, só que aconteceram.
      </p>
    </Panel>
  );
}
