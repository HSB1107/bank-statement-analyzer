"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { ChartFrame, AXIS_PROPS } from "@/shared/charts/chart-frame";
import { Donut } from "@/shared/charts/donut";
import { cn } from "@/shared/lib/cn";
import { formatCount } from "@/shared/lib/format";
import { HEALTH_BAND_LABELS, type HealthBand } from "@/shared/data/schemas/case";
import { Panel } from "@/shared/ui/panel";
import { TONE_BG, TONE_VAR } from "@/shared/ui/tone";
import { type DashboardOverview } from "../schemas/dashboard";
import { bandTone } from "./case-chips";

const BAND_COLOR: Readonly<Record<HealthBand, string>> = {
  strong: TONE_VAR.lime,
  healthy: TONE_VAR.positive,
  watchlist: TONE_VAR.warning,
  weak: "color-mix(in oklab, var(--negative) 65%, var(--warning))",
  critical: TONE_VAR.negative,
};

export function HealthPanel({ health }: { health: DashboardOverview["health"] }) {
  const [focus, setFocus] = useState<HealthBand>("watchlist");
  const [c1 = 40, c2 = 55, c3 = 70, c4 = 85] = health.cutoffs;
  const bandLabel: Readonly<Record<HealthBand, string>> = {
    critical: `<${c1}`,
    weak: `${c1}-${c2 - 1}`,
    watchlist: `${c2}-${c3 - 1}`,
    healthy: `${c3}-${c4 - 1}`,
    strong: `${c4}+`,
  };
  const ascending = [...health.bands].reverse();
  const summary = health.bands.map((b) => `${HEALTH_BAND_LABELS[b.band]} ${b.count}`).join(", ");
  return (
    <Panel title="Financial Health" meta="latest score">
      <div className="flex flex-wrap items-center gap-5">
        <Donut
          slices={ascending.map((b) => ({
            key: b.band,
            label: HEALTH_BAND_LABELS[b.band],
            value: b.count,
            color: BAND_COLOR[b.band],
          }))}
          center={
            <span>
              <span className="num block text-2xl font-semibold text-fg">{formatCount(health.total)}</span>
              <span className="text-xs text-muted">customers</span>
            </span>
          }
          summary={`Customers by health band: ${summary}`}
          size={150}
        />
        <ul className="min-w-[180px] flex-1 space-y-1">
          {health.bands.map((b) => (
            <li key={b.band}>
              <button
                type="button"
                aria-pressed={focus === b.band}
                onClick={() => setFocus(b.band)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border px-2 py-1 text-sm",
                  focus === b.band
                    ? "border-warning/50 bg-surface-2"
                    : "border-transparent hover:bg-surface-2",
                )}
              >
                <span className="flex items-center gap-2 text-fg">
                  <span aria-hidden className={cn("size-2.5 rounded-sm", TONE_BG[bandTone(b.band)])} />
                  {HEALTH_BAND_LABELS[b.band]}
                </span>
                <span className="num text-fg">{formatCount(b.count)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="label-micro mt-5 mb-1">Customers by score band</p>
      <ChartFrame
        config={{ count: { label: "Customers", color: "var(--positive)" } }}
        summary={`Customers by score band: ${ascending.map((b) => `${bandLabel[b.band]}: ${b.count}`).join(", ")}`}
        height={150}
      >
        <BarChart
          data={ascending.map((b) => ({ band: b.band, label: bandLabel[b.band], count: b.count }))}
          margin={{ top: 18, right: 4, left: -18, bottom: 0 }}
        >
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickCount={3} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {ascending.map((b) => (
              <Cell key={b.band} fill={BAND_COLOR[b.band]} fillOpacity={focus === b.band ? 1 : 0.75} />
            ))}
            <LabelList dataKey="count" position="top" fill="var(--muted)" fontSize={11} />
          </Bar>
        </BarChart>
      </ChartFrame>
      <p className="mt-2 text-xs text-subtle">
        Bands {health.cutoffs.join(" / ")} · {health.modelNote}
      </p>
    </Panel>
  );
}
