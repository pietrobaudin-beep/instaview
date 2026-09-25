import Link from "next/link";
import { Check, Info, X } from "lucide-react";
import { UpgradeButton } from "@/components/pricing-actions";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { PLANS, SINGLE_UNLOCK, VITRINE, type PlanConfig } from "@/lib/plans";
import { SingleUnlockButton } from "@/components/single-unlock-button";
import { isBillingConfigured, isDemoBillingAllowed } from "@/lib/billing/stripe";
import { getCurrentUser } from "@/lib/auth";
import { direitosDe } from "@/lib/direitos";
import { linkDe } from "@/lib/billing/cakto";
import { safeNext, withParam } from "@/lib/utils";
import type { Plan } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Planos · Farejo", description: "Os planos do Farejo." };

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PERIODO: Record<string, string> = { weekly: " por 7 dias", monthly: "/mês", free: "" };

/**
 * A escada, do grátis ao topo — é ela que ordena, não o preço.
 *
 * Quem já paga **nunca vê um plano abaixo do seu**: oferecer o grátis a quem
 * assina é pedir para a pessoa desistir do que ela escolheu. O Farejador
 * (avulso) aparece só para quem não assina.
 */
const degrau = (p: Plan) => {
  const i = VITRINE.indexOf(p);
  return i < 0 ? VITRINE.length : i; // planos antigos: acima da vitrine
};

function Lista({ itens, tom = "ok" }: { itens: readonly string[]; tom?: "ok" | "aviso" }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {itens.map((f) => (
        <li key={f} className="flex items-start gap-2">
          {tom === "ok" ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          )}
          <span className={tom === "ok" ? "" : "text-muted-foreground"}>{f}</span>
        </li>
      ))}
    </ul>
  );
}

function Cartao({
  plano,
  destaque,
  atual,
  acao,
}: {
  plano: PlanConfig;
  destaque?: boolean;
  atual?: boolean;
  acao?: React.ReactNode;
}) {
  return (
    <section
      className={`flex flex-col rounded-3xl border bg-card p-6 ${
        destaque ? "border-vinho ring-2 ring-pink" : "border-border"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-extrabold">{plano.name}</h2>
        {atual && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            Seu plano
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{plano.para}</p>
      <p className="mt-4 text-3xl font-extrabold tracking-tight">
        {plano.priceMonthly ? brl(plano.priceMonthly) : "Grátis"}
        <span className="text-sm font-semibold text-muted-foreground">{PERIODO[plano.billing ?? "free"]}</span>
      </p>
      <div className="mt-5 flex-1 space-y-4">
        <Lista itens={plano.features} />
        {!!plano.avisos?.length && <Lista itens={plano.avisos} tom="aviso" />}
      </div>
      {acao && <div className="mt-6">{acao}</div>}
    </section>
  );
}

export default async function PricingPage({ searchParams }: { searchParams: { next?: string } }) {
  const demoMode = !isBillingConfigured() && isDemoBillingAllowed();
  const user = await getCurrentUser();
  const next = safeNext(searchParams.next);
  const loginHref = withParam("/login", "next", next ? withParam("/pricing", "next", next) : "/pricing");
  const fromProfile = next?.match(/^\/p\/([a-z0-9._]{1,30})$/i)?.[1] ?? null;

  const d = direitosDe(user);
  const meu = degrau(d.plano);
  const assina = d.plano !== "FREE";
  const planos = VITRINE.filter((p) => p !== "FREE" && (!assina || degrau(p) >= meu));

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" aria-label="Farejo">
          <Logo className="h-7" />
        </Link>
        <Link
          href={next || "/"}
          aria-label="Fechar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </Link>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight">
        {d.admin ? "Você tem acesso de Admin." : assina ? `Você tem o ${PLANS[d.plano].name}.` : "Planos do Farejo"}
      </h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Todas as funcionalidades de cada plano valem dentro das franquias do período — nenhum plano é uso
        ilimitado. As análises mostram o que está público e disponível na coleta; conta privada e lista
        fechada continuam fechadas.
      </p>
      {demoMode && (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2 text-xs text-amber-900">
          Modo de teste: sem Stripe, assinar libera o plano na hora e nada é cobrado.
        </p>
      )}

      {/* Plano antigo: mantém o que tinha, e é informado disso. */}
      {PLANS[d.plano].legado && (
        <p className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
          Seu plano é da estrutura anterior e continua valendo com os direitos que você já tinha. Os
          planos abaixo são os atuais.
        </p>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {!assina && !d.admin && (
          <Cartao
            plano={PLANS.FREE}
            atual={!!user}
            acao={
              !user ? (
                <Link href={withParam("/signup", "next", next ?? "/")}>
                  <Button variant="outline" className="w-full">
                    Criar conta grátis
                  </Button>
                </Link>
              ) : undefined
            }
          />
        )}

        {/* Farejador: avulso, só para quem não assina. */}
        {!assina && !d.admin && (
          <section className="flex flex-col rounded-3xl border border-border bg-card p-6">
            <h2 className="text-lg font-extrabold">{SINGLE_UNLOCK.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{SINGLE_UNLOCK.para}</p>
            <p className="mt-4 text-3xl font-extrabold tracking-tight">
              {brl(SINGLE_UNLOCK.price)}
              <span className="text-sm font-semibold text-muted-foreground"> por perfil</span>
            </p>
            <div className="mt-5 flex-1 space-y-4">
              <Lista itens={SINGLE_UNLOCK.features} />
              <Lista itens={SINGLE_UNLOCK.avisos} tom="aviso" />
            </div>
            <div className="mt-6">
              {fromProfile ? (
                <SingleUnlockButton username={fromProfile} variant="outline" />
              ) : (
                <Link
                  href="/"
                  className="block rounded-2xl border-2 border-vinho px-6 py-3 text-center font-bold text-vinho transition hover:bg-vinho hover:text-cream"
                >
                  Escolher um perfil
                </Link>
              )}
            </div>
          </section>
        )}

        {planos.map((p) => {
          const plano = PLANS[p];
          const atual = d.plano === p;
          // Farejador +: passe de 7 dias; vende quando o link da Cakto existe.
          const semanal = p === "FAREJADOR_MAIS" && !linkDe("FAREJADOR_MAIS");
          return (
            <Cartao
              key={p}
              plano={plano}
              destaque={p === "DETETIVE"}
              atual={atual}
              acao={
                d.admin || atual ? undefined : semanal ? (
                  // Sem o link da Cakto do passe, não há como vender.
                  <Button variant="outline" className="w-full" disabled>
                    Em breve
                  </Button>
                ) : (
                  <UpgradeButton
                    plan={p as "CAO" | "DETETIVE" | "FAREJADOR_MAIS"}
                    label={`Assinar ${plano.name}`}
                    variant={p === "DETETIVE" ? "accent" : "outline"}
                    next={next}
                  />
                )
              }
            />
          );
        })}
      </div>

      <div className="mt-8 space-y-2 text-xs text-muted-foreground">
        <p>
          <b>Stories:</b> o Farejo mostra os stories que ele mesmo capturou, pelo prazo do plano, contado da
          publicação. Não recupera story que nunca foi coletado.
        </p>
        <p>
          <b>Ao cancelar:</b> o plano vale até o fim do período pago. Depois disso as coletas param, os
          stories comuns saem do acervo e os favoritos ficam guardados por mais 30 dias.
        </p>
        <p>
          <b>Classificações e rankings</b> (mulher, homem, marca; quem aparece mais) são estimativas feitas a
          partir de sinais públicos, não prova de relação, intenção ou identidade.
        </p>
      </div>

      {!user && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href={loginHref} className="font-semibold text-accent hover:underline">
            Entrar
          </Link>
        </p>
      )}
    </main>
  );
}
