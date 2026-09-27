import { cn } from "@/lib/utils";

/**
 * "Fotos" de posts e stories para os mockups da landing — cenas desenhadas,
 * nunca fotos reais, como as pessoas de people.tsx. Preenchem o contêiner.
 */
export type Cena = "praia" | "cafe" | "montanha" | "cidade" | "show";

export function FakePhoto({ cena, className }: { cena: Cena; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      {CENAS[cena]}
    </svg>
  );
}

const CENAS: Record<Cena, React.ReactNode> = {
  praia: (
    <>
      <defs>
        <linearGradient id="fp-ceu-praia" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFB38A" />
          <stop offset="0.6" stopColor="#F6A8D2" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#fp-ceu-praia)" />
      <circle cx="62" cy="48" r="14" fill="#FFE257" />
      <rect y="58" width="100" height="18" fill="#6FA8DC" />
      <path d="M0 62 Q12 59 25 62 T50 62 T75 62 T100 62 V66 H0Z" fill="#9CC6EC" />
      <rect y="74" width="100" height="26" fill="#F3D9A4" />
      <path d="M18 74 L20 50" stroke="#4E3929" strokeWidth="2" />
      <path d="M20 50 Q10 46 6 52 M20 50 Q28 44 34 50 M20 50 Q14 40 10 42 M20 50 Q26 40 32 41" stroke="#3E7B4F" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  cafe: (
    <>
      <rect width="100" height="100" fill="#F7E6D4" />
      <rect y="66" width="100" height="34" fill="#C89B6D" />
      <ellipse cx="50" cy="68" rx="26" ry="6" fill="#FFFFFF" opacity="0.9" />
      <path d="M32 44 H68 L64 68 Q50 74 36 68 Z" fill="#FFFFFF" />
      <ellipse cx="50" cy="44" rx="18" ry="5" fill="#6B4226" />
      <path d="M44 43 Q50 40 56 43 Q50 46 44 43Z" fill="#E9C7A4" />
      <path d="M68 50 Q78 52 74 60 Q70 64 66 62" stroke="#FFFFFF" strokeWidth="4" fill="none" />
      <path d="M44 34 Q41 28 45 24 M52 34 Q49 27 53 22" stroke="#B89A83" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="84" cy="80" r="6" fill="#F6A8D2" />
    </>
  ),
  montanha: (
    <>
      <defs>
        <linearGradient id="fp-ceu-mont" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B7A6FF" />
          <stop offset="1" stopColor="#FDE3EF" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#fp-ceu-mont)" />
      <circle cx="74" cy="26" r="8" fill="#FFF6D6" />
      <path d="M-5 80 L30 34 L52 62 L68 44 L105 80 Z" fill="#6D5BA8" />
      <path d="M30 34 L38 45 L33 43 L28 47 L24 42Z" fill="#FFFFFF" />
      <path d="M-5 100 L-5 76 Q30 66 55 76 T105 72 V100Z" fill="#4A7C59" />
      <path d="M0 100 V86 Q40 78 100 88 V100Z" fill="#3A6347" />
    </>
  ),
  cidade: (
    <>
      <defs>
        <linearGradient id="fp-ceu-cid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4A0827" />
          <stop offset="1" stopColor="#D6588F" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#fp-ceu-cid)" />
      <circle cx="24" cy="24" r="6" fill="#FFE9B0" />
      {[
        [4, 52, 16, 48],
        [22, 40, 14, 60],
        [38, 58, 18, 42],
        [58, 34, 14, 66],
        [74, 50, 22, 50],
      ].map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill="#2A0616" />
          {Array.from({ length: 6 }).map((_, k) => (
            <rect key={k} x={x + 3 + (k % 2) * (w / 2 - 1)} y={y + 5 + Math.floor(k / 2) * 9} width="3" height="4" fill="#FFE257" opacity={k % 3 === 0 ? 0.35 : 0.9} />
          ))}
        </g>
      ))}
    </>
  ),
  show: (
    <>
      <rect width="100" height="100" fill="#1A0F14" />
      <path d="M20 0 L40 70 L0 70Z" fill="#F6A8D2" opacity="0.35" />
      <path d="M80 0 L100 70 L60 70Z" fill="#B7A6FF" opacity="0.35" />
      <path d="M50 0 L64 70 L36 70Z" fill="#FFE257" opacity="0.25" />
      <rect y="70" width="100" height="30" fill="#2A1A22" />
      {[10, 24, 38, 52, 66, 80, 94].map((x, i) => (
        <circle key={x} cx={x} cy={80 + (i % 2) * 3} r="6" fill="#0E080B" />
      ))}
      {[16, 44, 72].map((x) => (
        <path key={x} d={`M${x} 78 L${x - 4} 62 M${x} 78 L${x + 5} 63`} stroke="#0E080B" strokeWidth="3" strokeLinecap="round" />
      ))}
    </>
  ),
};
