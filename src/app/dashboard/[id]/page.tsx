import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Ver `../page.tsx`: leva ao mesmo perfil, na tela nova. */
export default async function PerfilNoDashboardAntigo({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.trackedProfile.findFirst({
    where: { id: params.id, userId: user.id },
    select: { username: true },
  });
  if (!profile) notFound();

  redirect(`/rastros/${encodeURIComponent(profile.username)}`);
}
