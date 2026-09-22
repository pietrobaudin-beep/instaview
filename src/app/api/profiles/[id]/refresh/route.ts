import { NextResponse } from "next/server";
import { refreshStatusFor } from "@/lib/refresh-limit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { watchProfile } from "@/lib/faro-watch";

/**
 * "Atualizar agora" — uma passagem completa do Faro, a pedido do dono.
 *
 * Antes isto chamava `collectProfile`, que busca a **lista de seguidores** —
 * dado que só o `/dashboard` legado lê. Na prática o botão gastava uma
 * requisição e **não atualizava nada do que a tela do Faro mostra**: a pessoa
 * clicava, esperava, e as pistas continuavam as mesmas.
 *
 * Agora roda a passagem completa (posts, stories, marcações e quem começou a
 * seguir), que é exatamente o que o painel exibe.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await prisma.trackedProfile.findFirst({
    where: { id: params.id, userId: user.id },
    include: { job: true },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // A manual refresh is a real provider collection. Never let repeated taps
  // bypass the per-profile schedule and burn Hiker credits. The dashboard can
  // render this exact time as "Próximo farejo" without making another call.
  // Teto de atualizações do dia: cada uma é uma coleta paga.
  const status = await refreshStatusFor(profile.id, user.plan);
  if (!status.podeAtualizar) {
    return NextResponse.json(
      {
        error: "Limite diário de atualizações atingido. Volte amanhã.",
        code: "daily_limit",
        ...status,
      },
      { status: 429 },
    );
  }

  const now = new Date();
  if (profile.job?.nextRunAt && profile.job.nextRunAt > now) {
    return NextResponse.json(
      {
        error: "Este perfil já está atualizado. O próximo farejo está agendado.",
        code: "refresh_not_due",
        nextRunAt: profile.job.nextRunAt.toISOString(),
      },
      { status: 429 },
    );
  }

  const relatorio = await watchProfile(
    { id: profile.id, username: profile.username, userId: user.id },
    "completo",
  );
  const falhou = relatorio.skipped === "error";
  const completedAt = new Date();

  // Reset the schedule after an on-demand collection too. Without this, a
  // cron job that was already due could collect the same profile immediately
  // again and pay twice for the same information.
  if (profile.job) {
    await prisma.monitoringJob.update({
      where: { profileId: profile.id },
      data: {
        lastRunAt: completedAt,
        lastRunStatus: falhou ? "failed" : "success",
        consecutiveFailures: falhou ? { increment: 1 } : 0,
        runCount: { increment: 1 },
        nextRunAt: new Date(completedAt.getTime() + profile.job.intervalMinutes * 60_000),
      },
    });
  }

  const depois = await refreshStatusFor(profile.id, user.plan);
  return NextResponse.json({ status: falhou ? "FAILED" : "SUCCESS", novidades: relatorio.news, skipped: relatorio.skipped ?? null, refresh: depois, nextRunAt: profile.job
    ? new Date(completedAt.getTime() + profile.job.intervalMinutes * 60_000).toISOString()
    : null });
}
