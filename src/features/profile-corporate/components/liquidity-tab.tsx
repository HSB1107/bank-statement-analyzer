"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_PROPS, ChartFrame, ChartTooltipBox, GRID_PROPS } from "@/shared/charts/chart-frame";
import { cn } from "@/shared/lib/cn";
import { formatDayMonth, monthShort } from "@/shared/lib/dates";
import {
  formatAvailability,
  formatCroreValue,
  formatMoney,
  formatPercent,
  NA_SHORT,
  NOT_AVAILABLE_LABEL,
} from "@/shared/lib/format";
import { KpiGrid } from "@/shared/ui/kpi-card";
import { renderKpis, type KpiDef } from "@/shared/ui/kpi-defs";
import { Panel, SubCard } from "@/shared/ui/panel";
import { Table, Td, Th } from "@/shared/ui/table";
import { TONE_BG, TONE_VAR } from "@/shared/ui/tone";
import { type CorporateLiquidity } from "../schemas/corporate";

const crore = { scale: "crore" } as const;
const cr = (m: { amountMinor: number }) => m.amountMinor / 1e9;
const dayLabel = (d: string) => `${d.slice(8)}-${monthShort(Number(d.slice(5, 7)) - 1)}`;

const KPIS: readonly KpiDef<CorporateLiquidity>[] = [
  {
    id: "avg",
    label: "Avg bank balance",
    provenance: "DERIVED",
    value: (d) => formatMoney(d.kpis.avgBank, crore),
    caption: () => "ICICI + HDFC · daily",
  },
  {
    id: "min",
    label: "Minimum",
    provenance: "FACT",
    value: (d) => formatMoney(d.kpis.min, crore),
    caption: (d) => `${formatDayMonth(d.kpis.minDate)} · after payroll`,
  },
  {
    id: "max",
    label: "Maximum",
    provenance: "FACT",
    value: (d) => formatMoney(d.kpis.max, crore),
    caption: (d) => `${formatDayMonth(d.kpis.maxDate)} · TL proceeds`,
  },
  {
    id: "close",
    label: "Closing",
    provenance: "FACT",
    value: (d) => formatMoney(d.kpis.closing, crore),
    caption: () => "30-Jun · current a/cs",
  },
  {
    id: "low",
    label: "Low-balance days",
    provenance: "DERIVED",
    accent: "warning",
    value: (d) => String(d.kpis.lowDays),
    caption: (d) =>
      `< ${formatMoney(d.kpis.lowThreshold, crore)}${d.kpis.lowAllInMonth ? ` · all in ${d.kpis.lowAllInMonth}` : ""}`,
  },
  {
    id: "neg",
    label: "Negative instances",
    provenance: "FACT",
    value: (d) => String(d.kpis.negatives),
    caption: () => "current accounts",
  },
  {
    id: "od",
    label: "OD util. (Jun)",
    provenance: "DERIVED",
    accent: "warning",
    tone: "warning",
    value: (d) => formatAvailability(d.kpis.odJune, (v) => formatPercent(v)),
    caption: (d) =>
      `${formatAvailability(d.kpis.odJuneDrawn, (m) => formatMoney(m, crore))} of ${formatAvailability(d.kpis.odLimit, (m) => formatMoney(m, crore), "unverified limit")}`,
  },
  {
    id: "net",
    label: "Net cash (H1)",
    provenance: "DERIVED",
    accent: "warning",
    tone: (d) => (d.kpis.netCash.amountMinor < 0 ? "negative" : "positive"),
    value: (d) => formatMoney(d.kpis.netCash, { ...crore, sign: "always" }),
    caption: (d) => `${d.kpis.negativeNetMonths} of 6 months negative`,
  },
];

interface WaterfallBar {
  label: string;
  range: [number, number];
  value: number;
  kind: "total" | "in" | "out";
}

/** Floating bars: each step starts where the previous one ended. */
function waterfallBars(steps: CorporateLiquidity["waterfall"]): WaterfallBar[] {
  let level = 0;
  return steps.map((s) => {
    const v = cr(s.amount);
    if (s.kind === "total") {
      level = v;
      return { label: s.label, range: [0, v], value: v, kind: s.kind };
    }
    const start = level;
    level = s.kind === "in" ? level + v : level - v;
    return {
      label: s.label,
      range: [Math.min(start, level), Math.max(start, level)],
      value: v,
      kind: s.kind,
    };
  });
}

const WF_COLOR: Readonly<Record<WaterfallBar["kind"], string>> = {
  total: TONE_VAR.info,
  in: TONE_VAR.positive,
  out: TONE_VAR.negative,
};

export function CorporateLiquidityTab({ data }: { data: CorporateLiquidity }) {
  const od = data.od.series.map((p) => ({
    date: p.date,
    util: p.utilisation.status === "available" ? p.utilisation.value * 100 : null,
  }));
  const missing = data.od.series.filter((p) => p.utilisation.status === "not_available");
  const firstMissing = missing[0]?.date;
  const lastMissing = missing.at(-1)?.date;
  const wf = waterfallBars(data.waterfall);
  const r = data.runway;
  return (
    <div className="space-y-4">
      <KpiGrid items={renderKpis(KPIS, data)} className="xl:grid-cols-4 2xl:grid-cols-8" compact />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel
          title="OD / CC Utilisation"
          meta={`${data.od.account} · daily${data.od.limitSource ? ` · against verified sanctioned limit ${formatAvailability(data.kpis.odLimit, (m) => formatMoney(m, crore))} (${data.od.limitSource})` : ""}`}
        >
          <ChartFrame
            config={{ util: { label: "Utilisation", color: "var(--warning)" } }}
            summary={`Daily OD utilisation; peak ${formatPercent(data.od.peak.utilisation, 0)} on ${formatDayMonth(data.od.peak.date)}; April ${NOT_AVAILABLE_LABEL}.`}
            height={300}
          >
            <AreaChart data={od} margin={{ top: 20, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="odfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--warning)" stopOpacity={0.03} />
                </linearGradient>
                <pattern
                  id="na-hatch"
                  width="6"
                  height="6"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="6"
                    stroke="var(--subtle)"
                    strokeWidth="1.5"
                    strokeOpacity="0.5"
                  />
                </pattern>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis
                dataKey="date"
                {...AXIS_PROPS}
                interval={0}
                tickFormatter={(d: string) =>
                  d.endsWith("-15") ? monthShort(Number(d.slice(5, 7)) - 1) : ""
                }
              />
              <YAxis
                {...AXIS_PROPS}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <ReferenceArea y1={data.od.stress * 100} y2={100} fill="var(--negative)" fillOpacity={0.08} />
              <ReferenceLine
                y={data.od.stress * 100}
                stroke="var(--negative)"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: `stress zone > ${formatPercent(data.od.stress, 0)}`,
                  position: "insideTopRight",
                  fill: "var(--negative)",
                  fontSize: 10,
                }}
              />
              {firstMissing && lastMissing ? (
                <ReferenceArea
                  x1={firstMissing}
                  x2={lastMissing}
                  fill="url(#na-hatch)"
                  label={{
                    value: `${NOT_AVAILABLE_LABEL} · SBI Apr statement missing`,
                    position: "center",
                    fill: "var(--muted)",
                    fontSize: 11,
                  }}
                />
              ) : null}
              <Tooltip
                content={({ payload, label }) =>
                  payload?.length ? (
                    <ChartTooltipBox
                      title={dayLabel(String(label))}
                      rows={[
                        {
                          label: "Utilisation",
                          value:
                            payload[0]?.value == null
                              ? NOT_AVAILABLE_LABEL
                              : `${Number(payload[0].value).toFixed(1)}%`,
                          color: "var(--warning)",
                        },
                      ]}
                    />
                  ) : null
                }
              />
              <Area
                dataKey="util"
                stroke="var(--warning)"
                strokeWidth={1.75}
                fill="url(#odfill)"
                type="stepAfter"
                connectNulls={false}
                isAnimationActive={false}
              />
              <ReferenceDot
                x={data.od.peak.date}
                y={data.od.peak.utilisation * 100}
                r={4}
                fill="var(--negative)"
                stroke="none"
                label={{
                  value: `peak ${formatPercent(data.od.peak.utilisation, 0)} · ${formatDayMonth(data.od.peak.date)}`,
                  position: "top",
                  fill: "var(--negative)",
                  fontSize: 10,
                }}
              />
            </AreaChart>
          </ChartFrame>
          <p className="mt-2 text-xs text-subtle">{data.od.missingNote}</p>
        </Panel>
        <Panel title="Cash Runway" meta="BSA-MET-CR-02 · estimate">
          <div className="grid grid-cols-2 gap-3">
            <SubCard>
              <p className="text-[11px] text-muted">Net-burn runway</p>
              <p className="num text-2xl font-semibold text-warning">
                {r.months.toFixed(1)} <span className="text-sm font-normal text-muted">mo</span>
              </p>
              <p className="text-[11px] text-subtle">if Q2 net operating trend continues</p>
            </SubCard>
            <SubCard>
              <p className="text-[11px] text-muted">Gross cover</p>
              <p className="num text-2xl font-semibold text-negative">
                {Math.round(r.coverDays)} <span className="text-sm font-normal text-muted">days</span>
              </p>
              <p className="text-[11px] text-subtle">operating outflows with zero receipts</p>
            </SubCard>
          </div>
          <p className="label-micro mt-4 mb-2">Assumptions</p>
          <dl className="space-y-2 text-sm">
            {[
              [
                "Available liquidity",
                `${formatMoney(r.available, crore)} (cash ${formatCroreValue(r.cash)} + undrawn OD ${formatCroreValue(r.undrawn)})`,
              ],
              ["Avg operating outflow", `${formatMoney(r.avgOutflow, crore)} / mo (H1 average)`],
              ["Net operating burn", `${formatMoney(r.burn, crore)} / mo (Q2 average, Apr–Jun)`],
              ["Excludes", "new borrowing, asset sales, delayed payables"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-border/60 pb-1.5">
                <dt className="text-muted">{k}</dt>
                <dd className="num text-right text-fg">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-subtle">
            Runway is a behavioural estimate from bank data, not a forecast.
          </p>
        </Panel>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Cash-Flow Waterfall · H1 2026"
          meta="net liquidity position (bank balances − OD drawn), ₹ crore"
        >
          <ChartFrame
            config={{ range: { label: "Movement", color: "var(--info)" } }}
            summary={wf
              .map(
                (w) =>
                  `${w.label} ${w.kind === "out" ? "−" : w.kind === "in" ? "+" : ""}${w.value.toFixed(2)}`,
              )
              .join("; ")}
            height={320}
          >
            <BarChart data={wf} margin={{ top: 16, right: 8, left: -8, bottom: 40 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} interval={0} angle={-35} textAnchor="end" height={50} />
              <YAxis {...AXIS_PROPS} />
              <ReferenceLine y={0} stroke="var(--border-strong)" />
              <Tooltip
                cursor={{ fill: "var(--surface-3)", opacity: 0.4 }}
                content={({ label }) => {
                  const w = wf.find((x) => x.label === label);
                  return w ? (
                    <ChartTooltipBox
                      title={w.label}
                      rows={[
                        {
                          label: w.kind === "total" ? "Position" : w.kind === "in" ? "Inflow" : "Outflow",
                          value: `₹${w.value.toFixed(2)} cr`,
                          color: WF_COLOR[w.kind],
                        },
                      ]}
                    />
                  ) : null;
                }}
              />
              <Bar dataKey="range" isAnimationActive={false} radius={[2, 2, 2, 2]}>
                {wf.map((w) => (
                  <Cell key={w.label} fill={WF_COLOR[w.kind]} fillOpacity={w.kind === "total" ? 0.9 : 0.75} />
                ))}
              </Bar>
            </BarChart>
          </ChartFrame>
        </Panel>
        <Panel title="Liquidity Stress Indicators" meta={`${data.stress.length} checks`}>
          <ul className="space-y-3">
            {data.stress.map((s) => (
              <li key={s.label} className="flex gap-3 border-b border-border/60 pb-2.5 last:border-0">
                <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", TONE_BG[s.tone])} />
                <span>
                  <span className="block text-sm font-medium text-fg">
                    <span className="sr-only">{s.tone === "negative" ? "Severe" : "Warning"}: </span>
                    {s.label}
                  </span>
                  <span className="block text-xs text-muted">{s.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel
        title="Monthly Cash Flow"
        meta="bank-derived buckets · internal transfers excluded · not an accounting cash-flow statement"
      >
        <Table className="text-[13px]">
          <caption className="sr-only">Monthly cash flow by bucket in ₹ crore</caption>
          <thead>
            <tr>
              <Th>₹ cr</Th>
              {data.cashflow.months.map((m) => (
                <Th key={m} align="right">
                  {m}
                </Th>
              ))}
              <Th align="right">H1</Th>
            </tr>
          </thead>
          <tbody>
            {data.cashflow.rows.map((row) => (
              <tr key={row.label} className={cn(row.emphasis && "bg-surface-2/60")}>
                <Td className={cn(row.emphasis ? "font-semibold text-fg" : "text-muted")}>{row.label}</Td>
                {row.values.map((v, i) => (
                  <Td
                    key={i}
                    align="right"
                    className={cn(
                      "num",
                      row.emphasis ? (v.amountMinor < 0 ? "text-negative" : "text-positive") : "text-fg",
                    )}
                  >
                    {v.amountMinor === 0 ? "–" : formatCroreValue(v)}
                  </Td>
                ))}
                <Td
                  align="right"
                  className={cn(
                    "num font-semibold",
                    row.emphasis
                      ? row.total.amountMinor < 0
                        ? "text-negative"
                        : "text-positive"
                      : "text-fg",
                  )}
                >
                  {formatCroreValue(row.total)}
                </Td>
              </tr>
            ))}
            <tr>
              <Td className="text-muted">OD month-end util.</Td>
              {data.cashflow.odMonthEnd.map((u, i) => (
                <Td
                  key={i}
                  align="right"
                  className={cn("num", u.status === "available" ? "text-warning" : "text-subtle italic")}
                  title={u.status === "not_available" ? u.reason : undefined}
                >
                  {formatAvailability(u, (v) => formatPercent(v))}
                </Td>
              ))}
              <Td align="right" className="num text-subtle">
                –
              </Td>
            </tr>
          </tbody>
        </Table>
        <p className="mt-2 text-xs text-subtle">
          {data.cashflow.note} {NA_SHORT} = {NOT_AVAILABLE_LABEL}; never shown as zero.
        </p>
      </Panel>
    </div>
  );
}
