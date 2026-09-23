import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { SiteFooter } from "@/components/landing/site-footer";

/** Header, closing call and footer shared by the guide pages. */
export function GuideShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" aria-label="Farejo">
          <Logo className="h-7" />
        </Link>
        <Link
          href="/#buscar"
          className="inline-flex items-center gap-2 rounded-full bg-vinho px-4 py-2 text-sm font-semibold text-cream transition hover:opacity-90"
        >
          Farejar um @ <ArrowRight className="h-4 w-4" />
        </Link>
      </header>
      <main className="px-6 pb-24">{children}</main>
      <section className="px-6 pb-24">
        <div className="brand-panel mx-auto flex max-w-3xl flex-col items-center rounded-3xl px-6 py-12 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Pronto para farejar?</h2>
          <p className="mt-3 max-w-md opacity-75">Digite um @ e veja as pistas em segundos. Sem senha.</p>
          <Link
            href="/#buscar"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-bold text-cream transition hover:opacity-90"
          >
            Buscar perfil <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
