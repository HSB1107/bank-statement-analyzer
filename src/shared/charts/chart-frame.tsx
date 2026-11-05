"use client";

import { type CSSProperties, type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/shared/lib/cn";

/** Series config (shadcn-chart style): key → label + colour token. Rendered as CSS vars `--color-<key>`. */
export type ChartConfig = Record<string, { label: string; color: string }>;

export function chartStyle(config: ChartConfig): CSSProperties {
  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) style[`--color-${key}`] = value.color;
  return style;
}

/**
 * Accessible chart wrapper: the SVG is decorative to screen readers (`aria-hidden`) and a
 * text summary is provided instead. Charts always have a visible numeric companion elsewhere.
 */
export function ChartFrame({
  config,
  summary,
  className,
  children,
  height = 220,
}: {
  config: ChartConfig;
  summary: string;
  className?: string;
  children: ReactNode;
  height?: number;
}) {
  return (
    <figure className={cn("relative w-full", className)} style={{ ...chartStyle(config), height }}>
      <figcaption className="sr-only">{summary}</figcaption>
      <div aria-hidden className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function ChartLegend({
  config,
  className,
  dashed = [],
}: {
  config: ChartConfig;
  className?: string;
  dashed?: readonly string[];
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted", className)}>
      {Object.entries(config).map(([key, v]) => (
        <li key={key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "inline-block h-0.5 w-3.5",
              dashed.includes(key) && "border-t-2 border-dashed bg-transparent",
            )}
            style={dashed.includes(key) ? { borderColor: v.color } : { background: v.color }}
          />
          {v.label}
        </li>
      ))}
    </ul>
  );
}

/** Shared axis/grid styling. */
export const AXIS_PROPS = {
  stroke: "var(--subtle)",
  tick: { fill: "var(--subtle)", fontSize: 11, fontFamily: "var(--font-mono)" },
  tickLine: false,
  axisLine: false,
} as const;

export const GRID_PROPS = { stroke: "var(--chart-grid)", strokeDasharray: "3 3", vertical: false } as const;

export function ChartTooltipBox({
  title,
  rows,
}: {
  title?: string;
  rows: readonly { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-xs shadow-card">
      {title ? <p className="mb-1 font-medium text-fg">{title}</p> : null}
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-4 text-muted">
          <span className="flex items-center gap-1.5">
            {r.color ? (
              <span aria-hidden className="size-2 rounded-full" style={{ background: r.color }} />
            ) : null}
            {r.label}
          </span>
          <span className="num text-fg">{r.value}</span>
        </p>
      ))}
    </div>
  );
}
