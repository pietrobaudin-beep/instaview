"use client";

import { Check, Lock, Search } from "lucide-react";
import { FakeAvatar, PEOPLE } from "@/components/landing/people";
import { useTypewriter } from "@/lib/use-typewriter";
import { cn } from "@/lib/utils";

/**
 * "Como funciona", passo 1 — a busca como ela é: as sugestões aparecem enquanto
 * se digita, o botão fica travado até marcar o perfil, e aí vira **Farejar**.
 */
export function StepSearch() {
  const j = PEOPLE.julia;
  const typed = useTypewriter([j.handle], { typeMs: 120, holdMs: 3000, eraseMs: 30 });
  const sugere = typed.length >= 3;
  const marcado = typed === j.handle;
  const outros = [PEOPLE.julia, PEOPLE.duda];
  return (
    <div className="flex h-36 flex-col justify-center gap-1.5 rounded-2xl bg-muted/60 p-3">
      <div className="flex items-center gap-1 rounded-full border border-border bg-card py-1 pl-3.5 pr-1 text-sm">
        <span className="text-muted-foreground">@</span>
        <span className="truncate font-semibold">{typed}</span>
        <span className="caret h-4 w-px shrink-0 bg-ink" />
        <span
          className={cn(
            "ml-auto flex h-7 shrink-0 items-center gap-1 rounded-full px-3 text-[11px] font-bold transition duration-300",
            marcado ? "scale-105 bg-vinho text-cream" : "bg-muted text-muted-foreground",
          )}
        >
          {marcado ? <Search className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          Farejar
        </span>
      </div>
      {outros.map((p, i) => {
        const este = i === 0;
        return (
          <div
            key={p.handle + i}
            className={cn(
              "flex items-center gap-2 rounded-xl bg-card px-2 py-1 transition duration-300",
              sugere ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
              marcado && este && "ring-2 ring-pink",
            )}
            style={{ transitionDelay: sugere ? `${i * 90}ms` : "0ms" }}
          >
            <FakeAvatar person={i === 0 ? p : PEOPLE.bia} size={22} />
            <p className="min-w-0 flex-1 truncate text-[11px] font-bold">
              @{i === 0 ? j.handle : `${j.handle.slice(0, 3)}.moda`}
            </p>
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition",
                marcado && este ? "border-vinho bg-vinho" : "border-border",
              )}
            >
              {marcado && este && <Check className="h-2.5 w-2.5 text-cream" strokeWidth={3} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}
