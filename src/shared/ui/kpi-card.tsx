import { type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { type Provenance } from "@/shared/lib/provenance";
import { ProvenanceTag } from "./provenance-tag";
import { TONE_TEXT, type Tone } from "./tone";

/** Data-driven KPI definition rendered by <KpiCard/> and <KpiGrid/>. */
export interface KpiItem {
  id: string;
  label: string;
  value: string;
  /** Optional unit rendered smaller next to the value ("min", "mo"). */
  unit?: string;
  tone?: Tone;
  provenance?: Provenance;
  caption?: string;
  /** Accent bar on the top edge (amber for "watch" metrics). */
  accent?: Tone;
  highlight?: Tone;
  footer?: ReactNode;
  icon?: ReactNode;
}

const ACCENT: Readonly<Record<Tone, string>> = {
  positive: "before:bg-positive",
  negative: "before:bg-negative",
  warning: "before:bg-warning",
  info: "before:bg-info",
  magenta: "before:bg-magenta",
  lime: "before:bg-lime",
  indigo: "before:bg-indigo",
  neutral: "before:bg-neutral",
};

export function KpiCard({ item, compact = false }: { item: KpiItem; compact?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-[var(--radius-card)] border bg-surface p-3.5 shadow-card",
        item.highlight ? "border-lime/70" : "border-border",
        item.accent && cn("before:absolute before:inset-x-0 before:top-0 before:h-0.5", ACCENT[item.accent]),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
          {item.icon}
          <span className="truncate">{item.label}</span>
        </span>
        {item.provenance ? <ProvenanceTag value={item.provenance} /> : null}
      </div>
      <div className={cn("num leading-none font-semibold", compact ? "text-xl" : "text-[1.6rem]", TONE_TEXT[item.tone ?? "neutral"], !item.tone && "text-fg")}>
        {item.value}
        {item.unit ? <span className="ml-1 text-sm font-normal text-muted">{item.unit}</span> : null}
      </div>
      {item.caption ? <p className="num text-[11px] leading-snug text-subtle">{item.caption}</p> : null}
      {item.footer}
    </div>
  );
}

export function KpiGrid({ items, className, compact }: { items: readonly KpiItem[]; className?: string; compact?: boolean }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8", className)}>
      {items.map((item) => (
        <KpiCard key={item.id} item={item} compact={compact} />
      ))}
    </div>
  );
}
