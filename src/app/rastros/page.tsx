import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Pin } from "lucide-react";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Panel, StatusPill } from "@/components/ui/brand";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FOLLOWING_KIND } from "@/lib/following-tracker";
import { planFor } from "@/lib/plans";
import { COMMENTS_KIND, LIKES_KIND } from "@/lib/post-activity";
import { activityLevel, pistas } from "@/lib/voice";
import { Mascot } from "@/components/ui/mascot";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meus rastros · Farejo",
  description: "Os perfis que estão no seu Faro.",
};

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default async function RastrosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/rastros");

  // The Faro is the Pro feature. Free accounts may still have rows created by
  // the old "track on view" behaviour; they are not shown as pinned profiles.
  if (user.plan === "FREE") {
    return (
      <>
        <AppNav plan={user.plan} />
        <main className="mx-auto max-w-3xl px-6 py-8 md:pl-[15.5rem]">
          <h1 className="mb-6 text-3xl font-bold tracking-tight">Meus rastros</h1>
          <Panel>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Mascot pose="feliz" className="h-24 text-vinho" bob />
              <p className="text-lg font-bold">Quer que o Farejo acompanhe por você?</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Coloque perfis no Faro e receba alertas quando houver mudanças detectáveis.
              </p>
              <Link href="/pricing?next=/rastros" className="mt-2">
                <Button variant="accent">
                  <Pin className="h-4 w-4" /> Desbloquear Farejo PRO
                </Button>
              </Link>
            </div>
          </Panel>
        </main>
        <NavSpacer />
      </>
    );
  }

  const profiles = await prisma.trackedProfile.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  // Pistas per profile this week — drives the activity level badge.
  const week = profiles.length
    ? await prisma.followerChange.groupBy({
        by: ["profileId"],
        where: {
          profileId: { in: profiles.map((p) => p.id) },
          kind: { in: [FOLLOWING_KIND, LIKES_KIND, COMMENTS_KIND] },
          isVerified: false,
          detectedAt: { gte: new Date(Date.now() - WEEK) },
        },
        _count: { _all: true },
      })
    : [];
  const weekBy = new Map(week.map((c) => [c.profileId, c._count._all]));
  const totalWeek = week.reduce((n, c) => n + c._count._all, 0);

  return (
    <>
      <AppNav plan={user.plan} />
      <main className="mx-auto max-w-6xl px-6 py-8 md:pl-[15.5rem]">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Meus rastros</h1>
          {/* Says how much room is left, so the limit never arrives as a surprise. */}
          <StatusPill tone={profiles.length >= planFor(user.plan).maxProfiles ? "yellow" : "green"}>
            <span className="text-[8px]">●</span> {profiles.length} de{" "}
            {planFor(user.plan).maxProfiles} no Faro
          </StatusPill>
        </div>
        {profiles.length > 0 && (
          <p className="mb-6 text-sm text-muted-foreground">
            {totalWeek > 0 ? (
              <>
                <b className="text-foreground">{pistas(totalWeek)}</b> encontradas esta semana.
              </>
            ) : (
              <>Nada passou pelo Faro esta semana.</>
            )}
          </p>
        )}

        {profiles.length === 0 ? (
          <Panel>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Mascot pose="feliz" className="h-24 text-vinho" bob />
              <p className="text-lg font-bold">Seu Faro está vazio</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Fareje um @ e toque em <b>Colocar no Faro</b>. A partir daí o Farejo observa por
                você e avisa quando algo mudar.
              </p>
              <Link href="/" className="mt-2">
                <Button variant="accent">Farejar um perfil</Button>
              </Link>
            </div>
          </Panel>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {profiles.map((p) => {
              const n = weekBy.get(p.id) ?? 0;
              const level = activityLevel(n);
              return (
                <li key={p.id}>
                  <Link
                    href={`/rastros/${encodeURIComponent(p.username)}`}
                    className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 transition hover:border-accent/50"
                  >
                    <div className="relative shrink-0">
                      <div className="rounded-full p-0.5 ring-2 ring-pink">
                        <Avatar src={p.avatarUrl} name={p.displayName ?? p.username} size={52} />
                      </div>
                      {/* The pink pin: this profile is in your Faro. */}
                      <Pin className="absolute -right-1 -top-1 h-5 w-5 fill-pink text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">@{p.username}</p>
                      <p className="mt-0.5 text-xs font-semibold">
                        {level.emoji} {level.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{pistas(n)} esta semana</p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <NavSpacer />
    </>
  );
}
