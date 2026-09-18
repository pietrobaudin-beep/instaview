import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GuideShell } from "@/components/landing/guide-shell";
import { GUIDES, getGuide } from "@/lib/guides";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const g = getGuide(params.slug);
  return g ? { title: `${g.title} · Farejo`, description: g.description } : {};
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const g = getGuide(params.slug);
  if (!g) notFound();
  const others = GUIDES.filter((o) => o.slug !== g.slug);

  return (
    <GuideShell>
      <article className="mx-auto max-w-2xl pt-6">
        <Link
          href="/guias"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Guias
        </Link>
        <div className="mt-8 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span className="rounded-full bg-pink/50 px-2.5 py-1 font-bold uppercase tracking-wider text-vinho">
            {g.tag}
          </span>
          {g.minutes} min de leitura
        </div>
        <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
          {g.title}
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">{g.description}</p>

        <div className="mt-10 space-y-10">
          {g.sections.map((s, i) => (
            <section key={i}>
              {s.heading && <h2 className="mb-4 text-2xl font-bold tracking-tight">{s.heading}</h2>}
              <div className="space-y-4 text-[17px] leading-relaxed text-foreground/85">
                {s.paragraphs.map((p, k) => (
                  <p key={k}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="mt-16 border-t border-border pt-8">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Leia também</p>
          <ul className="mt-4 space-y-3">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/guias/${o.slug}`} className="font-semibold text-vinho underline-offset-4 hover:underline">
                  {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </article>
    </GuideShell>
  );
}
