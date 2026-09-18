import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { SniffingDog } from "@/components/ui/dog";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Panel, StatusPill } from "@/components/ui/brand";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FOLLOWING_KIND } from "@/lib/following-tracker";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Rastreios · Farejo", description: "Os perfis que você acompanha no Farejo." };

export default async function RastreiosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/rastreios");

  const profiles = await prisma.trackedProfile.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  // How many changes we have detected on each profile so far.
  const counts = profiles.length
    ? await prisma.followerChange.groupBy({
        by: ["profileId"],
        where: {
          profileId: { in: profiles.map((p) => p.id) },
          kind: FOLLOWING_KIND,
          isVerified: false,
        },
        _count: { _all: true },
      })
    : [];
  const changesBy = new Map(counts.map((c) => [c.profileId, c._count._all]));

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight">Rastreios</h1>
          <StatusPill tone="green">
            <span className="text-[8px]">●</span> {profiles.length} ativo
            {profiles.length === 1 ? "" : "s"}
          </StatusPill>
        </div>

        {profiles.length === 0 ? (
          <Panel>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <SniffingDog className="h-24 text-ink opacity-70" />
              <p className="text-lg font-bold">Você ainda não rastreia ninguém</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Busque um @, analise o perfil e toque em <b>Começar a rastrear</b> para acompanhar
                as mudanças ao longo do tempo.
              </p>
              <Link href="/" className="mt-2">
                <Button variant="accent">Farejar um perfil</Button>
              </Link>
            </div>
          </Panel>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {profiles.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/rastreios/${encodeURIComponent(p.username)}`}
                  className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 transition hover:border-accent/50"
                >
                  <div className="shrink-0 rounded-full p-0.5 ring-2 ring-pink">
                    <Avatar src={p.avatarUrl} name={p.displayName ?? p.username} size={52} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{p.username}</p>
                    {p.displayName && (
                      <p className="truncate text-xs text-muted-foreground">{p.displayName}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatNumber(p.followersCount)} seguidores ·{" "}
                      {changesBy.get(p.id) ?? 0} mudanças detectadas
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
