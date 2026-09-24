"use client";
import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronUp, History, PawPrint, Search, Sparkles, User } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import type { Plan } from "@prisma/client";
import { cn } from "@/lib/utils";

/**
 * App navigation.
 *
 * Two groups, not one row of four: on the left the places you go to *work*
 * (farejar, os perfis no Faro AI, as pistas); on the right the account. Separating
 * them means "Perfil" stops competing with the daily destinations, and the bar
 * reads left to right like the app is used.
 *
 * On phones the same destinations become the bottom tab bar from the designs.
 */
const TABS = [
  { href: "/", label: "Farejar", icon: Search },
  // O Faro AI é onde ficam os perfis acompanhados — por isso leva a cara do cão.
  { href: "/rastros", label: "Faro AI", icon: FaroIcon },
  { href: "/pesquisados", label: "Pesquisados", icon: History },
  { href: "/pistas", label: "Pistas", icon: Bell },
] as const;

/**
 * O que abre por dentro do Faro AI, quando ele está aberto.
 *
 * Não são seções novas na barra: são o miolo do Faro AI, e só aparecem quando
 * a pessoa já está lá dentro. Uma barra com sete itens fixos vira um menu de
 * restaurante — estes dois só existem quando fazem sentido.
 */
const DENTRO_DO_FARO = [
  { href: "/rastros", label: "Rastros", icon: PawPrint, exato: true },
  { href: "/rastros/chat", label: "Chat", icon: Sparkles, exato: false },
] as const;

/**
 * O ícone do Faro AI: o quadradinho rosa com a carinha, como no app.
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
      className={cn("shrink-0 rounded-xl", className)}
    />
  );
}

/**
 * O destino pessoal chama-se **Conta**, com plano nenhum no nome.
 *
 * Antes o rótulo virava "farejo pro" ou "curioso" conforme o plano: o lugar
 * mudava de nome sozinho, e quem procurava a conta não achava. O plano
 * aparece ao lado, como selo.
 */
const ACCOUNT = { href: "/perfil", label: "Conta", icon: User } as const;

/** O nome curto do plano, como a pessoa o conhece. */
const PLAN_LABEL: Record<Plan, string> = {
  FREE: "CURIOSO",
  WEEK: "FARO DE CÃO",
  PRO: "FAREJO PRO",
  AGENCY: "DETETIVE",
};
/**
 * A ordem da barra de baixo, no celular — diferente da lateral de propósito.
 *
 * No computador a barra se lê de cima para baixo e o Faro AI fica em segundo,
 * logo depois de farejar. No celular o dedo mora no meio da tela: o item
 * central é o mais fácil de alcançar, e é onde o Faro AI deve estar.
 */
const ALL = [
  TABS[0], // Farejar
  TABS[2], // Pesquisados
  TABS[1], // Faro AI — no centro
  TABS[3], // Pistas
  ACCOUNT,
];

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
              <React.Fragment key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3.5 py-4 text-sm transition",
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
                {/* A setinha só no item que tem miolo, e só quando ele está
                    aberto: apontar para cima em algo fechado seria mentira. */}
                {t.href === "/rastros" && active && (
                  <ChevronUp className="ml-auto h-4 w-4 opacity-60" />
                )}
              </Link>

              {/* O miolo do Faro AI, recuado logo abaixo DELE — e não no fim
                  da barra. A linha à esquerda é o que diz "isto é por dentro
                  daquilo" sem precisar de texto. */}
              {t.href === "/rastros" && active && (
                <div className="my-1 ml-6 flex flex-col gap-1 border-l border-plum/15 pl-3">
                  {DENTRO_DO_FARO.map((sub) => {
                    const aqui = sub.exato
                      ? pathname === sub.href || /^\/rastros\/[^/]+$/.test(pathname)
                      : pathname.startsWith(sub.href);
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        aria-current={aqui ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-[13px] transition",
                          aqui
                            ? "bg-plum/10 font-bold text-plum"
                            : "font-medium text-plum/50 hover:bg-plum/5 hover:text-plum",
                        )}
                      >
                        <sub.icon className="h-4 w-4 opacity-80" />
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
              </React.Fragment>
            );
          })}

        </nav>

        {/* A conta fica no pé da barra, como em todo app. */}
        <div className="mt-6 border-t border-plum/10 pt-4">
          <Link
            href={ACCOUNT.href}
            aria-current={isActive(pathname, ACCOUNT.href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-4 text-sm transition",
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

      {/* Phone: bottom tab bar.
          As duas faixas moram no mesmo container fixo: assim a altura total é
          a soma real das duas, e o espaçador de baixo não depende de número
          mágico nenhum. */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur md:hidden">
        {/* O miolo do Faro AI, no celular, logo acima da barra — o mesmo lugar
            onde a pessoa já está com o dedo. Na lateral do computador ele é
            recuado sob o item; aqui não há recuo possível, e empilhar itens na
            barra de baixo a deixaria ilegível. */}
        {isActive(pathname, "/rastros") && (
          <nav aria-label="Dentro do Faro AI" className="border-t border-plum/10 px-4 py-2">
            <div className="mx-auto flex max-w-lg gap-2">
              {DENTRO_DO_FARO.map((sub) => {
                const aqui = sub.exato
                  ? pathname === sub.href || /^\/rastros\/[^/]+$/.test(pathname)
                  : pathname.startsWith(sub.href);
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    aria-current={aqui ? "page" : undefined}
                    className={cn(
                      "flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-2xl text-[13px] transition",
                      aqui ? "bg-plum font-bold text-white" : "bg-plum/5 font-medium text-plum/60",
                    )}
                  >
                    <sub.icon className="h-4 w-4 opacity-80" />
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

      <nav className="border-t border-plum/10">
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
                      "flex h-10 w-14 items-center justify-center rounded-2xl transition",
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
                    {t.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      </div>
    </>
  );
}

/** Bottom padding so the fixed phone tab bar never covers page content. */
/**
 * O respiro no fim da página, do tamanho da barra de baixo.
 *
 * Dentro do Faro AI há duas faixas empilhadas, então o respiro cresce junto —
 * senão a última linha da página fica escondida atrás delas.
 */
export function NavSpacer() {
  const pathname = usePathname() || "/";
  const dentroDoFaro = isActive(pathname, "/rastros");
  return <div className={dentroDoFaro ? "h-36 md:h-0" : "h-20 md:h-0"} aria-hidden />;
}
