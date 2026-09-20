"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, History, Search, User } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import type { Plan } from "@prisma/client";
import { cn } from "@/lib/utils";

/**
 * App navigation.
 *
 * Two groups, not one row of four: on the left the places you go to *work*
 * (farejar, os perfis no Faro, as pistas); on the right the account. Separating
 * them means "Perfil" stops competing with the daily destinations, and the bar
 * reads left to right like the app is used.
 *
 * On phones the same destinations become the bottom tab bar from the designs.
 */
const TABS = [
  { href: "/", label: "Farejar", icon: Search },
  // O Faro é onde ficam os perfis acompanhados — por isso leva a cara do cão.
  { href: "/rastros", label: "Faro", icon: FaroIcon },
  { href: "/pesquisados", label: "Pesquisados", icon: History },
  { href: "/pistas", label: "Pistas", icon: Bell },
] as const;

/**
 * O ícone do Faro: o quadradinho rosa com a carinha, como no app.
 *
 * É colorido, então entra como imagem — máscara CSS só serve para desenho de
 * uma cor. O arquivo vem de public/mascote, nunca redesenhado em código.
 */
function FaroIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mascote/faro-app.svg"
      alt=""
      aria-hidden
      className={cn("shrink-0 rounded-[6px]", className)}
    />
  );
}

const ACCOUNT = { href: "/perfil", label: "Perfil", icon: User } as const;

/** O nome curto do plano, como a pessoa o conhece. */
const PLAN_LABEL: Record<Plan, string> = {
  FREE: "CURIOSO",
  WEEK: "FARO DE CÃO",
  PRO: "FAREJO PRO",
  AGENCY: "DETETIVE",
};
const ALL = [...TABS, ACCOUNT];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNav({ plan }: { plan?: Plan }) {
  const pathname = usePathname() || "/";

  return (
    <>
      {/* Desktop: barra lateral fixa — é o que faz o Farejo parecer um app,
          e não uma landing com menu. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-plum/10 bg-white/70 px-4 py-6 backdrop-blur md:flex">
        <Link href="/" aria-label="Farejo" className="mb-8 px-2 transition hover:opacity-80">
          <Logo className="h-6" />
        </Link>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Seções">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-plum font-semibold text-white"
                    : "font-medium text-plum/60 hover:bg-plum/5 hover:text-plum",
                )}
              >
                <t.icon
                  className={cn(
                    "h-[18px] w-[18px]",
                    t.href === "/rastros"
                      ? active
                        ? ""
                        : "opacity-80"
                      : active
                        ? "text-blush"
                        : "opacity-70",
                  )}
                />
                {t.label}
              </Link>
            );
          })}
        </nav>

        {/* A conta fica no pé da barra, como em todo app. */}
        <div className="mt-6 border-t border-plum/10 pt-4">
          <Link
            href={ACCOUNT.href}
            aria-current={isActive(pathname, ACCOUNT.href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
              isActive(pathname, ACCOUNT.href)
                ? "bg-plum font-semibold text-white"
                : "font-medium text-plum/60 hover:bg-plum/5 hover:text-plum",
            )}
          >
            <ACCOUNT.icon className="h-[18px] w-[18px] opacity-70" />
            {ACCOUNT.label}
            {/* O plano fica sempre à vista — inclusive o grátis. */}
            {plan && (
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] ${
                  plan === "FREE"
                    ? "border border-plum/15 text-plum/55"
                    : "bg-plum text-white"
                }`}
              >
                {PLAN_LABEL[plan]}
              </span>
            )}
          </Link>
        </div>
      </aside>

      {/* Phone: bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-plum/10 bg-white/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-lg items-stretch">
          {ALL.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <li key={t.href} className="flex-1">
                <Link
                  href={t.href}
                  className="flex flex-col items-center gap-1 py-2.5"
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "flex h-8 w-12 items-center justify-center rounded-full transition",
                      active && "bg-blush",
                    )}
                  >
                    <t.icon
                      className={cn(
                        "h-[18px] w-[18px]",
                        t.href === "/rastros"
                          ? active
                            ? ""
                            : "opacity-80"
                          : active
                            ? "text-magenta"
                            : "text-plum/45",
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-[10px]",
                      active ? "font-semibold text-plum" : "font-medium text-plum/45",
                    )}
                  >
                    {t.href === ACCOUNT.href && plan ? PLAN_LABEL[plan].toLowerCase() : t.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/** Bottom padding so the fixed phone tab bar never covers page content. */
export function NavSpacer() {
  return <div className="h-20 md:h-0" aria-hidden />;
}
