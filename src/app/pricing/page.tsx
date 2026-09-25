import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { FecharVoltar } from "@/components/fechar-voltar";
import { PlanosCards } from "@/components/planos-cards";
import { getCurrentUser } from "@/lib/auth";
import { direitosDe } from "@/lib/direitos";
import { safeNext } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Planos · Farejo", description: "Os planos do Farejo." };

/**
 * Os planos. A página antiga (listas longas, cartão do Curioso) não existe
 * mais: quem não tem conta vai para os planos da página inicial; quem tem
 * conta (e não vê a landing) recebe os mesmos três cartões, compra direta.
 */
export default async function PricingPage({ searchParams }: { searchParams: { next?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/#planos");

  const next = safeNext(searchParams.next);
  const fromProfile = next?.match(/^\/p\/([a-z0-9._]{1,30})$/i)?.[1] ?? null;
  const d = direitosDe(user);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" aria-label="Farejo">
          <Logo className="h-7" />
        </Link>
        <FecharVoltar />
      </div>
      <h1 className="text-center text-3xl font-extrabold tracking-tight">Escolha como farejar.</h1>
      <PlanosCards
        className="mt-10"
        perfil={fromProfile}
        atual={d.admin ? null : d.plano}
        next={next}
      />
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Todas as funcionalidades valem dentro das franquias de cada plano. Classificações são
        estimativas a partir de sinais públicos, não prova de relação ou identidade.
      </p>
    </main>
  );
}
