import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { GUIDES } from "@/lib/guides";
import { BRAND } from "@/lib/voice";

/** Links to pages that really exist — nothing here points to a placeholder. */
const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Produto",
    links: [
      { href: "/#buscar", label: "Farejar um @" },
      { href: "/#produto", label: "O que é o Farejo" },
      { href: "/#pro", label: "Faro AI" },
      { href: "/#planos", label: "Planos" },
      { href: "/#perguntas", label: "Perguntas frequentes" },
    ],
  },
  {
    title: "Guias",
    links: [...GUIDES.map((g) => ({ href: `/guias/${g.slug}`, label: g.title })), { href: "/guias", label: "Todos os guias" }],
  },
  {
    title: "Conta",
    links: [
      { href: "/login", label: "Entrar" },
      { href: "/signup", label: "Criar conta" },
      { href: "/pricing", label: "Planos" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/termos", label: "Termos de Uso" },
      { href: "/privacidade", label: "Política de Privacidade" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer id="rodape" className="bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-2 md:grid-cols-[1.2fr_repeat(4,1fr)]">
        <div>
          <Logo className="h-7 text-pink" />
          <p className="mt-4 max-w-xs text-sm text-cream/60">
            O Farejo organiza informações públicas de perfis do Instagram. Não pedimos senha e não acessamos
            contas.
          </p>
          <p className="mt-6 text-sm font-semibold text-cream/80">{BRAND.signature}</p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cream/40">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-cream/75 transition hover:text-pink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-cream/10">
        <p className="mx-auto max-w-6xl px-6 py-6 text-xs text-cream/40">
          © {new Date().getFullYear()} Farejo. O Farejo não tem vínculo com o Instagram nem com a Meta.
        </p>
      </div>
    </footer>
  );
}
