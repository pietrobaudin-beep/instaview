"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

/**
 * Avatar with graceful fallback: provider/Instagram CDN URLs frequently expire
 * or block hotlinking, so on error we render initials on a colored chip instead
 * of a broken image. Uses a plain <img> (not next/image) precisely because the
 * host set is unpredictable.
 */
export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const showImg = src && !failed;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
