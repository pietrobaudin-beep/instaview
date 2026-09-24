import { redirect } from "next/navigation";
import Link from "next/link";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { ChatDoFaro } from "@/components/chat-do-faro";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { direitosDe } from "@/lib/direitos";
import { Panel } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/ui/mascot";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chat · Faro AI · Farejo",
  description: "Pergunte ao Faro AI sobre os perfis que ele acompanha.",
};

/**
 * O chat do Faro AI, com todos os perfis acompanhados num lugar só.
 *
 * A mesma caixa existe dentro de cada perfil, mas ali ela já sabe de quem se
 * fala. Aqui a pessoa escolhe — é a porta para quem chega com a pergunta na
 * cabeça e não com o perfil.
 */
export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/rastros/chat");

  const d = direitosDe(user);
  const semChat = !d.admin && d.config.perguntas <= 0;
  const perfis = await prisma.trackedProfile.findMany({
    where: { userId: user.id, status: { not: "ERROR" } },
    orderBy: { updatedAt: "desc" },
    select: { username: true, displayName: true, avatarUrl: true },
  });

  return (
    <>
      <AppNav plan={d.admin ? "ADMIN" : d.plano} />
      <main className="mx-auto max-w-3xl px-5 py-8 md:pl-[15.5rem]">
        <h1 className="text-3xl font-extrabold tracking-tight">Chat do Faro AI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pergunte sobre quem o Faro AI acompanha. Ele responde do que guardou — e diz quando
          não sabe.
        </p>

        {semChat ? (
          <Panel className="mt-6">
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Mascot pose="duvida" className="h-20 text-vinho" bob />
              <h2 className="text-xl font-bold">O chat é do Faro de Cão e do Faro de Detetive.</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Ele responde sobre os perfis que o Faro AI acompanha todo dia — e para isso é
                preciso ter perfis no Faro AI.
              </p>
              <Link href="/pricing" className="mt-1">
                <Button variant="accent">Conhecer os planos</Button>
              </Link>
            </div>
          </Panel>
        ) : perfis.length === 0 ? (
          <Panel className="mt-6">
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Mascot pose="dormindo" className="h-20 text-vinho" bob />
              <h2 className="text-xl font-bold">Nenhum perfil no Faro AI ainda.</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                O chat responde do que o Faro AI observou ao longo do tempo. Coloque alguém no
                Faro AI e volte aqui.
              </p>
              <Link href="/" className="mt-1">
                <Button variant="accent">Farejar um @</Button>
              </Link>
            </div>
          </Panel>
        ) : (
          <ChatDoFaro perfis={perfis} />
        )}
      </main>
      <NavSpacer />
    </>
  );
}
