"use client";

import * as React from "react";
import { SearchBlock } from "@/components/search-block";
import { FaroSwap } from "@/components/ui/mascot";

/**
 * The signed-in search screen's header: Faro sits waiting, and picks up the
 * magnifier the moment you start using the field.
 */
export function SearchHero() {
  const [active, setActive] = React.useState(false);
  const onActiveChange = React.useCallback((v: boolean) => setActive(v), []);

  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            Quem vamos farejar?
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Busque um @ para explorar suas conexões públicas.
          </p>
        </div>
        <FaroSwap from="sentado" to="lupa" active={active} className="h-24 shrink-0 text-vinho sm:h-28" />
      </div>
      <div className="mt-7">
        <SearchBlock autoFocus={false} onActiveChange={onActiveChange} />
      </div>
    </div>
  );
}
