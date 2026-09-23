import { notFound, redirect } from "next/navigation";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { AppHeader } from "@/components/ui/app-chrome";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeUsername } from "@/lib/utils";
import { cotaDoMes, lerSalvos } from "@/lib/stories-salvos";
import { StoriesSalvosLista } from "@/components/stories-salvos-lista";
import type { SavedStory } from "@/components/saved-stories";
import type { EventData } from "@/lib/faro-watch";

export const dynamic = "force-dynamic";

/**
 * Os stories salvos de um perfil, em página própria.
 *
 * Ficavam dentro do painel do Faro AI e dobravam a altura do cartão. Aqui a
 * coleção pode crescer sem espremer as pistas — e ela cresce todo mês, que é
 * o ponto do recurso.
 *
 * Diferente da lista do painel, **nada aqui é filtrado pelo prazo do plano**:
 * é justamente a estrela que tira o story do prazo.
 */
export default async function StoriesSalvosPage({
  params,
}: {
  params: { username: string };
}) {
  const username = normalizeUsername(decodeURIComponent(params.username));
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/rastros/${encodeURIComponent(username)}/salvos`);

  const profile = await prisma.trackedProfile.findUnique({
    where: { userId_username: { userId: user.id, username } },
  });
  if (!profile) notFound();

  const [ids, cota] = await Promise.all([
    lerSalvos(profile.id),
    cotaDoMes(user.id, user.plan),
  ]);

  // Busca só os salvos, pelos ids — sem trazer o acervo inteiro para filtrar
  // na memória depois.
  const eventos = ids.length
    ? await prisma.profileEvent.findMany({
        where: { id: { in: ids }, profileId: profile.id, kind: "story" },
        orderBy: { detectedAt: "desc" },
      })
    : [];

  const stories: SavedStory[] = eventos.map((e) => {
    const d = e.data as unknown as EventData;
    return {
      id: e.id,
      takenAt: d?.takenAt ?? null,
      detectedAt: e.detectedAt.toISOString(),
      thumbnailUrl: d?.thumbnailUrl ?? null,
      mentions: d?.people ?? [],
    };
  });

  return (
    <>
      <AppNav plan={user.plan} />
      <main className="mx-auto max-w-5xl px-5 py-6 md:pl-[15.5rem]">
        <AppHeader
          title="Stories salvos"
          backHref={`/rastros/${encodeURIComponent(username)}`}
          subtitle={<span className="text-sm text-muted-foreground">@{username}</span>}
        />
        <StoriesSalvosLista
          stories={stories}
          username={username}
          avatarUrl={profile.avatarUrl}
          profileId={profile.id}
          cotaInicial={cota}
        />
      </main>
      <NavSpacer />
    </>
  );
}
