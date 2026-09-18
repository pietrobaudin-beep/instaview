import { cn } from "@/lib/utils";

/**
 * Fictional people for the landing page's demonstrations. They are drawn, not
 * photographed, so the page never implies it is showing real accounts — and the
 * mockups say so in a caption.
 */

type Hair = "long" | "short" | "bun" | "curly" | "buzz" | "wavy";

export interface Person {
  name: string;
  handle: string;
  bg: string;
  skin: string;
  hair: Hair;
  hairColor: string;
  shirt: string;
}

const SKIN = { light: "#F6D2B8", tan: "#E1A77F", brown: "#B87A54", deep: "#7E4E34" };
const HAIR = { black: "#1A0F14", brown: "#5B3421", blond: "#E3B35E", red: "#B4502A", pink: "#E86BAA" };

export const PEOPLE = {
  julia: { name: "Júlia Mendes", handle: "ju.mendes", bg: "#F6A8D2", skin: SKIN.light, hair: "long", hairColor: HAIR.brown, shirt: "#4A0827" },
  lucas: { name: "Lucas Andrade", handle: "lucas.andrd", bg: "#B7A6FF", skin: SKIN.tan, hair: "short", hairColor: HAIR.black, shirt: "#1A0F14" },
  bia: { name: "Bia Castro", handle: "bia.castro", bg: "#FFE257", skin: SKIN.brown, hair: "curly", hairColor: HAIR.black, shirt: "#F6A8D2" },
  rafa: { name: "Rafa Nunes", handle: "rafanunes_", bg: "#FFF0A8", skin: SKIN.light, hair: "buzz", hairColor: HAIR.blond, shirt: "#B7A6FF" },
  marina: { name: "Marina Alves", handle: "marina.a", bg: "#B7A6FF", skin: SKIN.tan, hair: "bun", hairColor: HAIR.red, shirt: "#FFE257" },
  theo: { name: "Theo Ribeiro", handle: "theo.rib", bg: "#F6A8D2", skin: SKIN.deep, hair: "short", hairColor: HAIR.black, shirt: "#4A0827" },
  duda: { name: "Duda Lima", handle: "dudalima", bg: "#FFE257", skin: SKIN.brown, hair: "wavy", hairColor: HAIR.pink, shirt: "#1A0F14" },
} satisfies Record<string, Person>;

export function FakeAvatar({
  person,
  size = 40,
  className,
}: {
  person: Person;
  size?: number;
  className?: string;
}) {
  const p = person;
  const id = `fa-${p.handle.replace(/\W/g, "")}`;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full", className)}
      aria-hidden
    >
      <defs>
        <clipPath id={id}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="64" height="64" fill={p.bg} />
        {/* hair that falls behind the shoulders */}
        {(p.hair === "long" || p.hair === "wavy") && (
          <path d="M15 30c0-11 8-18 17-18s17 7 17 18v26H15z" fill={p.hairColor} />
        )}
        {p.hair === "curly" && (
          <g fill={p.hairColor}>
            <circle cx="20" cy="26" r="8" />
            <circle cx="44" cy="26" r="8" />
            <circle cx="18" cy="36" r="7" />
            <circle cx="46" cy="36" r="7" />
          </g>
        )}
        {/* shoulders and neck */}
        <path d="M10 64c0-11 10-17 22-17s22 6 22 17z" fill={p.shirt} />
        <rect x="27" y="38" width="10" height="11" rx="4" fill={p.skin} />
        {/* head */}
        <ellipse cx="32" cy="29" rx="12" ry="13.5" fill={p.skin} />
        {/* hair on top */}
        {p.hair === "short" && <path d="M19.5 27c0-9 5.5-13.5 12.5-13.5S44.5 18 44.5 27c-3-5-8-6.5-12.5-6.5S22.5 22 19.5 27z" fill={p.hairColor} />}
        {p.hair === "buzz" && <path d="M20.5 25c1-7 5.5-10.5 11.5-10.5S42.5 18 43.5 25c-3-3.5-7-4.5-11.5-4.5S23.5 21.5 20.5 25z" fill={p.hairColor} />}
        {(p.hair === "long" || p.hair === "wavy") && (
          <path d="M19.5 30c0-10 5.5-15.5 12.5-15.5S44.5 20 44.5 30c-2-5-6-8-12.5-8.5-6 .5-10.5 3.5-12.5 8.5z" fill={p.hairColor} />
        )}
        {p.hair === "bun" && (
          <g fill={p.hairColor}>
            <circle cx="32" cy="12" r="6" />
            <path d="M19.5 28c0-9 5.5-14 12.5-14s12.5 5 12.5 14c-3-4-7.5-6-12.5-6s-9.5 2-12.5 6z" />
          </g>
        )}
        {p.hair === "curly" && (
          <g fill={p.hairColor}>
            <circle cx="24" cy="18" r="6.5" />
            <circle cx="32" cy="15" r="7" />
            <circle cx="40" cy="18" r="6.5" />
            <circle cx="21" cy="24" r="4.5" />
            <circle cx="43" cy="24" r="4.5" />
          </g>
        )}
        {/* face */}
        <circle cx="27.5" cy="30" r="1.6" fill="#1A0F14" />
        <circle cx="36.5" cy="30" r="1.6" fill="#1A0F14" />
        <circle cx="24.5" cy="34.5" r="2.2" fill="#F6A8D2" opacity="0.55" />
        <circle cx="39.5" cy="34.5" r="2.2" fill="#F6A8D2" opacity="0.55" />
        <path d="M28.5 35.5q3.5 3 7 0" stroke="#1A0F14" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Caption for every mockup that shows people. */
export function FictionalNote({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <p className={cn("text-center text-xs", dark ? "text-cream/50" : "text-muted-foreground", className)}>
      Pessoas fictícias, só para demonstração.
    </p>
  );
}
