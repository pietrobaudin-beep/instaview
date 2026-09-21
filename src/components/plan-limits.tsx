import { planFor } from "@/lib/plans";
import type { Plan } from "@prisma/client";

/**
 * O que a pessoa já usou do plano, dito em frase, não em jargão.
 *
 * Aparece no topo de "Meus rastros" e na conta, porque limite que só aparece
 * quando estoura vira surpresa desagradável.
 */
export function PlanLimits({
  plan,
  consultados,
  noFaro,
  className = "",
}: {
  plan: Plan;
  consultados: number;
  noFaro: number;
  className?: string;
}) {
  const cfg = planFor(plan);
  const cobranca =
    cfg.billing === "yearly"
      ? "por ano"
      : cfg.billing === "weekly"
        ? "por semana"
        : cfg.billing === "monthly"
          ? "por mês"
          : null;
  const stories =
    cfg.storiesHours === Number.POSITIVE_INFINITY
      ? "enquanto estiver no Faro"
      : cfg.storiesHours > 0
        ? `até ${cfg.storiesHours} horas`
        : "não incluídos";

  const itens = [
    { label: "Perfis consultados", valor: `${consultados} de ${cfg.maxConsults}`, cheio: consultados >= cfg.maxConsults },
    { label: "Perfis no Faro", valor: `${noFaro} de ${cfg.maxProfiles}`, cheio: cfg.maxProfiles > 0 && noFaro >= cfg.maxProfiles },
    { label: "Stories guardados", valor: stories, cheio: false },
  ];

  return (
    <section
      className={`rounded-2xl border border-plum/10 bg-white px-5 py-4 ${className}`}
      aria-label="Limites do seu plano"
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-plum/50">
          {cfg.name}
          {cobranca ? <span className="ml-1.5 font-semibold normal-case tracking-normal text-plum/40">· {cobranca}</span> : null}
        </p>
        {itens.map((i) => (
          <p key={i.label} className="text-sm">
            <span className="text-plum/55">{i.label}: </span>
            <b className={i.cheio ? "font-semibold text-magenta" : "font-semibold text-plum"}>{i.valor}</b>
          </p>
        ))}
      </div>
    </section>
  );
}
