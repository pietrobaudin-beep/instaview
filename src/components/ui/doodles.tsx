/**
 * The hand-drawn accents from the brand board's "ELEMENTOS" row: heart,
 * sparkle, @ speech bubble, magnifier and the curved arrow. All inherit
 * `currentColor` so they pick up whatever surface they sit on.
 */

export function Sparkle({ className = "h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="currentColor" aria-hidden>
      <path d="M24 2 C 26 16, 32 22, 46 24 C 32 26, 26 32, 24 46 C 22 32, 16 26, 2 24 C 16 22, 22 16, 24 2 Z" />
    </svg>
  );
}

export function AtBubble({ className = "h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 60" className={className} fill="none" aria-hidden>
      <path
        d="M32 4 C 47 4, 60 13, 60 25 C 60 37, 47 46, 32 46 L 22 46 L 10 56 L 13 45 C 6 41, 4 33, 4 25 C 4 13, 17 4, 32 4 Z"
        fill="currentColor"
      />
      <text
        x="32"
        y="33"
        textAnchor="middle"
        fontSize="24"
        fontWeight="700"
        fill="hsl(var(--ink))"
        fontFamily="var(--font-grotesk), sans-serif"
      >
        @
      </text>
    </svg>
  );
}

export function Magnifier({ className = "h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" className={className} fill="none" aria-hidden>
      <circle cx="21" cy="21" r="15" stroke="currentColor" strokeWidth="6" />
      <path d="M32 32 L 46 46" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export function CurvedArrow({ className = "h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 64" className={className} fill="none" aria-hidden>
      <path
        d="M4 6 C 34 2, 62 16, 70 46"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M56 40 L 71 49 L 68 32"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Yellow speech-bubble tag, as used for "curiosidade também é resposta". */
export function StickerNote({
  children,
  className = "",
  tone = "yellow",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "yellow" | "pink" | "purple";
}) {
  const tones = {
    yellow: "bg-yellow",
    pink: "bg-pink",
    purple: "bg-purple",
  } as const;
  return (
    <span
      className={`hand inline-block -rotate-3 rounded-[1.25rem] px-4 py-2 text-lg text-ink ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
