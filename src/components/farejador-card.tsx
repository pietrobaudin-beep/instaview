"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { PLANS, SINGLE_UNLOCK } from "@/lib/plans";
import { SingleUnlockButton } from "@/components/single-unlock-button";
import { UpgradeButton } from "@/components/pricing-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Farejador e Farejador + são o mesmo plano em dois tamanhos: um cartão só,
 * com a chave em cima. O Farejador é 1 análise; o + é o passe de 7 dias,
 * com mais coisas.
 */
export function FarejadorCard({
  perfil = null,
  vendeMais = true,
  temMais = false,
  className,
}: {
  /** Veio de um perfil: o Farejador libera esse @ direto. */
  perfil?: string | null;
  /** O link da Cakto do + existe (senão, "Em breve"). */
  vendeMais?: boolean;
  /** A pessoa já está no Farejador +. */
  temMais?: boolean;
  className?: string;
}) {
  const [mais, setMais] = React.useState(temMais);
  const cfg = PLANS.FAREJADOR_MAIS;

  const itens = mais
    ? [
        "Passe de 7 dias, sem renovação automática",
        "2 análises completas nos 7 dias",
        "Stories capturados por 48 horas",
        "Ver o que a pessoa curtiu",
        "2 consultas de outras redes",
      ]
    : [
        "1 análise completa, sem borrão",
        "Escolha o perfil na hora ou depois",
        "Resultado aberto por 7 dias",
        "Sem assinatura",
      ];

  return (
    <section className={cn("flex flex-col rounded-3xl border-2 border-pink bg-card p-6", className)}>
      {/* A chave: Farejador ↔ Farejador + */}
      <div className="flex rounded-full bg-muted p-1" role="tablist" aria-label="Tamanho do Farejador">
        {[
          { v: false, t: SINGLE_UNLOCK.name },
          { v: true, t: cfg.name },
        ].map((o) => (
          <button
            key={o.t}
            type="button"
            role="tab"
            aria-selected={mais === o.v}
            onClick={() => setMais(o.v)}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-sm font-bold transition",
              mais === o.v ? "bg-vinho text-cream shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.t}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-extrabold">{mais ? cfg.name : SINGLE_UNLOCK.name}</h2>
        {mais && temMais && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            Seu plano
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {mais ? "Mais perfis e mais tempo, por uma semana." : "Uma pessoa, uma análise completa."}
      </p>
      <p className="mt-4 text-3xl font-extrabold tracking-tight">
        {brl(mais ? cfg.priceMonthly : SINGLE_UNLOCK.price)}
        <span className="text-sm font-semibold text-muted-foreground">
          {mais ? " por 7 dias" : " uma vez"}
        </span>
      </p>

      <ul className="mt-5 flex-1 space-y-1.5 text-sm">
        {itens.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {!mais ? (
          <SingleUnlockButton username={perfil} variant="outline" />
        ) : temMais ? (
          <Button variant="outline" className="w-full" disabled>
            Você já tem o {cfg.name}
          </Button>
        ) : vendeMais ? (
          <UpgradeButton
            plan="FAREJADOR_MAIS"
            label={`Quero o ${cfg.name}`}
            variant="accent"
            next={perfil ? `/p/${perfil}` : null}
          />
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Em breve
          </Button>
        )}
      </div>
    </section>
  );
}
