import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Crown, Instagram, ShieldCheck } from "lucide-react";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { NoteBox, Panel, StatBox, StatusPill } from "@/components/ui/brand";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Perfil · Farejo", description: "Sua conta, seu plano e suas análises no Farejo." };

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/perfil");

  const plan = PLANS[user.plan];
  const isPaid = user.plan !== "FREE";

  const [tracked, detected] = await Promise.all([
    prisma.trackedProfile.count({ where: { userId: user.id } }),
    prisma.followerChange.count({
      where: { profile: { userId: user.id }, isVerified: false },
    }),
  ]);

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Perfil</h1>

        <Panel>
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-pink text-xl font-extrabold text-ink">
              {initials(user.name || user.email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{user.name || "Sua conta"}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
            <StatusPill tone={isPaid ? "yellow" : "pink"}>
              {isPaid && <Crown className="h-3 w-3" />}
              {plan.name}
            </StatusPill>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatBox value={tracked} label="perfis no Faro" />
            <StatBox value={detected} label="pistas encontradas" />
          </div>
        </Panel>

        {!isPaid && (
          <div className="mt-5">
            <Panel title="Farejo PRO">
              <p className="text-sm text-muted-foreground">
                Seu faro, ligado 24h. Coloque perfis no Faro e receba alertas quando algo mudar.
              </p>
              <Link href="/pricing" className="mt-4 block">
                <Button variant="accent" className="w-full sm:w-auto">
                  Conhecer o Farejo PRO <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </Panel>
          </div>
        )}

        <div className="mt-5">
          <Panel title="Sua conta do Instagram">
            <p className="text-sm text-muted-foreground">
              Conecte sua própria conta para analisar seus seguidores e ver quem deixou de te
              seguir.
            </p>
            <Link href="/connect" className="mt-4 block">
              <Button variant="outline" className="w-full sm:w-auto">
                <Instagram className="h-4 w-4" /> Conectar Instagram
              </Button>
            </Link>
            <NoteBox className="mt-4" icon={<ShieldCheck className="h-4 w-4" />}>
              O Farejo nunca pede sua senha do Instagram e analisa apenas dados públicos.
            </NoteBox>
          </Panel>
        </div>

        <div className="mt-5">
          <Panel title="Sessão">
            <LogoutButton />
          </Panel>
        </div>
      </main>
      <NavSpacer />
    </>
  );
}
