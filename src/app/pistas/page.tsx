import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { NotificationsFeed, type Notification } from "@/components/notifications-feed";
import { describe } from "@/lib/pista-text";
import { Panel } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FOLLOWING_KIND } from "@/lib/following-tracker";
import { COMMENTS_KIND, LIKES_KIND } from "@/lib/post-activity";
import { BRAND } from "@/lib/voice";
import { Mascot } from "@/components/ui/mascot";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pistas · Farejo", description: "Tudo que o Faro AI encontrou nos perfis do seu Faro AI." };

/** Turn a stored change row into the sentence shown in the feed. */
export default async function NotificacoesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/pistas");

  const profiles = await prisma.trackedProfile.findMany({
    where: { userId: user.id },
    select: { id: true, username: true, avatarUrl: true },
  });
  const byId = new Map(profiles.map((p) => [p.id, p]));

  const changes = profiles.length
    ? await prisma.followerChange.findMany({
        where: {
          profileId: { in: profiles.map((p) => p.id) },
          kind: { in: [FOLLOWING_KIND, LIKES_KIND, COMMENTS_KIND] },
          isVerified: false,
        },
        orderBy: { detectedAt: "desc" },
        take: 60,
      })
    : [];

  const items: Notification[] = changes.map((c) => {
    const profile = byId.get(c.profileId);
    return {
      id: c.id,
      subject: profile?.username ?? "",
      subjectAvatarUrl: profile?.avatarUrl ?? null,
      action: describe(c.kind, c.type),
      target: c.followerUsername,
      targetAvatarUrl: c.avatarUrl,
      detectedAt: c.detectedAt.toISOString(),
    };
  });

  return (
    <>
      <AppNav plan={user.plan} />
      <main className="mx-auto max-w-3xl px-6 py-8 md:pl-[15.5rem]">
        <h1 className="text-3xl font-bold tracking-tight">Pistas</h1>
        <p className="mb-6 mt-1 text-muted-foreground">{BRAND.phrases.despercebido}</p>

        {profiles.length === 0 ? (
          <Panel>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Mascot pose="feliz" className="h-24 text-vinho" bob />
              <p className="text-lg font-bold">Nada passou pelo Faro AI ainda</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Fareje um @ e toque em <b>Colocar no Faro AI</b>. Cada pista que o Faro AI encontrar
                aparece aqui.
              </p>
              <Link href="/" className="mt-2">
                <Button variant="accent">Farejar um perfil</Button>
              </Link>
            </div>
          </Panel>
        ) : (
          <NotificationsFeed items={items} perfis={profiles.map((p) => ({ username: p.username, avatarUrl: p.avatarUrl }))} />
        )}
      </main>
      <NavSpacer />
    </>
  );
}
