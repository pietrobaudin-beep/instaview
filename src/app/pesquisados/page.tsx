import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/brand";
import { Mascot } from "@/components/ui/mascot";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { peekProfileCached } from "@/lib/profile-cache";
import { peekUsageKey } from "@/lib/usage";

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
 * Nada aqui está sendo acompanhado: quem o Faro observa fica em "Faro". Esta
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

  const perfis = await Promise.all(
    rows.map(async (r) => ({
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
          acompanhados — para isso, coloque no Faro.
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
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {perfis.map((p) => (
              <li key={p.username}>
                <Link
                  href={`/p/${encodeURIComponent(p.username)}`}
                  className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 transition hover:border-accent/50"
                >
                  <Avatar
                    src={p.cache?.avatarUrl ?? null}
                    name={p.cache?.displayName ?? p.username}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">@{p.username}</p>
                    {p.cache?.displayName && (
                      <p className="truncate text-xs text-muted-foreground">{p.cache.displayName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      farejado {quando(p.createdAt)}
                    </p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <NavSpacer />
    </>
  );
}
