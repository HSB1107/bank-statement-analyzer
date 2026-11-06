"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
import { formatCount, formatCroreValue, formatMoney, formatPercent } from "@/shared/lib/format";
import { Chip } from "@/shared/ui/chip";
import { KpiGrid } from "@/shared/ui/kpi-card";
import { renderKpis, type KpiDef } from "@/shared/ui/kpi-defs";
import { Panel, SubCard } from "@/shared/ui/panel";
import { Table, Td, Th } from "@/shared/ui/table";
import { TONE_BG, type Tone } from "@/shared/ui/tone";
import { type InflowAnalysis } from "../schemas/corporate";

const crore = { scale: "crore" } as const;
const cr = (m: { amountMinor: number }) => Number((m.amountMinor / 1e9).toFixed(2));

const KPIS: readonly KpiDef<InflowAnalysis>[] = [
  {
    id: "gross",
    label: "Gross credits",
    provenance: "FACT",
    value: (d) => formatMoney(d.kpis.grossCredits, crore),
    caption: () => "all 3 accounts",
  },
  {
    id: "own",
    label: "Own transfers",
    provenance: "DERIVED",
    value: (d) => formatMoney(d.kpis.ownTransfers, crore),
    caption: (d) => `excluded · ${formatCount(d.kpis.pairs)} matched pairs`,
  },
  {
    id: "loan",
    label: "Loan / OD proceeds",
    provenance: "FACT",
    value: (d) => formatMoney(d.kpis.loanProceeds, crore),
    caption: (d) => d.kpis.loanNote,
  },
  {
    id: "rp",
    label: "Related-party receipt",
    provenance: "AI",
    tone: "warning",
    accent: "warning",
    value: (d) => formatMoney(d.kpis.relatedParty, crore),
    caption: (d) => d.kpis.relatedNote,
  },
  {
    id: "proxy",
    label: "Receipts proxy",
    provenance: "DERIVED",
    tone: "positive",
    value: (d) => formatMoney(d.kpis.receiptsProxy, crore),
    caption: () => "customer collections only",
  },
  {
    id: "payers",
    label: "Payers",
    provenance: "DERIVED",
    value: (d) => String(d.kpis.payers),
    caption: (d) => `${d.kpis.recurringPayers} recurring · ${d.kpis.oneOffPayers} one-off`,
  },
];

const CONSISTENCY_TONE: Readonly<Record<InflowAnalysis["consistency"][number]["tone"], Tone>> = {
  positive: "positive",
  negative: "negative",
  warning: "warning",
  neutral: "neutral",
};

export function InflowsTab({ data }: { data: InflowAnalysis }) {
  const kpis = renderKpis(KPIS, data).map((k) =>
    k.id === "proxy" ? { ...k, highlight: "lime" as const } : k,
  );
  const trend = data.trend.map((t) => ({
    month: t.month,
    collections: cr(t.collections),
    termLoan: cr(t.termLoan),
    relatedParty: cr(t.relatedParty),
    ownTransfers: cr(t.ownTransfers),
    total: cr(t.total),
  }));
  const conc = data.trendSeries.map((p) => ({ month: p.month, top3: p.top3 * 100, leader: p.leader * 100 }));
  return (
    <div className="space-y-4">
      <KpiGrid items={kpis} className="xl:grid-cols-6 2xl:grid-cols-6" />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Business Inflow Trend"
          meta="₹ crore · monthly"
          actions={
            <ChartLegend
              config={{
                c: { label: "Customer collections", color: "var(--positive)" },
                l: { label: "Term loan proceeds", color: "var(--magenta)" },
                r: { label: "Related-party (possible)", color: "var(--warning)" },
                o: { label: "Own-account transfers", color: "var(--neutral)" },
              }}
            />
          }
        >
          <ChartFrame
            config={{
              collections: { label: "Customer collections", color: "var(--positive)" },
              termLoan: { label: "Term loan", color: "var(--magenta)" },
              relatedParty: { label: "Related party", color: "var(--warning)" },
              ownTransfers: { label: "Own transfers", color: "var(--neutral)" },
            }}
            summary={trend
              .map((t) => `${t.month}: total ₹${t.total} cr, collections ₹${t.collections} cr`)
              .join("; ")}
            height={300}
          >
            <BarChart data={trend} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={(v: number) => `${v}`} />
              <Tooltip
                cursor={{ fill: "var(--surface-3)", opacity: 0.4 }}
                content={({ payload, label }) =>
                  payload?.length ? (
                    <ChartTooltipBox
                      title={`${String(label)} · ₹ cr`}
                      rows={payload.map((p) => ({
                        label: String(p.name),
                        value: Number(p.value).toFixed(2),
                        color: String(p.color),
                      }))}
                    />
                  ) : null
                }
              />
              <Bar
                dataKey="collections"
                name="Customer collections"
                stackId="a"
                fill="var(--color-collections)"
                isAnimationActive={false}
              />
              <Bar
                dataKey="termLoan"
                name="Term loan"
                stackId="a"
                fill="var(--color-termLoan)"
                isAnimationActive={false}
              />
              <Bar
                dataKey="relatedParty"
                name="Related party"
                stackId="a"
                fill="var(--color-relatedParty)"
                isAnimationActive={false}
              />
              <Bar
                dataKey="ownTransfers"
                name="Own transfers"
                stackId="a"
                fill="var(--color-ownTransfers)"
                fillOpacity={0.45}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartFrame>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <SubCard className="py-2">
              <p className="text-[11px] text-muted">Q1 collections</p>
              <p className="num text-sm font-semibold text-fg">{formatMoney(data.quarters.q1, crore)}</p>
            </SubCard>
            <SubCard className="py-2">
              <p className="text-[11px] text-muted">Q2 collections</p>
              <p className="num text-sm font-semibold text-fg">
                {formatMoney(data.quarters.q2, crore)}{" "}
                <span className="text-negative">· {formatPercent(data.quarters.change, 1, "always")}</span>
              </p>
            </SubCard>
          </div>
        </Panel>
        <Panel title="Revenue Proxy · Methodology" meta={data.methodology.id}>
          <Table className="text-[13px]">
            <caption className="sr-only">Receipts proxy derivation in ₹ crore</caption>
            <tbody>
              {data.methodology.rows.map((r) => (
                <tr key={r.label} className={cn(r.sign === "result" && "bg-lime/8")}>
                  <Td className={cn(r.sign === "result" ? "font-semibold text-lime" : "text-fg")}>
                    {r.sign === "minus" ? "− " : r.sign === "result" ? "= " : ""}
                    {r.label}
                  </Td>
                  <Td
                    align="right"
                    className={cn(
                      "num",
                      r.sign === "result"
                        ? "font-semibold text-lime"
                        : r.sign === "minus"
                          ? "text-muted"
                          : "text-fg",
                    )}
                  >
                    {r.sign === "minus"
                      ? `(${formatCroreValue(r.amount, 2, "none")})`
                      : formatCroreValue(r.amount)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <SubCard className="py-2">
              <p className="text-[11px] text-muted">Annualised proxy</p>
              <p className="num text-sm font-semibold text-fg">
                {formatMoney(data.methodology.annualised, crore)}
              </p>
            </SubCard>
            <SubCard className="py-2">
              <p className="text-[11px] text-muted">{data.methodology.fyLabel}</p>
              <p className="num text-sm font-semibold text-fg">
                {formatMoney(data.methodology.fyRevenue, crore)}
              </p>
            </SubCard>
          </div>
          <p className="mt-3 rounded-md border border-warning/40 bg-warning/8 p-2.5 text-xs text-fg">
            Not accounting revenue. Bank receipts include GST, exclude credit sales not yet collected and any
            accounts not submitted. Use as a behavioural cross-check against financial statements.
          </p>
        </Panel>
      </div>
      <Panel
        title="Counterparty Concentration"
        meta="monthly contribution · ₹ crore · top 5 shown + rest"
        actions={
          <>
            <Chip tone="warning" variant="outline" mono size="xs">
              Top-5 {formatPercent(data.concentration.top5)}
            </Chip>
            <Chip tone="negative" variant="outline" mono size="xs">
              Top-3 {formatPercent(data.concentration.top3)}
            </Chip>
          </>
        }
      >
        <Table className="text-[13px]">
          <caption className="sr-only">
            Monthly receipts by counterparty with share and cumulative share
          </caption>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Counterparty</Th>
              {data.concentration.months.map((m) => (
                <Th key={m} align="right">
                  {m}
                </Th>
              ))}
              <Th align="right">H1 ₹ cr</Th>
              <Th align="right">Share</Th>
              <Th align="right">Cum.</Th>
            </tr>
          </thead>
          <tbody>
            {data.concentration.rows.map((r) => (
              <tr key={r.label}>
                <Td className="num text-subtle">{r.rank ?? "–"}</Td>
                <Td className="text-fg">
                  {r.label}
                  {r.fx ? <span className="ml-1.5 text-xs text-info">({r.fx})</span> : null}
                </Td>
                {r.monthly.map((m, i) => (
                  <Td key={i} align="right" className="num text-muted">
                    {m.amountMinor === 0 ? "–" : formatCroreValue(m, 1)}
                  </Td>
                ))}
                <Td align="right" className="num font-semibold text-fg">
                  {formatCroreValue(r.total)}
                </Td>
                <Td align="right" className="num text-fg">
                  {formatPercent(r.share)}
                </Td>
                <Td
                  align="right"
                  className={cn(
                    "num",
                    r.cumulative > 0.6 && r.rank !== null ? "text-warning" : "text-subtle",
                  )}
                >
                  {formatPercent(r.cumulative)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <p className="rounded-md border border-info/30 bg-info/6 p-2.5 text-xs text-fg">{data.fxNote}</p>
          <p className="rounded-md border border-border bg-surface-2 p-2.5 text-xs text-fg">
            {data.resolutionNote}
          </p>
        </div>
      </Panel>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel
          title="Concentration Trend"
          meta="% of external inflows"
          actions={
            <ChartLegend
              config={{
                t: { label: "Top-3 share", color: "var(--warning)" },
                l: { label: "Largest customer", color: "var(--lime)" },
                a: {
                  label: `alert ${formatPercent(data.alertThreshold, 0)} · ${data.alertId}`,
                  color: "var(--negative)",
                },
              }}
              dashed={["a"]}
            />
          }
        >
          <ChartFrame
            config={{
              top3: { label: "Top-3", color: "var(--warning)" },
              leader: { label: "Largest", color: "var(--lime)" },
            }}
            summary={conc
              .map((c) => `${c.month}: top-3 ${c.top3.toFixed(0)}%, largest ${c.leader.toFixed(0)}%`)
              .join("; ")}
            height={260}
          >
            <LineChart data={conc} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip
                content={({ payload, label }) =>
                  payload?.length ? (
                    <ChartTooltipBox
                      title={String(label)}
                      rows={payload.map((p) => ({
                        label: String(p.name),
                        value: `${Number(p.value).toFixed(1)}%`,
                        color: String(p.color),
                      }))}
                    />
                  ) : null
                }
              />
              <ReferenceLine
                y={data.alertThreshold * 100}
                stroke="var(--negative)"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
              />
              <Line
                dataKey="top3"
                name="Top-3 share"
                stroke="var(--color-top3)"
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
              <Line
                dataKey="leader"
                name="Largest customer"
                stroke="var(--color-leader)"
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartFrame>
        </Panel>
        <Panel title="Collection Consistency">
          <ul className="space-y-3">
            {data.consistency.map((c) => (
              <li key={c.label} className="flex gap-3 border-b border-border/60 pb-2.5 last:border-0">
                <span
                  aria-hidden
                  className={cn("mt-1.5 size-2 shrink-0 rounded-full", TONE_BG[CONSISTENCY_TONE[c.tone]])}
                />
                <span>
                  <span className="block text-sm font-medium text-fg">
                    <span className="sr-only">{c.tone === "neutral" ? "Note" : c.tone}: </span>
                    {c.label}
                  </span>
                  <span className="block text-xs text-muted">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
