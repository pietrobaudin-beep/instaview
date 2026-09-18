"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { pushRecentSearch } from "@/lib/recent-searches";
import { useTypewriter } from "@/lib/use-typewriter";
import { cn, isValidUsername, normalizeUsername } from "@/lib/utils";

const WHO = ["seu crush", "aquela pessoa", "um amigo", "seu ex", "seu best", "o contatinho"];

/**
 * A small search pill that follows the visitor down the landing page, so a
 * search is always one tap away. It shows up once the hero's own search has
 * scrolled out of view and steps aside when the final call (which has its own
 * search) or the footer comes in. The placeholder types out who you might be
 * curious about.
 */
export function FloatingSearch({ hideWhenVisible }: { hideWhenVisible: string[] }) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [shown, setShown] = React.useState(false);
  const [error, setError] = React.useState(false);

  // Shown past the hero; out of the way wherever another search (or the
  // footer) is on screen.
  React.useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > window.innerHeight * 0.8;
      const blocked = hideWhenVisible.some((id) => {
        const r = document.getElementById(id)?.getBoundingClientRect();
        return !!r && r.top < window.innerHeight && r.bottom > 0;
      });
      setShown(past && !blocked);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [hideWhenVisible]);

  // Types who you might be curious about, like a real search being written.
  const typed = useTypewriter(WHO, { active: shown && !value });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const username = normalizeUsername(value);
    if (!isValidUsername(username)) {
      setError(true);
      return;
    }
    pushRecentSearch({ username, displayName: null, avatarUrl: null });
    router.push(`/p/${encodeURIComponent(username)}`);
  }

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition duration-300 [padding-bottom:env(safe-area-inset-bottom)]",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
      )}
      aria-hidden={!shown}
    >
      <form
        onSubmit={onSubmit}
        className={cn(
          "flex w-full max-w-md items-center gap-2 rounded-full border bg-card/95 py-1.5 pl-5 pr-1.5 shadow-[0_18px_50px_-18px_hsl(var(--vinho)/0.55)] backdrop-blur",
          error ? "border-destructive" : "border-border",
        )}
      >
        <span className="text-muted-foreground">@</span>
        <div className="relative min-w-0 flex-1">
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            tabIndex={shown ? 0 : -1}
            aria-label="@username do Instagram"
            className="h-10 w-full bg-transparent text-[15px] outline-none"
          />
          {!value && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-px text-[15px] text-muted-foreground">
              {typed}
              <span className="caret h-4 w-px bg-muted-foreground" />
            </span>
          )}
        </div>
        <button
          type="submit"
          tabIndex={shown ? 0 : -1}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-pink px-4 text-sm font-bold text-ink transition hover:opacity-90"
        >
          <Search className="h-4 w-4" />
          Farejar
        </button>
      </form>
    </div>
  );
}
