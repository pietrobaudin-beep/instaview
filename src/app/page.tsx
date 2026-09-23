import Link from "next/link";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { HeaderStroll } from "@/components/header-stroll";
import { Landing } from "@/components/landing/landing";
import { ProHome } from "@/components/pro-home";
import { SearchBlock } from "@/components/search-block";
import { SearchHero } from "@/components/search-hero";
import { Panel, StatusPill } from "@/components/ui/brand";
import { getCurrentUser } from "@/lib/auth";
import { FREE_ANALYSIS_LIMIT, FREE_LIMIT_ENFORCED, checkAllowance, peekUsageKey } from "@/lib/usage";
import { brazilHour, getProHome } from "@/lib/pro-home";
import { env } from "@/lib/env";
import { planFor } from "@/lib/plans";

export const dynamic = "force-dynamic";

function DemoBadge({ tone }: { tone: "yellow" | "dark" }) {
  if (env.INSTAGRAM_PROVIDER !== "mock") return null;
  return (
    <StatusPill tone={tone} className="mb-6">
      Modo demonstração · dados simulados
    </StatusPill>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  const paid = !!user && user.plan !== "FREE";

  // Pro with profiles in the Faro AI: the daily home, not a search box.
  const proHome = paid && user ? await getProHome(user.id) : null;

  // Free plan includes one profile; show what is left of it.
  let used = 0;
  if (!paid) {
    const key = peekUsageKey(user);
    if (key) used = (await checkAllowance(key, "")).used;
  }
  const left = Math.max(0, FREE_ANALYSIS_LIMIT - used);

  if (user) {
    return (
      <>
        <AppNav plan={user.plan} />
        {/* O Faro AI passeando no topo — e, no celular, passando na frente da
            marca. Só na home PRO: na tela de busca ele já aparece ao lado do
            título, e dois cachorros animados na mesma dobra brigavam entre si
            e com o campo. */}
        {proHome && (
          <div className="mx-auto max-w-6xl px-6 md:pl-[15.5rem]">
            <HeaderStroll marca className="relative h-16 md:hidden" />
            <HeaderStroll className="relative hidden h-16 md:block" />
          </div>
        )}
        <main className="mx-auto max-w-5xl px-6 pb-10 pt-8 md:pl-[15.5rem]">
          <DemoBadge tone="yellow" />

          {proHome ? (
            <>
              {/* Farejar vem antes: é a ação principal de quem abre o app. */}
              <ProHome
                data={proHome}
                hour={brazilHour()}
                planName={planFor(user.plan).name}
                search={
                  <Panel title="Farejar outro @">
                    <SearchBlock />
                  </Panel>
                }
              />
            </>
          ) : (
            <div className="max-w-2xl">
              <SearchHero />
              {!paid && !FREE_LIMIT_ENFORCED && (
                <p className="mt-5 text-sm text-muted-foreground">
                  Localhost: sem limite de análises. No site, o plano grátis continua com 1 perfil.
                </p>
              )}
              {!paid && FREE_LIMIT_ENFORCED && (
                <p className="mt-5 text-sm text-muted-foreground">
                  {left > 0 ? (
                    <>
                      Plano grátis: <b className="text-foreground">{left}</b> análise disponível.
                    </>
                  ) : (
                    <>
                      Você já usou sua análise gratuita.{" "}
                      <Link href="/pricing" className="font-semibold text-accent hover:underline">
                        Conhecer o Farejo PRO
                      </Link>
                    </>
                  )}
                </p>
              )}
            </div>
          )}
        </main>
        <NavSpacer />
      </>
    );
  }

  // Signed out: the public landing page.
  return <Landing demo={env.INSTAGRAM_PROVIDER === "mock"} />;
}
