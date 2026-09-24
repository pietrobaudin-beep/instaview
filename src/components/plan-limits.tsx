import type { ResumoFranquia } from "@/lib/franquia";

/**
 * O que a pessoa já usou do plano neste ciclo, dito em frase.
 *
 * Aparece no topo do Faro AI e na conta, porque limite que só aparece quando
 * estoura vira surpresa desagradável. Os números vêm do servidor
 * (`resumoDaFranquia`), dos mesmos contadores que as rotas conferem.
 */
export function PlanLimits({ resumo, className = "" }: { resumo: ResumoFranquia; className?: string }) {
  const renova = resumo.renovaEm
    ? new Date(resumo.renovaEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;
  return (
    <section
      className={`rounded-2xl border border-plum/10 bg-white px-5 py-4 ${className}`}
      aria-label="Limites do seu plano"
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-plum/50">
          {resumo.nome}
          {resumo.cobranca ? (
            <span className="ml-1.5 font-semibold normal-case tracking-normal text-plum/40">· {resumo.cobranca}</span>
          ) : null}
          {renova ? (
            <span className="ml-1.5 font-semibold normal-case tracking-normal text-plum/40">· renova em {renova}</span>
          ) : null}
        </p>
        {resumo.itens.map((i) => (
          <p key={i.label} className="text-sm">
            <span className="text-plum/55">{i.label}: </span>
            <b className={i.cheio ? "font-semibold text-magenta" : "font-semibold text-plum"}>{i.valor}</b>
          </p>
        ))}
      </div>
    </section>
  );
}
