"use client";

import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_PROPS,
  ChartFrame,
  ChartLegend,
  ChartTooltipBox,
  GRID_PROPS,
} from "@/shared/charts/chart-frame";
import { cn } from "@/shared/lib/cn";
import { monthShort } from "@/shared/lib/dates";
import { formatMoney, formatPercent, formatThousandValue, NA_SHORT } from "@/shared/lib/format";
import { KpiGrid } from "@/shared/ui/kpi-card";
import { Meter } from "@/shared/ui/meter";
import { Panel, SubCard } from "@/shared/ui/panel";
import { FilterSelect } from "@/shared/ui/select";
import { Table, Td, Th } from "@/shared/ui/table";
import { TONE_VAR } from "@/shared/ui/tone";
import { type LiquidityAnalysis } from "../schemas/individual";
import { renderKpis, type KpiDef } from "@/shared/ui/kpi-defs";

const KPIS: readonly KpiDef<LiquidityAnalysis>[] = [
  {
    id: "amb",
    label: "Avg monthly bal.",
    provenance: "DERIVED",
    value: (d) => formatMoney(d.kpis.avgMonthlyBalance),
  },
  {
    id: "adb",
    label: "Avg daily balance",
    provenance: "DERIVED",
    value: (d) => formatMoney(d.kpis.avgDailyBalance),
  },
  { id: "me", label: "Avg month-end", provenance: "DERIVED", value: (d) => formatMoney(d.kpis.avgMonthEnd) },
  {
    id: "min",
    label: "Minimum (consol.)",
    provenance: "FACT",
    accent: "warning",
    value: (d) => formatMoney(d.kpis.min),
  },
  { id: "max", label: "Maximum (consol.)", provenance: "FACT", value: (d) => formatMoney(d.kpis.max) },
  { id: "close", label: "Closing", provenance: "FACT", value: (d) => formatMoney(d.kpis.closing) },
  {
    id: "low",
    label: "Low-balance days",
    provenance: "DERIVED",
    accent: "warning",
    value: (d) => String(d.kpis.lowBalanceDays),
    caption: (d) => d.kpis.lowBalanceRule,
  },
  {
    id: "neg",
    label: "Negative balances",
    provenance: "FACT",
    value: (d) => String(d.kpis.negativeBalances),
  },
  {
    id: "od",
    label: "OD utilisation",
    provenance: "FACT",
    tone: "neutral",
    value: (d) => (d.kpis.odFacility ? "—" : NA_SHORT),
    caption: (d) => (d.kpis.odFacility ? "" : "no OD facility"),
  },
  {
    id: "buffer",
    label: "Liquidity buffer",
    provenance: "DERIVED",
    value: (d) => `${d.kpis.bufferMonths.toFixed(1)} mo`,
    caption: () => "closing ÷ avg outflow",
  },
];

const MARKER_COLOR: Readonly<Record<LiquidityAnalysis["markers"][number]["kind"], string>> = {
  salary: TONE_VAR.positive,
  loan: TONE_VAR.magenta,
  major_payment: TONE_VAR.warning,
  returned: TONE_VAR.negative,
  closing: TONE_VAR.negative,
};
const L = (m: { amountMinor: number }) => m.amountMinor / 100 / 100_000; // ₹ lakh
const dayLabel = (d: string) => `${d.slice(8)}-${monthShort(Number(d.slice(5, 7)) - 1)}`;

export function LiquidityTab({ data }: { data: LiquidityAnalysis }) {
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const rows = data.series.map((p) => ({
    date: p.date,
    consolidated: L(p.consolidated),
    primary: L(p.primary),
    secondary: L(p.secondary),
  }));
  const series = view === "daily" ? rows : rows.filter((_, i) => i % 7 === 0 || i === rows.length - 1);
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const monthly = data.monthly.map((m) => ({
    month: m.month,
    inflow: m.inflow.amountMinor / 100_000,
    outflow: m.outflow.amountMinor / 100_000,
    net: m.net.amountMinor / 100_000,
  }));
  return (
    <div className="space-y-4">
      <KpiGrid items={renderKpis(KPIS, data)} className="xl:grid-cols-5 2xl:grid-cols-5" compact />
      <Panel
        title="Balance Movement"
        meta={`daily end-of-day balance · ${data.series.length} days · ₹`}
        actions={
          <>
            <ChartLegend
              config={{
                c: { label: "Consolidated", color: "var(--info)" },
                p: { label: data.seriesLabels.primary, color: "var(--lime)" },
                s: { label: data.seriesLabels.secondary, color: "var(--muted)" },
              }}
              dashed={["s"]}
            />
            <FilterSelect
              label="View"
              size="sm"
              value={view}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
              ]}
              onValueChange={(v) => setView(v === "weekly" ? "weekly" : "daily")}
            />
          </>
        }
      >
        <ChartFrame
          config={{ consolidated: { label: "Consolidated", color: "var(--info)" } }}
          summary={`Consolidated balance closing ${formatMoney(data.kpis.closing)}; minimum ${formatMoney(data.kpis.min)}, maximum ${formatMoney(data.kpis.max)}`}
          height={340}
        >
          <ComposedChart data={series} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="consol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--info)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--info)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="date"
              {...AXIS_PROPS}
              tickFormatter={(d: string) =>
                d.endsWith("-15") ? `${monthShort(Number(d.slice(5, 7)) - 1)} 26` : ""
              }
              interval={0}
            />
            <YAxis {...AXIS_PROPS} tickFormatter={(v: number) => `${v.toFixed(1)}L`} />
            <Tooltip
              content={({ payload, label }) =>
                payload?.[0] ? (
                  <ChartTooltipBox
                    title={dayLabel(String(label))}
                    rows={payload.map((p) => ({
                      label: String(p.name),
                      value: `₹${Number(p.value).toFixed(2)} L`,
                      color: String(p.color),
                    }))}
                  />
                ) : null
              }
            />
            <ReferenceLine
              y={L(data.lowThreshold)}
              stroke="var(--negative)"
              strokeOpacity={0.5}
              strokeDasharray="2 3"
            />
            <Area
              dataKey="consolidated"
              name="Consolidated"
              stroke="var(--info)"
              strokeWidth={2}
              fill="url(#consol)"
              type="stepAfter"
              isAnimationActive={false}
            />
            <Line
              dataKey="secondary"
              name={data.seriesLabels.secondary}
              stroke="var(--muted)"
              strokeDasharray="3 3"
              dot={false}
              type="stepAfter"
              isAnimationActive={false}
            />
            <Line
              dataKey="primary"
              name={data.seriesLabels.primary}
              stroke="var(--lime)"
              strokeWidth={1.75}
              dot={false}
              type="stepAfter"
              isAnimationActive={false}
            />
            {data.markers.map((mk) => {
              const r = byDate.get(mk.date);
              if (!r) return null;
              return (
                <ReferenceDot
                  key={mk.date + mk.label}
                  x={mk.date}
                  y={mk.series === "primary" ? r.primary : r.consolidated}
                  r={4}
                  fill={MARKER_COLOR[mk.kind]}
                  stroke="none"
                  label={{ value: mk.label, position: "top", fill: MARKER_COLOR[mk.kind], fontSize: 10 }}
                />
              );
            })}
          </ComposedChart>
        </ChartFrame>
        <p className="mt-2 text-xs text-subtle">
          Consolidated is driven by HDFC savings; the salary account — where EMIs debit — runs close to zero
          before each salary. Dashed red line: {formatMoney(data.lowThreshold)} low-balance threshold.
        </p>
      </Panel>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Liquidity Health Indicator" meta={data.indicator.model}>
          <div className="flex items-start gap-4">
            <span className="num text-5xl font-bold text-warning">{data.indicator.score}</span>
            <span>
              <span className="block text-lg font-semibold text-warning">{data.indicator.label}</span>
              <span className="block text-xs text-subtle">
                was {data.indicator.previous} in {data.indicator.previousPeriod} · confidence{" "}
                {data.indicator.confidence.toFixed(2)}
              </span>
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            {data.indicator.items.map((i) => (
              <li key={i.label} className="border-b border-border/60 pb-2">
                <p className="flex justify-between text-sm">
                  <span className="text-fg">{i.label}</span>
                  <span className={cn("num", i.score >= 70 ? "text-positive" : "text-warning")}>
                    {i.score}
                  </span>
                </p>
                <div className="flex items-center justify-between gap-3 text-[11px] text-subtle">
                  <span>{i.detail}</span>
                  <Meter
                    value={i.score / 100}
                    tone={i.score >= 70 ? "positive" : "warning"}
                    className="w-20 shrink-0"
                    label={i.label}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Inflows vs Outflows" meta="₹ thousand · net line">
          <ChartFrame
            config={{
              inflow: { label: "Inflows", color: "var(--positive)" },
              outflow: { label: "Outflows", color: "var(--negative)" },
              net: { label: "Net", color: "var(--lime)" },
            }}
            summary={monthly
              .map((m) => `${m.month}: in ${m.inflow.toFixed(0)}k, out ${m.outflow.toFixed(0)}k`)
              .join("; ")}
            height={300}
          >
            <ComposedChart data={monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={(v: number) => `${v}k`} />
              <ReferenceLine y={0} stroke="var(--border-strong)" />
              <Bar dataKey="inflow" fill="var(--color-inflow)" barSize={14} isAnimationActive={false} />
              <Bar
                dataKey="outflow"
                fill="var(--color-outflow)"
                fillOpacity={0.75}
                barSize={14}
                isAnimationActive={false}
              />
              <Line
                dataKey="net"
                stroke="var(--color-net)"
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartFrame>
          <ChartLegend
            config={{
              i: { label: "Inflows", color: "var(--positive)" },
              o: { label: "Outflows", color: "var(--negative)" },
              n: { label: "Net", color: "var(--lime)" },
            }}
          />
        </Panel>
        <Panel title="Cash Flow Analysis" meta="external flows only">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Total inflows", formatMoney(data.totals.inflow), "text-fg"],
              ["Total outflows", formatMoney(data.totals.outflow), "text-fg"],
              ["Net", formatMoney(data.totals.net, { sign: "always" }), "text-positive"],
              ["Cash-flow margin", formatPercent(data.totals.margin), "text-warning"],
              ["Cash retention", formatPercent(data.totals.retention), "text-warning"],
              ["Negative months", `${data.totals.negativeMonths} of 6`, "text-negative"],
            ].map(([l, v, c]) => (
              <SubCard key={l} className="px-2.5 py-2">
                <p className="text-[11px] text-muted">{l}</p>
                <p className={`num text-sm font-semibold ${c}`}>{v}</p>
              </SubCard>
            ))}
          </div>
          <Table className="mt-3 text-[13px]">
            <thead>
              <tr>
                <Th>₹ K</Th>
                {data.monthly.map((m) => (
                  <Th key={m.month} align="right">
                    {m.month}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["In", "inflow"],
                  ["Out", "outflow"],
                  ["Net", "net"],
                  ["M-end", "monthEnd"],
                ] as const
              ).map(([label, key]) => (
                <tr key={label}>
                  <Td className="text-fg">{label}</Td>
                  {data.monthly.map((m) => (
                    <Td
                      key={m.month}
                      align="right"
                      className={cn(
                        "num",
                        key === "net"
                          ? m.net.amountMinor < 0
                            ? "text-negative"
                            : "text-positive"
                          : "text-fg",
                      )}
                    >
                      {formatThousandValue(m[key])}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="mt-2 text-xs text-subtle">{data.seasonality}</p>
        </Panel>
      </div>
    </div>
  );
}
