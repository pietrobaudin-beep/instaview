"use client";

import * as React from "react";
import type { SeriesPoint } from "@/lib/analytics";

/**
 * Dependency-free area/line chart. Renders new-follower counts per bucket.
 * Kept intentionally small and self-contained (no charting library) so it
 * theme-matches perfectly and never pulls a heavy client bundle.
 */
export function GrowthChart({ data }: { data: SeriesPoint[] }) {
  const [hover, setHover] = React.useState<number | null>(null);

  const width = 720;
  const height = 240;
  const pad = { top: 20, right: 16, bottom: 28, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;

  const x = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.value)}`).join(" ");
  const areaPath =
    `${linePath} L ${x(n - 1)} ${pad.top + innerH} L ${x(0)} ${pad.top + innerH} Z`;

  const total = data.reduce((a, d) => a + d.value, 0);
  const gridLines = 4;

  // Show a subset of x labels to avoid crowding.
  const labelStep = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-2xl font-semibold tabular-nums">{total}</span>
        <span className="text-xs text-muted-foreground">new followers in range</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="New followers over time"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal grid + y labels */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const gy = pad.top + (i / gridLines) * innerH;
          const val = Math.round(max - (i / gridLines) * max);
          return (
            <g key={i}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={gy}
                y2={gy}
                stroke="hsl(var(--border))"
                strokeDasharray="3 4"
              />
              <text x={4} y={gy + 4} fontSize={10} fill="hsl(var(--muted-foreground))">
                {val}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#area)" />
        <path d={linePath} fill="none" stroke="hsl(var(--accent))" strokeWidth={2} />

        {/* points + hover targets */}
        {data.map((d, i) => (
          <g key={i}>
            {hover === i && (
              <>
                <line
                  x1={x(i)}
                  x2={x(i)}
                  y1={pad.top}
                  y2={pad.top + innerH}
                  stroke="hsl(var(--muted-foreground))"
                  strokeOpacity={0.4}
                />
                <circle cx={x(i)} cy={y(d.value)} r={4} fill="hsl(var(--accent))" />
                <text
                  x={x(i)}
                  y={y(d.value) - 10}
                  fontSize={11}
                  textAnchor="middle"
                  fill="hsl(var(--foreground))"
                  fontWeight={600}
                >
                  {d.value}
                </text>
              </>
            )}
            <rect
              x={x(i) - innerW / (2 * n)}
              y={pad.top}
              width={innerW / n}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {i % labelStep === 0 && (
              <text
                x={x(i)}
                y={height - 8}
                fontSize={10}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
              >
                {d.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
