import { Check } from "lucide-react";
import type { Plan } from "@prisma/client";
import { Reveal } from "@/components/ui/reveal";
import { SwipeDeck } from "@/components/ui/swipe-deck";
import { FarejadorCard } from "@/components/farejador-card";
import { UpgradeButton } from "@/components/pricing-actions";
import { PLANS } from "@/lib/plans";
import { linkDe } from "@/lib/billing/cakto";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CAO_INCLUDES = [
  "1 perfil acompanhado, coleta a cada 3 dias",
  "Quem começou e deixou de seguir",
  "Stories capturados por 3 dias",
  "5 perguntas e 5 resumos com o Faro AI",
];

const DETETIVE_INCLUDES = [
  "1 perfil acompanhado todo dia",
  "3 análises completas por mês",
  "Stories por 7 dias e alerta \"Me avise quando…\"",
  "30 perguntas e 30 resumos com o Faro AI",
];

/**
 * Os planos do Farejo, os mesmos na landing e em /pricing: Farejador (com a
 * chave para o +), Faro de Cão no meio e Faro de Detetive. Cada botão compra
 * direto — vai ao /checkout.
 */
export function PlanosCards({
  className,
  perfil = null,
  atual = null,
  next = null,
}: {
  className?: string;
  /** Veio de um perfil: o Farejador libera esse @ direto. */
  perfil?: string | null;
  /** O plano de quem está vendo, para marcar "Seu plano". */
  atual?: Plan | null;
  next?: string | null;
}) {
  return (
    // No celular: um cartão de cada vez, arrastando para o lado.
    <SwipeDeck className={className} label="Planos do Farejo">
            {/* Farejador e Farejador +: um cartão, com a chave para o +. */}
            <Reveal className="h-full">
              <FarejadorCard
                className="h-full p-8"
                perfil={perfil}
                vendeMais={!!linkDe("FAREJADOR_MAIS")}
                temMais={atual === "FAREJADOR_MAIS"}
              />
            </Reveal>

            {/* Faro de Cão no meio, em destaque; cada plano compra direto
                (vai ao /checkout), sem passar pela página de planos. */}
            <Reveal delay={100} className="vinho-surface flex h-full flex-col rounded-3xl p-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{PLANS.CAO.name}</h3>
                <span className="rounded-full bg-yellow px-2.5 py-1 text-[11px] font-bold text-ink">
                  Recomendado
                </span>
              </div>
              <p className="mt-1 text-cream/70">Acompanhe um perfil a cada 3 dias.</p>
              <p className="mt-6 text-4xl font-bold">
                {brl(PLANS.CAO.priceMonthly)}
                <span className="text-lg font-medium text-cream/60">/mês</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {CAO_INCLUDES.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <Check className="h-5 w-5 shrink-0 text-pink" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {atual === "CAO" ? (
                  <p className="rounded-full bg-white/15 px-6 py-3 text-center font-bold">Seu plano</p>
                ) : (
                  <UpgradeButton plan="CAO" label={`Assinar ${PLANS.CAO.name}`} variant="accent" next={next} />
                )}
              </div>
            </Reveal>

            <Reveal delay={200} className="relative flex h-full flex-col rounded-3xl border border-border bg-card p-8">
              <h3 className="text-2xl font-bold">{PLANS.DETETIVE.name}</h3>
              <p className="mt-1 text-muted-foreground">Acompanhamento diário e todo o Faro AI.</p>
              <p className="mt-6 text-4xl font-bold">
                {brl(PLANS.DETETIVE.priceMonthly)}
                <span className="text-lg font-medium text-muted-foreground">/mês</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {DETETIVE_INCLUDES.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <Check className="h-5 w-5 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {atual === "DETETIVE" ? (
                  <p className="rounded-full bg-muted px-6 py-3 text-center font-bold">Seu plano</p>
                ) : (
                  <UpgradeButton plan="DETETIVE" label={`Assinar ${PLANS.DETETIVE.name}`} variant="outline" next={next} />
                )}
              </div>
            </Reveal>
          </SwipeDeck>
  );
}
