"use client";

import { Bar, ComposedChart, LabelList, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import {
  AXIS_PROPS,
  ChartFrame,
  ChartLegend,
  ChartTooltipBox,
  GRID_PROPS,
} from "@/shared/charts/chart-frame";
import { Donut } from "@/shared/charts/donut";
import { cn } from "@/shared/lib/cn";
import { formatMoney, formatPercent } from "@/shared/lib/format";
import { toMajor } from "@/shared/lib/money";
import { Chip } from "@/shared/ui/chip";
import { KpiGrid } from "@/shared/ui/kpi-card";
import { Meter } from "@/shared/ui/meter";
import { Panel } from "@/shared/ui/panel";
import { TONE_TEXT } from "@/shared/ui/tone";
import { type IncomeAnalysis } from "../schemas/individual";
import { renderKpis, type KpiDef } from "./kpi-defs";

const KPIS: readonly KpiDef<IncomeAnalysis>[] = [
  {
    id: "credits",
    label: "Total credits",
    provenance: "FACT",
    value: (d) => formatMoney(d.kpis.totalCredits),
    caption: (d) => `excl. ${formatMoney(d.kpis.ownTransfers, { scale: "lakh" })} own transfers`,
  },
  {
    id: "avg",
    label: "Avg income",
    provenance: "DERIVED",
    value: (d) => formatMoney(d.kpis.avgIncome),
    caption: () => "salary + interest / month",
  },
  {
    id: "median",
    label: "Median",
    provenance: "DERIVED",
    value: (d) => formatMoney(d.kpis.median),
    caption: () => "6 months",
  },
  {
    id: "salary",
    label: "Salary",
    provenance: "FACT",
    value: (d) => formatMoney(d.kpis.salaryTotal),
    caption: (d) => `${d.kpis.salaryCredits} credits · ${d.kpis.employers} employer`,
  },
  {
    id: "other",
    label: "Other recurring",
    provenance: "FACT",
    value: (d) => formatMoney(d.kpis.otherRecurring),
    caption: () => "savings interest · quarterly",
  },
  {
    id: "nonrec",
    label: "Non-recurring",
    provenance: "FACT",
    value: (d) => formatMoney(d.kpis.nonRecurring),
    caption: (d) => `loan ${formatMoney(d.kpis.loan, { scale: "lakh" })} + tax refund`,
  },
  {
    id: "growth",
    label: "Growth",
    provenance: "DERIVED",
    value: (d) => formatPercent(d.kpis.growth, 1, "always"),
    caption: () => "salary Q1 → Q2",
  },
  {
    id: "vol",
    label: "Volatility",
    provenance: "DERIVED",
    value: (d) => formatPercent(d.kpis.volatility),
    caption: () => "coefficient of variation",
  },
];

const DIST_COLOR: Readonly<Record<string, string>> = {
  salary: "var(--lime)",
  interest: "var(--info)",
  loan: "var(--magenta)",
  tax_refund: "var(--indigo)",
};
const k = (m: { amountMinor: number }) => m.amountMinor / 100_000;

export function IncomeTab({ data }: { data: IncomeAnalysis }) {
  const chart = data.trend.map((t) => ({
    month: t.month,
    salary: k(t.salary),
    other: k(t.otherRecurring),
    nonIncome: k(t.nonIncome),
    total: k(t.total),
    note: t.note,
    highlight: t.note?.includes("loan") ?? false,
  }));
  return (
    <div className="space-y-4">
      <KpiGrid items={renderKpis(KPIS, data)} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel
          title="Monthly Income Trend"
          meta="₹ thousand"
          actions={
            <ChartLegend
              config={{
                s: { label: "Salary", color: "var(--lime)" },
                o: { label: "Other recurring", color: "var(--info)" },
                n: { label: "Non-income credits", color: "var(--magenta)" },
                t: { label: "Total inflows", color: "var(--chart-muted)" },
              }}
              dashed={["n"]}
            />
          }
        >
          <ChartFrame
            config={{ salary: { label: "Salary", color: "var(--lime)" } }}
            summary={`Monthly salary ${chart.map((c) => `${c.month} ${c.salary.toFixed(1)}k`).join(", ")}`}
            height={300}
          >
            <ComposedChart data={chart} margin={{ top: 28, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={(v: number) => `${v}k`} />
              <Tooltip
                cursor={{ fill: "var(--surface-3)", opacity: 0.4 }}
                content={({ payload, label }) =>
                  payload?.[0] ? (
                    <ChartTooltipBox
                      title={String(label)}
                      rows={[
                        {
                          label: "Salary",
                          value: `₹${Number(payload[0].payload.salary).toFixed(1)}k`,
                          color: "var(--lime)",
                        },
                        { label: "Total inflows", value: `₹${Number(payload[0].payload.total).toFixed(1)}k` },
                      ]}
                    />
                  ) : null
                }
              />
              <Bar
                dataKey="total"
                barSize={52}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
                fill="var(--chart-muted)"
                fillOpacity={0.55}
                shape={(p: {
                  x?: number;
                  y?: number;
                  width?: number;
                  height?: number;
                  payload?: { highlight?: boolean };
                }) => (
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.width}
                    height={p.height}
                    rx={3}
                    fill={p.payload?.highlight ? "var(--warning)" : "var(--chart-muted)"}
                    fillOpacity={p.payload?.highlight ? 0.55 : 0.55}
                  />
                )}
              >
                <LabelList
                  dataKey="note"
                  content={(p: {
                    x?: number | string;
                    y?: number | string;
                    width?: number | string;
                    value?: unknown;
                  }) =>
                    p.value ? (
                      <text
                        x={Number(p.x) + Number(p.width) / 2}
                        y={Number(p.y) - 8}
                        textAnchor="middle"
                        fill="var(--warning)"
                        fontSize={10}
                        className="num"
                      >
                        {String(p.value)}
                      </text>
                    ) : null
                  }
                />
              </Bar>
              <Line
                dataKey="nonIncome"
                stroke="var(--magenta)"
                strokeDasharray="4 4"
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
              <Line dataKey="other" stroke="var(--info)" dot={{ r: 3 }} isAnimationActive={false} />
              <Line
                dataKey="salary"
                stroke="var(--lime)"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="salary"
                  position="top"
                  fill="var(--lime)"
                  fontSize={10}
                  formatter={(v: unknown) => Number(v).toFixed(1)}
                />
              </Line>
            </ComposedChart>
          </ChartFrame>
          <p className="mt-3 rounded-lg border border-info/40 bg-info/5 px-3 py-2 text-sm text-fg">
            {data.trendNote}
          </p>
        </Panel>
        <Panel title="Income Source Distribution" meta="Jan-Jun">
          <div className="flex flex-wrap items-center gap-5">
            <Donut
              slices={data.distribution.map((d) => ({
                key: d.id,
                label: d.label,
                value: d.amount.amountMinor,
                color: DIST_COLOR[d.id] ?? "var(--neutral)",
              }))}
              center={
                <span>
                  <span className="num block text-lg font-semibold text-fg">
                    {formatMoney(data.distributionTotal, { scale: "lakh" })}
                  </span>
                  <span className="text-xs text-muted">external credits</span>
                </span>
              }
              summary={data.distribution.map((d) => `${d.label} ${formatPercent(d.share)}`).join(", ")}
              size={170}
            />
            <ul className="min-w-[180px] flex-1 space-y-3">
              {data.distribution.map((d) => (
                <li key={d.id}>
                  <p className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-fg">
                      <span
                        aria-hidden
                        className="size-2.5 rounded-sm"
                        style={{ background: DIST_COLOR[d.id] }}
                      />
                      {d.label}
                    </span>
                    <span className="num text-fg">{formatPercent(d.share)}</span>
                  </p>
                  <p className="num text-[11px] text-subtle">
                    {formatMoney(d.amount)} · {d.nature}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-4 text-xs text-subtle">{data.notObserved}</p>
        </Panel>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title="Salary Pattern Analysis" meta={data.salary.rule}>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {data.salary.calendar.map((c, i) => (
              <li
                key={c.month}
                className={cn(
                  "rounded-lg border bg-surface-2 p-2.5",
                  c.status === "delayed" ? "border-warning/60" : "border-border",
                )}
              >
                <p className="flex items-center justify-between text-sm text-fg">
                  {c.month}
                  <span
                    className={cn(
                      "num text-[11px]",
                      c.status === "delayed" ? "text-warning" : "text-positive",
                    )}
                  >
                    {c.status === "delayed" ? `+${c.delayDays}d` : "on time"}
                  </span>
                </p>
                <div aria-hidden className="my-2 flex gap-0.5">
                  {Array.from({ length: 6 }, (_, j) => (
                    <span
                      key={j}
                      className={cn(
                        "h-1.5 flex-1 rounded-sm",
                        j === Math.min(5, Math.floor(((c.day ?? 1) - 1) / 1.2))
                          ? c.status === "delayed"
                            ? "bg-warning"
                            : "bg-lime"
                          : "bg-surface-3",
                      )}
                    />
                  ))}
                </div>
                <p className="num text-sm font-semibold text-fg">{formatMoney(c.amount)}</p>
                <p className="num text-[11px] text-subtle">credited day {c.day ?? "—"}</p>
                <span className="sr-only">{i}</span>
              </li>
            ))}
          </ol>
          <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
            {data.salary.facts.map((f) => (
              <div
                key={f.label}
                className="flex justify-between gap-3 border-b border-border/60 py-2 text-sm"
              >
                <dt className="text-muted">{f.label}</dt>
                <dd
                  className={cn(
                    "num text-right",
                    f.tone === "positive"
                      ? "text-positive"
                      : f.tone === "warning"
                        ? "text-warning"
                        : "text-fg",
                  )}
                >
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Income Stability Indicator" meta={data.stability.model}>
          <div className="flex items-start gap-4">
            <span className="num text-5xl font-bold text-positive">{data.stability.score}</span>
            <span>
              <span className="block text-lg font-semibold text-positive">{data.stability.label}</span>
              <span className="block text-xs text-subtle">{data.stability.note}</span>
            </span>
          </div>
          <ul className="mt-4 space-y-2">
            {data.stability.items.map((i) => (
              <li key={i.label} className="grid grid-cols-[1fr_auto_80px] items-center gap-3 text-sm">
                <span className="text-fg">{i.label}</span>
                <span className="num text-xs text-muted">{i.value}</span>
                <Meter value={i.meter} tone={i.tone} label={i.label} />
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg border border-magenta/40 bg-magenta/5 px-3 py-2 text-sm text-fg">
            <Chip tone="magenta" variant="outline" mono size="xs" className="mr-1.5">
              AI
            </Chip>
            {data.stability.ai}
          </p>
          <span className={cn("sr-only", TONE_TEXT.positive)}>{toMajor(data.kpis.avgIncome)}</span>
        </Panel>
      </div>
    </div>
  );
}
