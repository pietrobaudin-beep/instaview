import Link from "next/link";
import { GuideShell } from "@/components/landing/guide-shell";
import { ATUALIZADO_EM, type LegalDoc } from "@/lib/legal";

/** Desenha os Termos e a Política com a mesma cara dos guias. */
export function LegalPage({ doc, outro }: { doc: LegalDoc; outro: { href: string; label: string } }) {
  return (
    <GuideShell>
      <article className="mx-auto max-w-2xl pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Farejo</p>
        <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
          {doc.title}
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">{doc.intro}</p>
        <p className="mt-3 text-sm text-muted-foreground">Última atualização: {ATUALIZADO_EM}.</p>

        <div className="mt-12 space-y-10">
          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-4 text-2xl font-bold tracking-tight">{s.heading}</h2>
              <div className="space-y-4 text-[17px] leading-relaxed text-foreground/85">
                {s.paragraphs?.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {s.bullets && (
                <ul className="mt-4 space-y-2 text-[17px] leading-relaxed text-foreground/85">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-3">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {s.table && (
                <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {s.table.head.map((h) => (
                          <th key={h} className="px-4 py-3 font-bold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row) => (
                        <tr key={row[0]} className="border-t border-border align-top">
                          {row.map((cell, i) => (
                            <td key={i} className="px-4 py-3 text-foreground/80">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        <aside className="mt-16 border-t border-border pt-8">
          <Link href={outro.href} className="font-semibold text-vinho underline-offset-4 hover:underline">
            {outro.label}
          </Link>
        </aside>
      </article>
    </GuideShell>
  );
}
