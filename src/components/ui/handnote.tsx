import { cn } from "@/lib/utils";

/**
 * A handwritten brand annotation (Caveat), like the ones on the loading screen:
 * "toda curiosidade deixa um rastro", "algumas respostas precisam ser farejadas ♥".
 *
 * Slightly tilted, in the brand's ink. Inside a <Reveal>, the underline draws
 * itself in and the heart pops when the block scrolls into view.
 */
export function Handnote({
  children,
  className,
  underline = false,
  heart = false,
  tilt = -4,
  tone = "vinho",
}: {
  children: React.ReactNode;
  className?: string;
  underline?: boolean;
  heart?: boolean;
  /** Degrees; negative leans up to the right, like the designs. */
  tilt?: number;
  tone?: "vinho" | "ink" | "pink" | "accent";
}) {
  const color = { vinho: "text-vinho", ink: "text-ink", pink: "text-pink", accent: "text-accent" }[tone];
  return (
    <span
      className={cn("hand inline-block text-2xl sm:text-3xl", color, className)}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {children}
      {heart && <span className="hand-heart ml-1.5 inline-block">♥</span>}
      {underline && <span className="hand-line mt-1 block h-[3px] w-14 rounded-full bg-current" />}
    </span>
  );
}
