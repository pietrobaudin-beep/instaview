import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/brand";
import { Mascot } from "@/components/ui/mascot";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { peekProfileCached } from "@/lib/profile-cache";
import { peekUsageKey } from "@/lib/usage";
import { OCULTOS, chaveOcultos } from "@/lib/pesquisados";
import { PesquisadosLista } from "@/components/pesquisados-lista";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pesquisados · Farejo",
  description: "Os perfis que você já farejou.",
};

function quando(d: Date): string {
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 3600) return `há ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  if (s < 30 * 86400) return `há ${Math.round(s / 86400)} d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/**
 * Os perfis já pesquisados — só para reabrir.
 *
 * Nada aqui está sendo acompanhado: quem o Faro AI observa fica em "Faro AI". Esta
 * lista existe para voltar a um @ sem digitar de novo, e reabrir um perfil já
 * consultado nunca gasta uma nova consulta do plano.
 */
export default async function PesquisadosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/pesquisados");

  const key = peekUsageKey(user);
  const rows = key
    ? await prisma.analysisUsage.findMany({
        where: { key },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { username: true, createdAt: true },
      })
    : [];

  // O que a pessoa tirou da lista fica escondido — a consulta em si continua
  // contada, senão apagar daqui seria farejar de graça outra vez.
  const escondidos = key
    ? await prisma.sectionCache
        .findUnique({ where: { username_section: { username: chaveOcultos(key), section: OCULTOS } } })
        .catch(() => null)
    : null;
  const ocultos = new Set<string>(((escondidos?.data as string[] | null) ?? []).filter(Boolean));

  const perfis = await Promise.all(
    rows
      .filter((r) => !ocultos.has(r.username))
      .map(async (r) => ({
        ...r,
        cache: await peekProfileCached(r.username),
      })),
  );

  return (
    <>
      <AppNav plan={user.plan} />
      <main className="mx-auto max-w-4xl px-6 py-8 md:pl-[15.5rem]">
        <h1 className="text-3xl font-bold tracking-tight">Pesquisados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Perfis que você já farejou. Eles <b className="text-foreground">não</b> estão sendo
          acompanhados — para isso, coloque no Faro AI.
        </p>

        {perfis.length === 0 ? (
          <Panel className="mt-6">
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Mascot pose="sentado" className="h-20 text-vinho" bob />
              <p className="text-lg font-bold">Você ainda não farejou ninguém</p>
              <Link href="/" className="mt-1">
                <Button variant="accent">
                  <Search className="h-4 w-4" /> Farejar um @
                </Button>
              </Link>
            </div>
          </Panel>
        ) : (
          <PesquisadosLista
            itens={perfis.map((p) => ({
              username: p.username,
              displayName: p.cache?.displayName ?? null,
              avatarUrl: p.cache?.avatarUrl ?? null,
              quando: quando(p.createdAt),
            }))}
          />
        )}
      </main>
      <NavSpacer />
    </>
  );
}
