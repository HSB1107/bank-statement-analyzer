"use client";

import { Sparkline } from "@/shared/charts/sparkline";
import { cn } from "@/shared/lib/cn";
import { formatDeltaPercent } from "@/shared/lib/format";
import { TONE_TEXT, TONE_VAR, type Tone } from "@/shared/ui/tone";
import { type KpiValue } from "../schemas/dashboard";
import { DASHBOARD_KPIS, type DashboardKpiDef } from "./kpi-config";

function deltaTone(def: DashboardKpiDef, delta: number): Tone {
  switch (def.polarity) {
    case "up_good":
      return delta >= 0 ? "positive" : "negative";
    case "down_good":
      return delta <= 0 ? "positive" : "negative";
    case "up_watch":
      return delta > 0 ? "warning" : "positive";
    case "up_bad":
      return delta > 0 ? "negative" : "positive";
  }
}

export function KpiStrip({ kpis }: { kpis: readonly KpiValue[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-8">
      {DASHBOARD_KPIS.map((def) => {
        const k = kpis.find((x) => x.id === def.id);
        if (!k) return null;
        const tone = deltaTone(def, k.delta);
        return (
          <li
            key={def.id}
            className={cn(
              "flex flex-col gap-2 rounded-[var(--radius-card)] border bg-surface p-3.5 shadow-card",
              def.highlight ? "border-lime/70" : "border-border",
            )}
          >
            <span className="flex items-center gap-1.5 truncate text-[13px] text-muted">
              {def.icon}
              {def.label}
            </span>
            <span className="num text-[1.7rem] leading-none font-semibold text-fg">
              {def.format(k.value)}
              {def.unit ? <span className="ml-0.5 text-sm font-normal text-muted">{def.unit}</span> : null}
            </span>
            <span className="flex items-end justify-between gap-2">
              <span className={cn("num text-xs", TONE_TEXT[tone])}>
                <span className="sr-only">Change vs previous period: </span>
                {formatDeltaPercent(k.delta)}
              </span>
              <Sparkline values={k.series} color={TONE_VAR[tone]} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
