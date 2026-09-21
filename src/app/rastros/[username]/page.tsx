import { notFound, redirect } from "next/navigation";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { refreshStatusFor } from "@/lib/refresh-limit";
import { TrackingSettings } from "@/components/tracking-settings";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readPrefs } from "@/lib/tracking-prefs";
import { normalizeUsername } from "@/lib/utils";
import { NotificationsFeed, type Notification } from "@/components/notifications-feed";
import { FOLLOWING_KIND } from "@/lib/following-tracker";
import { COMMENTS_KIND, LIKES_KIND } from "@/lib/post-activity";
import { consultsUsed, peekUsageKey } from "@/lib/usage";
import { describe } from "@/lib/pista-text";
import type { SavedStory } from "@/components/saved-stories";
import type { EventData } from "@/lib/faro-watch";

export const dynamic = "force-dynamic";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default async function TrackingPage({ params }: { params: { username: string } }) {
  const username = normalizeUsername(decodeURIComponent(params.username));
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/rastros/${encodeURIComponent(username)}`);

  const profile = await prisma.trackedProfile.findUnique({
    where: { userId_username: { userId: user.id, username } },
  });
  if (!profile) notFound();

  const status = await refreshStatusFor(profile.id);

  const PISTA_KINDS = [FOLLOWING_KIND, LIKES_KIND, COMMENTS_KIND];

  // As pistas DESTE perfil, e só dele: a visão geral fica em /pistas.
  const [changes, storyEvents, semana, noFaro, consultados] = await Promise.all([
    prisma.followerChange.findMany({
      where: { profileId: profile.id, kind: { in: PISTA_KINDS }, isVerified: false },
      orderBy: { detectedAt: "desc" },
      take: 40,
    }),
    // Stories que o Faro guardou deste perfil.
    //
    // Duas coisas escondiam o que já estava guardado:
    // 1. o teto de 24, que com vários stories por dia dava uns dois dias só;
    // 2. o filtro `baseline: false`. A primeira leitura de cada tipo é marcada
    //    como base para não virar "novidade" no feed — mas story guardado não
    //    é novidade, é acervo. Sem os da base, o primeiro dia de um perfil
    //    aparecia vazio mesmo com as miniaturas no banco.
    prisma.profileEvent.findMany({
      where: { profileId: profile.id, kind: "story" },
      orderBy: { detectedAt: "desc" },
      take: 300,
    }),
    // O movimento da semana, por tipo — o resumo do topo da tela.
    // Agrupa por kind E type: "type" sozinho é só FOLLOW/UNFOLLOW, e uma
    // curtida também é gravada como FOLLOW — contaria como novo seguido.
    prisma.followerChange.groupBy({
      by: ["kind", "type"],
      where: {
        profileId: profile.id,
        kind: { in: PISTA_KINDS },
        isVerified: false,
        detectedAt: { gte: new Date(Date.now() - WEEK) },
      },
      _count: { _all: true },
    }),
    prisma.trackedProfile.count({ where: { userId: user.id } }),
    consultsUsed(peekUsageKey(user)),
  ]);

  const somar = (fn: (r: (typeof semana)[number]) => boolean) =>
    semana.filter(fn).reduce((n, r) => n + r._count._all, 0);

  const stories: SavedStory[] = storyEvents.map((e) => {
    const d = e.data as unknown as EventData;
    return {
      id: e.id,
      takenAt: d?.takenAt ?? null,
      detectedAt: e.detectedAt.toISOString(),
      thumbnailUrl: d?.thumbnailUrl ?? null,
      mentions: d?.people ?? [],
    };
  });

  const pistas: Notification[] = changes.map((c) => ({
    id: c.id,
    subject: profile.username,
    subjectAvatarUrl: profile.avatarUrl,
    action: describe(c.kind, c.type),
    target: c.followerUsername,
    targetAvatarUrl: c.avatarUrl,
    detectedAt: c.detectedAt.toISOString(),
  }));

  return (
    <>
      <AppNav plan={user.plan} />
      <TrackingSettings
        profileId={profile.id}
        refresh={{
          usadas: status.usadas,
          limite: status.limite,
          podeAtualizar: status.podeAtualizar,
          ultima: status.ultima?.toISOString() ?? null,
          proxima: status.proxima?.toISOString() ?? null,
        }}
        username={profile.username}
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
        initial={readPrefs(profile.trackingPrefs)}
        active={profile.status === "ACTIVE"}
        pistas={pistas}
        stories={stories}
        plan={user.plan}
        desde={profile.monitoringStartedAt.toISOString()}
        ultimaMudanca={changes[0]?.detectedAt.toISOString() ?? null}
        semana={{
          follows: somar((r) => r.kind === FOLLOWING_KIND && r.type === "FOLLOW"),
          unfollows: somar((r) => r.kind === FOLLOWING_KIND && r.type === "UNFOLLOW"),
          interacoes: somar((r) => r.kind === LIKES_KIND || r.kind === COMMENTS_KIND),
        }}
        limites={{ consultados, noFaro }}
      />
      <NavSpacer />
    </>
  );
}
