import { GuideCards } from "@/components/landing/guide-cards";
import { GuideShell } from "@/components/landing/guide-shell";
import { Handnote } from "@/components/ui/handnote";
import { Reveal } from "@/components/ui/reveal";

export const metadata = {
  title: "Guias · Farejo",
  description: "Entenda como os follows do Instagram funcionam e o que o Farejo pode mostrar.",
};

export default function GuidesPage() {
  return (
    <GuideShell>
      <div className="mx-auto max-w-6xl pt-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Guias</p>
        <h1 className="mt-4 max-w-2xl text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Entenda os rastros.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Como os follows funcionam no Instagram, o que dá para ver e o que não dá.
        </p>
        <Reveal delay={200}>
          <Handnote underline className="mt-6">
            descubra o que mudou.
          </Handnote>
        </Reveal>
        <Reveal delay={300} className="mt-12">
          <GuideCards />
        </Reveal>
      </div>
    </GuideShell>
  );
}
