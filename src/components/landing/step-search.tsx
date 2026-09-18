"use client";

import { Search } from "lucide-react";
import { FakeAvatar, PEOPLE } from "@/components/landing/people";
import { useTypewriter } from "@/lib/use-typewriter";

/** "Como funciona", step 1 — the @ being typed, and the profile popping up once it's complete. */
export function StepSearch() {
  const j = PEOPLE.julia;
  const typed = useTypewriter([j.handle], { typeMs: 110, holdMs: 2600, eraseMs: 30 });
  const found = typed === j.handle;
  return (
    <div className="flex h-36 flex-col justify-center gap-2 rounded-2xl bg-muted/60 p-4">
      <div className="flex items-center gap-1 rounded-full border border-border bg-card py-1.5 pl-4 pr-1.5 text-sm">
        <span className="text-muted-foreground">@</span>
        <span className="font-semibold">{typed}</span>
        <span className="caret h-4 w-px bg-ink" />
        <span
          className={`ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-pink transition ${found ? "scale-110" : ""}`}
        >
          <Search className="h-4 w-4 text-ink" />
        </span>
      </div>
      <div
        className={`flex items-center gap-2 rounded-xl bg-card p-2 transition duration-300 ${found ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      >
        <FakeAvatar person={j} size={28} />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold">@{j.handle}</p>
          <p className="text-[10px] text-muted-foreground">12,4 mil seguidores</p>
        </div>
      </div>
    </div>
  );
}
