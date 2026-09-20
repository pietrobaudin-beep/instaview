"use client";

import * as React from "react";

/**
 * A profile picture that arrives as a mosaic and sharpens.
 *
 * The rule from the design: nothing of the real person shows before the API
 * answers. Until `src` exists this draws a plain silhouette; once it does, the
 * picture is painted into a canvas at a very low resolution and redrawn bigger
 * and bigger, so it genuinely resolves from squares instead of just unblurring.
 */

/** Resolution of each beat, in pixels of the source grid. */
const LADDER = [4, 7, 12, 22, 44];
const STEP_MS = 800;

export function PixelAvatar({
  src,
  size = 120,
  /** Starts the mosaic → sharp sequence. */
  revealing,
  onDone,
  className = "",
}: {
  src?: string | null;
  size?: number;
  revealing: boolean;
  onDone?: () => void;
  className?: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [rung, setRung] = React.useState(0);
  const [sharp, setSharp] = React.useState(false);
  const doneRef = React.useRef(onDone);
  doneRef.current = onDone;

  // Instagram blocks hotlinking; the proxy also keeps the canvas same-origin.
  const url = React.useMemo(() => {
    if (!src) return null;
    return /(?:\.fbcdn\.net|\.cdninstagram\.com)/i.test(src)
      ? `/api/img?url=${encodeURIComponent(src)}`
      : src;
  }, [src]);

  React.useEffect(() => {
    if (!url) return;
    const image = new Image();
    // No crossOrigin on purpose: we only ever draw the picture, never read its
    // pixels, and asking for CORS makes hosts that don't send the header fail.
    image.onload = () => setImg(image);
    image.onerror = () => setFailed(true);
    image.src = url;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [url]);

  // Climb the ladder once the profile is in and the picture has loaded.
  React.useEffect(() => {
    if (!revealing || !img) return;
    let n = 0;
    setRung(0);
    const id = window.setInterval(() => {
      n += 1;
      if (n >= LADDER.length) {
        window.clearInterval(id);
        setSharp(true);
        doneRef.current?.();
      } else {
        setRung(n);
      }
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [revealing, img]);

  // Nothing to sharpen: let the caller move on anyway.
  React.useEffect(() => {
    if (!revealing) return;
    if (failed || !url) {
      // No picture to sharpen: still take the time the mosaic would have taken,
      // so the screen lasts the same either way.
      const id = window.setTimeout(() => doneRef.current?.(), STEP_MS * LADDER.length);
      return () => window.clearTimeout(id);
    }
  }, [revealing, failed, url]);

  // Paint the current rung: source shrunk to a few pixels, blown back up with
  // smoothing off — a real mosaic, not a blur.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const res = LADDER[Math.min(rung, LADDER.length - 1)];
    const small = document.createElement("canvas");
    small.width = res;
    small.height = res;
    const sctx = small.getContext("2d");
    if (!sctx) return;
    // Cover-crop the source into the square.
    const side = Math.min(img.width, img.height);
    sctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, res, res);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  }, [img, rung, size]);

  return (
    <div
      className={`relative overflow-hidden rounded-full bg-ink/10 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Generic silhouette: all anyone sees until the profile comes back. */}
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full text-ink/25" aria-hidden>
        <circle cx="24" cy="18" r="8" fill="currentColor" />
        <path d="M8 44c0-8.8 7.2-14 16-14s16 5.2 16 14z" fill="currentColor" />
      </svg>

      {img && (
        <>
          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className="absolute inset-0 h-full w-full transition-opacity duration-500"
            style={{ opacity: revealing ? (sharp ? 0 : 1) : 0, imageRendering: "pixelated" }}
            aria-hidden
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            style={{ opacity: sharp ? 1 : 0 }}
          />
        </>
      )}
    </div>
  );
}
