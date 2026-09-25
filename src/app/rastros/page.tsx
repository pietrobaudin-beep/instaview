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
import { visivel } from "@/lib/acervo";
import { StoriesDoFaro } from "@/components/stories-do-faro";
import type { ViewerStory } from "@/components/story-viewer";
import { lerSalvos } from "@/lib/stories-salvos";
import { resumoDaFranquia } from "@/lib/franquia";
import { direitosDe } from "@/lib/direitos";
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
  const d = direitosDe(user);
  const semFaro = !d.admin && d.config.maxProfiles <= 0;
  const selo = d.admin ? "ADMIN" : d.plano;
  // Sem acompanhamento no plano (Curioso, Farejador +, plano vencido): o Faro
  // AI é dos planos que acompanham. Perfis que já estavam lá não somem — só
  // param de ser coletados.
  if (semFaro) {
    return (
      <>
        <AppNav plan={selo} />
        <main className="mx-auto max-w-3xl px-6 py-8 md:pl-[15.5rem]">
          <h1 className="mb-6 text-3xl font-bold tracking-tight">Faro AI</h1>
          <Panel>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Mascot pose="feliz" className="h-24 text-vinho" bob />
              <p className="text-lg font-bold">Quer que o Farejo acompanhe por você?</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                O Faro de Cão acompanha um perfil a cada 3 dias; o Faro de Detetive, todo dia. Você recebe
                as mudanças detectadas entre uma coleta e outra.
              </p>
              <Link href="/pricing?next=/rastros" className="mt-2">
                <Button variant="accent">
                  <PawPrint className="h-4 w-4" /> Conhecer os planos
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
  const resumoPlano = await resumoDaFranquia(user);
  const weekBy = new Map(week.map((c) => [c.profileId, c._count._all]));
  const totalWeek = week.reduce((n, c) => n + c._count._all, 0);

  // O conteúdo de cada perfil para o resumo. Só banco: nada aqui chama o
  // provedor. São poucos perfis por conta (o PRO tem 1), então uma leva de
  // consultas por perfil é barata.
  // Os stories no prazo de cada perfil, para a faixa do topo.
  const storiesPorPerfil = new Map<string, ViewerStory[]>();
  const proxied = (url: string | null) =>
    url && /(?:\.fbcdn\.net|\.cdninstagram\.com)/i.test(url) ? `/api/img?url=${encodeURIComponent(url)}` : url;

  const resumos: PerfilResumo[] = await Promise.all(
    profiles.map(async (p) => {
      // Só o que aconteceu desde que o perfil entrou no Faro AI. Stories são a
      // exceção: todos os capturados valem (dentro da janela do plano).
      const seguindo = (type: "FOLLOW" | "UNFOLLOW") => ({
        profileId: p.id,
        kind: FOLLOWING_KIND,
        type,
        isVerified: false,
        detectedAt: { gte: p.monitoringStartedAt },
      });
      const midia = (kind: string) =>
        kind === "story"
          ? { profileId: p.id, kind }
          : // Marcações que já existiam quando o perfil entrou são a base, não
            // novidade: ficam de fora.
            { profileId: p.id, kind, baseline: false };
      const [seguiu, nSeguiu, deixou, nDeixou, todosStories, favoritos, marcacoes, nMarcacoes] =
        await Promise.all([
          prisma.followerChange.findMany({ where: seguindo("FOLLOW"), orderBy: { detectedAt: "desc" }, take: 12 }),
          prisma.followerChange.count({ where: seguindo("FOLLOW") }),
          prisma.followerChange.findMany({ where: seguindo("UNFOLLOW"), orderBy: { detectedAt: "desc" }, take: 12 }),
          prisma.followerChange.count({ where: seguindo("UNFOLLOW") }),
          // Todos, para a janela do plano ser aplicada aqui — contar no banco
          // incluiria os vencidos.
          prisma.profileEvent.findMany({ where: midia("story"), orderBy: { detectedAt: "desc" }, take: 300 }),
          lerSalvos(p.id),
          prisma.profileEvent.findMany({ where: midia("tagged"), orderBy: { detectedAt: "desc" }, take: 12 }),
          prisma.profileEvent.count({ where: midia("tagged") }),
        ]);
      const fav = new Set(favoritos);
      const stories = todosStories.filter((e) => visivel(user, e, fav));
      // Do mais antigo ao mais novo, como o Instagram mostra.
      storiesPorPerfil.set(
        p.id,
        stories
          .slice(0, 30)
          .reverse()
          .map((e) => {
            const d = e.data as unknown as EventData | null;
            return {
              id: e.id,
              imageUrl: proxied(d?.thumbnailUrl ?? null),
              takenAt: d?.takenAt ?? e.detectedAt.toISOString(),
              mentions: d?.people ?? [],
              expirou: Date.now() - e.detectedAt.getTime() >= 24 * 60 * 60 * 1000,
            };
          }),
      );
      const pessoa = (c: (typeof seguiu)[number]) => ({ username: c.followerUsername, avatarUrl: c.avatarUrl });
      const item = (e: (typeof todosStories)[number]) => ({
        id: e.id,
        thumbnailUrl: (e.data as unknown as EventData | null)?.thumbnailUrl ?? null,
      });
      return {
        id: p.id,
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        pistasSemana: weekBy.get(p.id) ?? 0,
        desde: p.monitoringStartedAt.toISOString(),
        seguiu: { total: nSeguiu, pessoas: seguiu.map(pessoa) },
        deixou: { total: nDeixou, pessoas: deixou.map(pessoa) },
        stories: { total: stories.length, itens: stories.slice(0, 12).map(item) },
        marcacoes: { total: nMarcacoes, itens: marcacoes.map(item) },
        // Última coleta + cadência do plano; sem coleta ainda, é agora.
        proximaColeta: p.lastCollectedAt
          ? new Date(p.lastCollectedAt.getTime() + d.config.cadenciaHoras * 3_600_000).toISOString()
          : new Date().toISOString(),
      };
    }),
  );

  return (
    <>
      <AppNav plan={selo} />
      <main className="mx-auto max-w-6xl px-6 py-8 md:pl-[15.5rem]">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Faro AI</h1>
          {/* Says how much room is left, so the limit never arrives as a surprise. */}
          <StatusPill tone={profiles.length >= d.config.maxProfiles ? "yellow" : "green"}>
            <span className="text-[8px]">●</span> {profiles.length}
            {Number.isFinite(d.config.maxProfiles) ? ` de ${d.config.maxProfiles}` : ""} no Faro AI
          </StatusPill>
        </div>
        <PlanLimits resumo={resumoPlano} className="mb-6 mt-4" />
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
          <>
          <StoriesDoFaro
            perfis={profiles.map((p) => ({
              username: p.username,
              avatarUrl: p.avatarUrl,
              displayName: p.displayName,
              stories: storiesPorPerfil.get(p.id) ?? [],
            }))}
          />
          <div className="grid items-start gap-5 xl:grid-cols-2">
            {resumos.map((r) => (
              <ResumoDoFaro key={r.id} perfil={r} />
            ))}
          </div>
          </>
        )}
      </main>
      <NavSpacer />
    </>
  );
}
