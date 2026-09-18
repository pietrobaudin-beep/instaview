import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GUIDES } from "@/lib/guides";

/** The guides as cards — on the landing page and on /guias. */
export function GuideCards() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {GUIDES.map((g) => (
        <Link
          key={g.slug}
          href={`/guias/${g.slug}`}
          className="group flex flex-col rounded-3xl border border-border bg-card p-7 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_20px_50px_-30px_hsl(var(--vinho)/0.45)]"
        >
          <span className="w-fit rounded-full bg-pink/50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-vinho">
            {g.tag}
          </span>
          <h3 className="mt-5 text-xl font-bold leading-snug">{g.title}</h3>
          <p className="mt-3 flex-1 text-sm text-muted-foreground">{g.description}</p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-vinho">
            Ler em {g.minutes} min
            <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}
