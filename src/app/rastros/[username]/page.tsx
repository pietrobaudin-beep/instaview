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
import { peekUsageKey } from "@/lib/usage";
import { resumoDaFranquia } from "@/lib/franquia";
import { direitosDe } from "@/lib/direitos";
import { cotaDoMes, lerSalvos } from "@/lib/stories-salvos";
import { describe } from "@/lib/pista-text";
import { oQueMudou, visitar, type Novidade } from "@/lib/ultima-visita";
import type { SavedStory } from "@/components/saved-stories";
import { visivel } from "@/lib/acervo";
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

  const status = await refreshStatusFor(profile.id, user);
  const d = direitosDe(user);

  const PISTA_KINDS = [FOLLOWING_KIND, LIKES_KIND, COMMENTS_KIND];

  /*
   * "O que mudou desde a SUA última visita."
   *
   * O painel já sabia dizer o que mudou desde a última leitura do Faro AI —
   * mas esse é o relógio do robô. Quem passou uma semana fora quer a semana,
   * não as últimas 24 horas.
   *
   * A visita é marcada aqui mesmo, na abertura da página.
   */
  const visitaAnterior = await visitar(peekUsageKey(user), profile.username);
  const novidades: Novidade[] = visitaAnterior
    ? await oQueMudou(profile.id, visitaAnterior, PISTA_KINDS)
    : [];

  // As pistas DESTE perfil, e só dele: a visão geral fica em /pistas.
  const [changes, storyEvents, semana, noFaro, resumoPlano, storiesSalvos, cotaSalvos] =
    await Promise.all([
    prisma.followerChange.findMany({
      where: { profileId: profile.id, kind: { in: PISTA_KINDS }, isVerified: false },
      orderBy: { detectedAt: "desc" },
      take: 40,
    }),
    // Stories que o Faro AI guardou deste perfil.
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
    resumoDaFranquia(user),
    lerSalvos(profile.id),
    cotaDoMes(user),
  ]);

  const somar = (fn: (r: (typeof semana)[number]) => boolean) =>
    semana.filter(fn).reduce((n, r) => n + r._count._all, 0);

  // A janela do plano, decidida aqui no servidor: o que passou do prazo não
  // chega à tela (e a limpeza diária apaga).
  const favoritos = new Set(storiesSalvos);
  const stories: SavedStory[] = storyEvents.filter((e) => visivel(user, e, favoritos)).map((e) => {
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
      <AppNav plan={d.admin ? "ADMIN" : d.plano} />
      <TrackingSettings
        profileId={profile.id}
        refresh={{
          usadas: status.usadas,
          limite: Number.isFinite(status.limite) ? status.limite : null,
          podeAtualizar: status.podeAtualizar,
          ultima: status.ultima?.toISOString() ?? null,
          proxima: status.proxima?.toISOString() ?? null,
          antecipa: status.antecipa,
          liberaEm: status.liberaEm?.toISOString() ?? null,
          cadenciaHoras: status.cadenciaHoras,
        }}
        username={profile.username}
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
        initial={readPrefs(profile.trackingPrefs)}
        active={profile.status === "ACTIVE"}
        pistas={pistas}
        stories={stories}
        plan={d.plano}
        desde={profile.monitoringStartedAt.toISOString()}
        ultimaMudanca={changes[0]?.detectedAt.toISOString() ?? null}
        semana={{
          follows: somar((r) => r.kind === FOLLOWING_KIND && r.type === "FOLLOW"),
          unfollows: somar((r) => r.kind === FOLLOWING_KIND && r.type === "UNFOLLOW"),
          interacoes: somar((r) => r.kind === LIKES_KIND || r.kind === COMMENTS_KIND),
        }}
        limites={resumoPlano}
        desdeAVisita={
          visitaAnterior && novidades.length
            ? { desde: visitaAnterior.toISOString(), novidades }
            : null
        }
        storiesSalvos={storiesSalvos}
        cotaSalvos={{
          ...cotaSalvos,
          limite: Number.isFinite(cotaSalvos.limite) ? cotaSalvos.limite : 9999,
          restam: Number.isFinite(cotaSalvos.restam) ? cotaSalvos.restam : 9999,
          limiteMb: Number.isFinite(cotaSalvos.limiteMb) ? cotaSalvos.limiteMb : undefined,
        }}
        ferramentas={{
          perguntas: d.admin || d.config.perguntas > 0,
          resumos: d.admin || d.config.resumos > 0,
          buscaStories: d.admin || d.config.buscaStories,
          alerta: d.admin || d.config.alertasEscritos > 0,
          storiesHours: Number.isFinite(d.config.storiesHours) ? d.config.storiesHours : null,
        }}
      />
      <NavSpacer />
    </>
  );
}
