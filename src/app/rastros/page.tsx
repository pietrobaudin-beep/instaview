import Link from "next/link";
import { redirect } from "next/navigation";
import { PawPrint } from "lucide-react";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Panel, StatusPill } from "@/components/ui/brand";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FOLLOWING_KIND } from "@/lib/following-tracker";
import { planFor } from "@/lib/plans";
import { PlanLimits } from "@/components/plan-limits";
import { ResumoDoFaro, type PerfilResumo } from "@/components/resumo-do-faro";
import type { EventData } from "@/lib/faro-watch";
import { consultsUsed, peekUsageKey } from "@/lib/usage";
import { COMMENTS_KIND, LIKES_KIND } from "@/lib/post-activity";
import { pistas } from "@/lib/voice";
import { Mascot } from "@/components/ui/mascot";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Faro AI · Farejo",
  description: "Os perfis que estão no seu Faro AI.",
};

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default async function RastrosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/rastros");

  // The Faro AI is the Pro feature. Free accounts may still have rows created by
  // the old "track on view" behaviour; they are not shown as pinned profiles.
  if (user.plan === "FREE") {
    return (
      <>
        <AppNav plan={user.plan} />
        <main className="mx-auto max-w-3xl px-6 py-8 md:pl-[15.5rem]">
          <h1 className="mb-6 text-3xl font-bold tracking-tight">Faro AI</h1>
          <Panel>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Mascot pose="feliz" className="h-24 text-vinho" bob />
              <p className="text-lg font-bold">Quer que o Farejo acompanhe por você?</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Coloque perfis no Faro AI e receba alertas quando houver mudanças detectáveis.
              </p>
              <Link href="/pricing?next=/rastros" className="mt-2">
                <Button variant="accent">
                  <PawPrint className="h-4 w-4" /> Desbloquear Farejo PRO
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
  const consultados = await consultsUsed(peekUsageKey(user));
  const weekBy = new Map(week.map((c) => [c.profileId, c._count._all]));
  const totalWeek = week.reduce((n, c) => n + c._count._all, 0);

  // O conteúdo de cada perfil para o resumo. Só banco: nada aqui chama o
  // provedor. São poucos perfis por conta (o PRO tem 1), então uma leva de
  // consultas por perfil é barata.
  const desde = new Date(Date.now() - WEEK);
  const janelaStories = planFor(user.plan).storiesHours;
  const storiesDesde = Number.isFinite(janelaStories)
    ? new Date(Date.now() - janelaStories * 3_600_000)
    : undefined;
  const resumos: PerfilResumo[] = await Promise.all(
    profiles.map(async (p) => {
      const seguindo = (type: "FOLLOW" | "UNFOLLOW") => ({
        profileId: p.id,
        kind: FOLLOWING_KIND,
        type,
        isVerified: false,
        detectedAt: { gte: desde },
      });
      const midia = (kind: string) => ({
        profileId: p.id,
        kind,
        ...(kind === "story" && storiesDesde ? { detectedAt: { gte: storiesDesde } } : {}),
      });
      const [seguiu, nSeguiu, deixou, nDeixou, stories, nStories, marcacoes, nMarcacoes] =
        await Promise.all([
          prisma.followerChange.findMany({ where: seguindo("FOLLOW"), orderBy: { detectedAt: "desc" }, take: 12 }),
          prisma.followerChange.count({ where: seguindo("FOLLOW") }),
          prisma.followerChange.findMany({ where: seguindo("UNFOLLOW"), orderBy: { detectedAt: "desc" }, take: 12 }),
          prisma.followerChange.count({ where: seguindo("UNFOLLOW") }),
          prisma.profileEvent.findMany({ where: midia("story"), orderBy: { detectedAt: "desc" }, take: 12 }),
          prisma.profileEvent.count({ where: midia("story") }),
          prisma.profileEvent.findMany({ where: midia("tagged"), orderBy: { detectedAt: "desc" }, take: 12 }),
          prisma.profileEvent.count({ where: midia("tagged") }),
        ]);
      const pessoa = (c: (typeof seguiu)[number]) => ({ username: c.followerUsername, avatarUrl: c.avatarUrl });
      const item = (e: (typeof stories)[number]) => ({
        id: e.id,
        thumbnailUrl: (e.data as unknown as EventData | null)?.thumbnailUrl ?? null,
      });
      return {
        id: p.id,
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        pistasSemana: weekBy.get(p.id) ?? 0,
        seguiu: { total: nSeguiu, pessoas: seguiu.map(pessoa) },
        deixou: { total: nDeixou, pessoas: deixou.map(pessoa) },
        stories: { total: nStories, itens: stories.map(item) },
        marcacoes: { total: nMarcacoes, itens: marcacoes.map(item) },
      };
    }),
  );

  return (
    <>
      <AppNav plan={user.plan} />
      <main className="mx-auto max-w-6xl px-6 py-8 md:pl-[15.5rem]">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Faro AI</h1>
          {/* Says how much room is left, so the limit never arrives as a surprise. */}
          <StatusPill tone={profiles.length >= planFor(user.plan).maxProfiles ? "yellow" : "green"}>
            <span className="text-[8px]">●</span> {profiles.length} de{" "}
            {planFor(user.plan).maxProfiles} no Faro AI
          </StatusPill>
        </div>
        <PlanLimits
          plan={user.plan}
          consultados={consultados}
          noFaro={profiles.length}
          className="mb-6 mt-4"
        />
        {profiles.length > 0 && (
          <p className="mb-6 text-sm text-muted-foreground">
            {totalWeek > 0 ? (
              <>
                <b className="text-foreground">{pistas(totalWeek)}</b> encontradas esta semana.
              </>
            ) : (
              <>Nada passou pelo Faro AI esta semana.</>
            )}
          </p>
        )}

        {profiles.length === 0 ? (
          <Panel>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Mascot pose="feliz" className="h-24 text-vinho" bob />
              <p className="text-lg font-bold">O Faro AI ainda não está farejando ninguém.</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Fareje um @ e toque em <b>Colocar no Faro AI</b>. A partir daí o Farejo observa por
                você e avisa quando algo mudar.
              </p>
              <Link href="/" className="mt-2">
                <Button variant="accent">Escolher um perfil</Button>
              </Link>
            </div>
          </Panel>
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-2">
            {resumos.map((r) => (
              <ResumoDoFaro key={r.id} perfil={r} />
            ))}
          </div>
        )}
      </main>
      <NavSpacer />
    </>
  );
}
