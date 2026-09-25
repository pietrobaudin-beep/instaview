import Link from "next/link";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { HeaderStroll } from "@/components/header-stroll";
import { Landing } from "@/components/landing/landing";
import { ProHome } from "@/components/pro-home";
import { SearchBlock } from "@/components/search-block";
import { SearchHero } from "@/components/search-hero";
import { Panel, StatusPill } from "@/components/ui/brand";
import { getCurrentUser } from "@/lib/auth";
import { creditosAvulso } from "@/lib/avulso-credito";
import { direitosDe } from "@/lib/direitos";
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
  const d = direitosDe(user);
  const paid = !!user && (d.admin || d.plano !== "FREE");

  // Pro with profiles in the Faro AI: the daily home, not a search box.
  const proHome = paid && user ? await getProHome(user.id) : null;

  // O Curioso com conta tem a revelação grátis; a home diz se ela está livre.
  const revelacao = user && !paid ? user.revelacaoUsername : null;
  // Farejador comprado sem perfil: lembra que há análise para usar.
  const creditos = user ? await creditosAvulso(user.id) : 0;

  if (user) {
    return (
      <>
        <AppNav plan={d.admin ? "ADMIN" : d.plano} />
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
                planName={d.admin ? "Admin" : planFor(d.plano).name}
                search={
                  <Panel title="Farejar outro @">
                    <SearchBlock />
                  </Panel>
                }
              />
            </>
          ) : (
            <div className="max-w-2xl">
              {creditos > 0 && (
                <p className="mb-5 rounded-2xl bg-pink/30 px-4 py-3 text-sm">
                  🐾 Você tem <b>{creditos} {creditos === 1 ? "análise completa" : "análises completas"}</b> para
                  usar. Digite o @ de quem você quer farejar e toque em <b>Usar minha análise</b>.
                </p>
              )}
              <SearchHero />
              {!paid && (
                <p className="mt-5 text-sm text-muted-foreground">
                  {revelacao ? (
                    <>
                      Sua revelação grátis foi usada em{" "}
                      <Link href={`/p/${encodeURIComponent(revelacao)}`} className="font-semibold text-accent hover:underline">
                        @{revelacao}
                      </Link>
                      .{" "}
                      <Link href="/pricing" className="font-semibold text-accent hover:underline">
                        Conhecer os planos
                      </Link>
                    </>
                  ) : (
                    <>
                      Conta grátis: escolha um perfil e revele <b className="text-foreground">quem mais aparece</b>{" "}
                      nas interações dele — uma vez por conta.
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
