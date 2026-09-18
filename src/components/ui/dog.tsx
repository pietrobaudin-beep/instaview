"use client";

import * as React from "react";

/**
 * The Farejo mascot. Uses the brand artwork as-is, with `currentColor` so it
 * takes the ink of whatever surface it sits on (pink splash, cream page).
 *
 * The outline is a single path with counter-wound subpaths, which is what
 * hollows out the body and the highlight in the nose — do not split it.
 *
 * `animated` runs the sniffing loop. Today that is a CSS motion applied to the
 * whole drawing; when the six frames of the hand-drawn animation arrive, swap
 * this for <AnimatedDog frames={...} /> below and the callers stay unchanged.
 */
export function SniffingDog({
  className = "h-40",
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 783.99 564.28"
      className={`${className}${animated ? " dog-sniff" : ""}`}
      fill="currentColor"
      role="img"
      aria-label="Cachorro farejando"
    >
      <path d="M750.76,529.91c-7.62,8.49-17.45,14.75-28.39,18.01-21.35,6.37-44.86,9.88-66.3,11.52-53.24,4.07-106.08,1.56-158.54-8.2-28.43-5.29-54.78-14.03-80.91-25.83-9.97,24.59-36.29,36.19-61.12,38.26-39.07,3.26-76.91-6.01-90.35-46.61-20.24-4.88-33.91-20.86-37.23-41.36-21.5-7.21-40.59-17.64-58.53-32.59l-12.07,14.41c.8,12.66,1.04,24.85-4.02,36.55-6.7,15.49-20.33,26.09-36.9,30.1-26.69,6.45-54.77,1.95-78.38-11.99C.37,489.93-10.5,441.86,10.73,404.53c8.54-15.01,18.12-28.67,27.99-42.94l33.47-47.4c6.25-33.42,20.6-63.56,41.58-90.05-57.8-53.78-47.09-137.79.6-193.28C127.66,16.26,151.81-2.79,172.33.34c10.44,1.6,17.46,10.02,16.89,20.73-.36,6.71-2.25,13.49-4.51,20.12-4.78,13.98-9.27,27.37-11.66,42.08-4.18,25.76,2.03,51.71,17.49,72.75,102.71-62.81,226.57-47.45,326.79,11.07,15.14,8.84,28.71,18.58,42.87,28.41,15.14.41,28.8,4.16,43.31,8.91,14.48-17.56,38.39-14.87,58.04-8.62,27.21,8.65,51.61,22.85,73.51,41.08,21.29,17.71,36.93,40.18,45.09,66.65,3.37,10.94,4.76,21.98,3.21,33.17-3.74,26.91-24.94,39.36-51.68,38.53l13.58,13.28c25.87,25.31,41.04,53.1,33.92,90.47,0,0-2.54,22.13-28.41,50.95ZM174.25,166.08c-27.44-36.43-26.18-79.65-11.6-120.39l7.18-21.81c.36-1.1,0-4.08-.97-4.55-5.9-2.84-24.26,9.67-30.15,14.99-48.99,44.29-64.27,127.21-12.54,174.7,14.81-16.49,30.56-30.08,48.07-42.94ZM367.27,530.69c.29-1.25,4.17-1.67,4.98-.85.67.68,1.97,2.67,1.83,3.69l-1.21,9.02c27.58-8.57,38.22-35.61,28.52-61.99-1.73-4.71-.1-9.81,4.06-11.5,4.48-1.82,9.59-.07,11.43,4.74,4.35,11.38,5.76,22.94,4.71,35.12,46.97,22.21,98.41,31.68,151.11,34.37-16.41-10.5-27.81-26.39-30.69-43.52-3.55-21.12,2.61-40.25,16.38-55.31,29.45-32.21,81.04-38.5,121.41-27.28,15.81,4.39,29.97,11.81,41.41,23.09,25.27,24.93,25.49,64.37-.49,89.65,6.74.73,11.3-3.48,15.23-7.88,9.85-11.05,18.32-22.46,23.46-36.42,12.1-32.93-2.38-62.4-26.14-85.16l-24.45-23.42c-13.41-12.85-22.21-28.29-27.8-45.98-9.89-31.3-21.06-58.97-43.66-83.24-24.7-26.53-52.67-36.75-88.36-38.54-34.81-25.32-72.22-45.59-113.15-59-92.17-30.19-193.57-20.11-268.99,43.64-37.76,31.91-66.96,71.11-77.44,120.14-1.1,5.13-3.23,9.99-6.22,14.3l-52.65,75.86c-21.99,31.68-16.85,73.12,16.26,93.35,13.17,8.04,27.45,11.9,42.98,12.49,6.68-9.13,2.07-19.61,8.43-19.99,7.91-.47,2.68,14.56,1.51,19.65,24.11-.61,42.02-15.86,41.05-41.23l-.61-15.93,49.04-64.42c3.35-4.4,9.27-4.76,12.99-1.59,4,3.41,3.17,8.67.13,12.77l-22.27,30.08c21.53,19.21,48.17,30.49,75.71,36.64-1-17.29-1.76-32.87-1.29-49.55.15-5.33,4.69-8.79,9.53-8.18,4.54.58,7.49,4.12,7.42,9.21-.41,28.87,1.76,68.77,10.78,95.9,11.17,33.6,51.14,37.55,81.23,31.91,1.51-4.49,2.86-10.31,3.85-14.62ZM663.7,477.85c1.18-11.95-8.79-21.91-20.75-20.72-8.84.88-15.99,8.03-16.87,16.87-1.18,11.95,8.79,21.91,20.75,20.72,8.84-.88,15.99-8.03,16.87-16.87ZM257.9,483.48l-10.75-1.61c2.91,6.89,6.14,11.51,12.67,14.8l-1.92-13.19Z" />
      <path d="M330.5,475.64c-25.86-4.44-44.55-24.64-47.94-50.14-4.12-31,12.42-65.54,29.04-91.07,19.84-30.48,44.12-57.46,73.55-78.76,9.52-6.89,19.63-11.94,31.2-12.58,13.51-.76,24.97,7.5,27.72,21.09,6.36,31.42,7.85,63.69,3.34,95.6-3.94,27.93-13.52,53.6-28.72,76.85-19.3,29.53-52.71,45.11-88.19,39.02Z" />
      <path d="M559.87,392.46c-5.27,5.95-12.08,7.68-19.56,6.58-5.86-.86-11.9-4.76-15.54-10.95-5.53-9.38-5.23-21.33.47-30.68,3.81-6.26,10.38-9.77,16.88-10.26,7.08-.54,13.98,2.37,18.66,8.14,8.64,10.66,8.43,26.62-.91,37.17Z" />
      <path d="M652.98,374.85c-4.2,7.02-11.21,10.57-18.23,10.7-7.39.14-14.34-3.34-18.69-9.82-6.54-9.73-6.71-22.85-.24-32.61,3.91-5.9,10.03-9.38,16.32-9.88,7.01-.55,13.83,2.23,18.62,7.88,7.86,9.26,8.65,22.96,2.21,33.73Z" />
    </svg>
  );
}

/** The hand-drawn frames, served from /public/dog. */
export const DOG_FRAME_SRCS = [
  "/dog/01.png",
  "/dog/02.png",
  "/dog/03.png",
  "/dog/04.png",
  "/dog/05.png",
  "/dog/06.png",
];

/**
 * Plays the hand-drawn sniffing animation from /public/dog.
 *
 * The frames are probed before anything is rendered: a plain <img> would fire
 * its error event while the HTML is still parsing, before React attaches a
 * handler, and the browser would show a broken-image icon. So we load frame one
 * off-document first and only mount the sequence once it is known to exist —
 * otherwise we fall back to the vector drawing with CSS motion.
 */
export function AnimatedDog({
  className = "h-40",
  fps = 8,
}: {
  className?: string;
  fps?: number;
}) {
  const [ready, setReady] = React.useState<boolean | null>(null);
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    const probe = new window.Image();
    probe.onload = () => alive && setReady(true);
    probe.onerror = () => alive && setReady(false);
    probe.src = DOG_FRAME_SRCS[0];
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % DOG_FRAME_SRCS.length), 1000 / fps);
    return () => clearInterval(id);
  }, [ready, fps]);

  // Unknown or missing: the vector mascot covers both.
  if (!ready) return <SniffingDog className={className} animated />;

  return (
    <div className={`relative ${className}`} role="img" aria-label="Cachorro farejando">
      {DOG_FRAME_SRCS.map((src, n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden
          className={`h-full w-full object-contain ${n === 0 ? "" : "absolute inset-0"} ${
            n === i ? "" : "invisible"
          }`}
        />
      ))}
    </div>
  );
}

/** Hand-drawn heart used as a brand accent. */
export function Heart({ className = "h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 44" className={className} fill="none" aria-hidden>
      <path
        d="M24 40 C 8 28, 3 19, 6 12 C 9 4, 20 3, 24 13 C 28 3, 39 4, 42 12 C 45 19, 40 28, 24 40 Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
