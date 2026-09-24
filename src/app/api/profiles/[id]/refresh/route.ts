import { NextResponse } from "next/server";
import { refreshStatusFor } from "@/lib/refresh-limit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { coletarSeDevido } from "@/lib/faro-watch";

/**
 * "Atualizar agora" — antecipa uma coleta, a pedido do dono.
 *
 * Passa pela mesma porta do cron (`coletarSeDevido`): plano, intervalo mínimo
 * e franquia de coletas. Antecipar não soma coleta — sai da franquia do
 * ciclo. No Faro de Cão não existe: a cadência de três dias é o que o plano
 * vende.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await prisma.trackedProfile.findFirst({
    where: { id: params.id, userId: user.id },
    include: { job: true },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const c = await coletarSeDevido(profile.id, { manual: true });
  const depois = await refreshStatusFor(profile.id, user);

  if (!c.ok) {
    const recado: Record<string, string> = {
      manual_nao: "Seu plano coleta sozinho, a cada três dias. O próximo farejo já está agendado.",
      cedo: "A última coleta foi há pouco. O botão volta a valer 24 horas depois dela.",
      franquia: "As coletas deste ciclo acabaram. Elas renovam no próximo ciclo.",
      sem_plano: "Seu plano atual não acompanha perfis.",
      privado: "O perfil está privado agora. Nada foi descontado.",
      erro: "Não deu para ler o perfil agora. Nada foi descontado; tente mais tarde.",
    };
    return NextResponse.json(
      { error: recado[c.pulo ?? "erro"], code: c.pulo, refresh: depois, nextRunAt: c.proxima.toISOString() },
      { status: c.pulo === "privado" || c.pulo === "erro" ? 502 : 429 },
    );
  }

  if (profile.job) {
    await prisma.monitoringJob.update({
      where: { profileId: profile.id },
      data: { lastRunAt: new Date(), lastRunStatus: "success", consecutiveFailures: 0, runCount: { increment: 1 }, nextRunAt: c.proxima },
    });
  }
  return NextResponse.json({ status: "SUCCESS", novidades: c.news ?? 0, skipped: null, refresh: depois, nextRunAt: c.proxima.toISOString() });
}
