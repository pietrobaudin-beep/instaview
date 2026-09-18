"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, PawPrint, Search, User } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/**
 * App navigation. On phones it is the bottom tab bar from the designs; from
 * `md` up the same destinations move into a top bar, which is what the layout
 * wants on a desktop screen.
 */
const TABS = [
  { href: "/", label: "Farejar", icon: Search },
  { href: "/rastros", label: "Meus rastros", icon: PawPrint },
  { href: "/pistas", label: "Pistas", icon: Bell },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNav() {
  const pathname = usePathname() || "/";

  return (
    <>
      {/* Desktop / tablet: top bar */}
      <header className="sticky top-0 z-40 hidden border-b border-border bg-background/85 backdrop-blur md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-4">
          <Link href="/" aria-label="Farejo">
            <Logo className="h-7" />
          </Link>
          <nav className="flex items-center gap-1">
            {TABS.map((t) => {
              const active = isActive(pathname, t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-pink text-ink"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Phone: bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-lg items-stretch">
          {TABS.map((t) => {
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
                      active && "bg-pink",
                    )}
                  >
                    <t.icon
                      className={cn(
                        "h-[18px] w-[18px]",
                        active ? "text-ink" : "text-muted-foreground",
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t.label}
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
