"use client";

import { Check, X } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, LabelList, Line, ReferenceLine, XAxis, YAxis } from "recharts";
import { AXIS_PROPS, ChartFrame, GRID_PROPS } from "@/shared/charts/chart-frame";
import { assertNever } from "@/shared/lib/assert";
import { cn } from "@/shared/lib/cn";
import { formatDayMonth } from "@/shared/lib/dates";
import { formatMoney, formatPercent } from "@/shared/lib/format";
import { Chip } from "@/shared/ui/chip";
import { Panel, SubCard } from "@/shared/ui/panel";
import { ProvenanceTag } from "@/shared/ui/provenance-tag";
import { Table, Td, Th } from "@/shared/ui/table";
import { TONE_TEXT } from "@/shared/ui/tone";
import { type ObligationsAnalysis } from "../schemas/individual";

type Cell = ObligationsAnalysis["calendar"][number]["cells"][number];

function CalendarCell({ cell, card }: { cell: Cell; card: boolean }) {
  switch (cell.kind) {
    case "none":
      return (
        <span className="block rounded border border-dashed border-border-strong py-1 text-center text-xs text-subtle">
          –
        </span>
      );
    case "paid":
      return (
        <span className="num flex items-center justify-center gap-1 rounded border border-positive/40 bg-positive/10 py-1 text-xs text-positive">
          <Check className="size-3" aria-hidden /> {String(cell.day).padStart(2, "0")}
          {card && cell.full ? " full" : ""}
        </span>
      );
    case "returned_then_paid":
      return (
        <span className="num flex items-center justify-center gap-1 rounded border border-negative/50 bg-negative/15 py-1 text-xs text-negative">
          <X className="size-3" aria-hidden /> {String(cell.returnedDay).padStart(2, "0")} →{" "}
          <Check className="size-3" aria-hidden /> {String(cell.paidDay).padStart(2, "0")}
        </span>
      );
    default:
      return assertNever(cell, "calendar cell");
  }
}

const TREATMENT_TONE = { FOIR: "lime", Fixed: "info", Excluded: "neutral" } as const;

export function ObligationsTab({ data }: { data: ObligationsAnalysis }) {
  const f = data.foir;
  const trend = data.trend.map((t) => ({ month: t.month, foir: Number((t.foir * 100).toFixed(1)) }));
  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel
          title={`FOIR · ${f.month}`}
          meta="FOIR = recurring debt obligations ÷ monthly income × 100"
          highlight="lime"
        >
          <div className="flex flex-wrap items-end gap-4">
            <span className="num text-6xl font-bold text-lime">
              {(f.value * 100).toFixed(1)}
              <span className="text-2xl">%</span>
            </span>
            <span className="pb-2">
              <Chip tone={f.within ? "positive" : "negative"} variant="soft" dot>
                {f.within ? "Within policy" : "Above policy"}
              </Chip>
              <span className="mt-1 block text-xs text-subtle">
                threshold {formatPercent(f.policy, 0)} · {f.policyId} · was {formatPercent(f.first)} in Jan
              </span>
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SubCard>
              <p className="label-micro">Numerator · obligations</p>
              <p className="num mt-1 text-2xl font-semibold text-fg">{formatMoney(f.numerator)}</p>
              <p className="text-xs text-muted">{f.numeratorParts}</p>
              <Chip tone="info" variant="outline" className="mt-2">
                INFERRED from transactions
              </Chip>
            </SubCard>
            <SubCard>
              <p className="label-micro">Denominator · income</p>
              <p className="num mt-1 text-2xl font-semibold text-fg">{formatMoney(f.denominator)}</p>
              <p className="text-xs text-muted">{f.denominatorParts}</p>
              <span className="mt-2 flex flex-wrap gap-1.5">
                <Chip tone="info" variant="outline">
                  INFERRED
                </Chip>
                <Chip tone="neutral" variant="outline">
                  salary slip not verified
                </Chip>
              </span>
            </SubCard>
          </div>
          <p className="mt-4 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-fg">
            <strong className="text-warning">Not double-counted:</strong> credit card settlements (avg{" "}
            {formatMoney(f.cardAvg)}) are spend paid in full, not a separate loan, so they are excluded from
            FOIR. Rent is shown separately: fixed-obligation ratio incl. rent ={" "}
            <strong className="num">{formatPercent(f.fixedRatio)}</strong>.
          </p>
        </Panel>
        <Panel title="FOIR Trend" meta="monthly · Jan-Jun 2026">
          <ChartFrame
            config={{ foir: { label: "FOIR %", color: "var(--lime)" } }}
            summary={`FOIR by month: ${trend.map((t) => `${t.month} ${t.foir}%`).join(", ")}; policy threshold 50%`}
            height={200}
          >
            <ComposedChart data={trend} margin={{ top: 20, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis
                {...AXIS_PROPS}
                domain={[0, 60]}
                ticks={[0, 15, 30, 45, 60]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <ReferenceLine
                y={f.policy * 100}
                stroke="var(--negative)"
                strokeDasharray="5 4"
                label={{
                  value: `policy threshold ${formatPercent(f.policy, 0)}`,
                  position: "insideTopRight",
                  fill: "var(--negative)",
                  fontSize: 11,
                }}
              />
              <Area
                dataKey="foir"
                stroke="none"
                fill="var(--lime)"
                fillOpacity={0.08}
                isAnimationActive={false}
              />
              <Line
                dataKey="foir"
                stroke="var(--lime)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--surface)" }}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="foir"
                  position="top"
                  fill="var(--lime)"
                  fontSize={11}
                  formatter={(v: unknown) => `${String(v)}%`}
                />
              </Line>
            </ComposedChart>
          </ChartFrame>
          <Table className="mt-2 text-[13px]">
            <thead>
              <tr>
                <Th />
                {data.trend.map((t) => (
                  <Th key={t.month} align="right">
                    {t.month}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td className="text-fg">EMI obligations</Td>
                {data.trend.map((t) => (
                  <Td key={t.month} align="right" className="num text-fg">
                    {formatMoney(t.emi)}
                  </Td>
                ))}
              </tr>
              <tr>
                <Td className="text-fg">Income</Td>
                {data.trend.map((t) => (
                  <Td key={t.month} align="right" className="num text-fg">
                    {formatMoney(t.income)}
                  </Td>
                ))}
              </tr>
            </tbody>
          </Table>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <SubCard>
              <p className="text-xs text-muted">Headroom to policy</p>
              <p className="num font-semibold text-positive">{formatMoney(data.headroom)} / month</p>
            </SubCard>
            <SubCard>
              <p className="text-xs text-muted">Max new EMI @ {formatPercent(f.policy, 0)}</p>
              <p className="num font-semibold text-positive">{formatMoney(data.maxNewEmi)}</p>
            </SubCard>
            <SubCard>
              <p className="text-xs text-muted">Committed incl. rent</p>
              <p className="num font-semibold text-fg">{formatMoney(data.committedInclRent)} / month</p>
            </SubCard>
          </div>
          <p className="mt-2 text-xs text-subtle">
            Headroom is arithmetic only ({formatPercent(f.policy, 0)} × {formatMoney(f.denominator)} −{" "}
            {formatMoney(f.numerator)}). Affordability decision rests with the underwriter.
          </p>
        </Panel>
      </div>
      <Panel title="Recurring Payment Detection" meta={data.recurringRule}>
        <Table>
          <thead>
            <tr>
              <Th>Identified obligation</Th>
              <Th>Counterparty / lender</Th>
              <Th align="right">Avg monthly</Th>
              <Th>Frequency</Th>
              <Th>Last payment</Th>
              <Th>Regularity</Th>
              <Th align="right">Confidence</Th>
              <Th>In FOIR?</Th>
            </tr>
          </thead>
          <tbody>
            {data.recurring.map((r) => (
              <tr key={r.label}>
                <Td>
                  <span className="font-semibold text-fg">{r.label}</span>
                  <span className="block text-[11px] text-subtle">{r.sublabel}</span>
                </Td>
                <Td className="text-fg">{r.counterparty}</Td>
                <Td align="right" className="num text-fg">
                  {formatMoney(r.avgMonthly)}
                </Td>
                <Td className="text-muted">{r.frequency}</Td>
                <Td className="num text-muted">
                  {r.lastPayment ? `${formatDayMonth(r.lastPayment)}-26` : "—"}
                </Td>
                <Td className={TONE_TEXT[r.regularityTone]}>{r.regularity}</Td>
                <Td align="right" className="num text-positive">
                  {r.confidence.toFixed(2)}
                </Td>
                <Td>
                  <Chip tone={TREATMENT_TONE[r.treatment]} variant="outline">
                    {r.treatment}
                  </Chip>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Debt Servicing Behaviour" meta={`${data.servicing.length} checks`}>
          <ul className="divide-y divide-border/60">
            {data.servicing.map((s) => (
              <li
                key={s.label}
                className="grid grid-cols-[1fr_40px_2fr_auto] items-center gap-3 py-2.5 text-sm"
              >
                <span className="text-fg">{s.label}</span>
                <span
                  className={cn(
                    "num text-center font-semibold",
                    s.count === 0
                      ? "text-positive"
                      : s.label.startsWith("Failed")
                        ? "text-negative"
                        : "text-warning",
                  )}
                >
                  {s.count}
                </span>
                <span className="text-muted">{s.detail}</span>
                <ProvenanceTag value={s.provenance} />
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg border border-magenta/40 bg-magenta/5 px-3 py-2 text-sm text-fg">
            <Chip tone="magenta" variant="outline" mono size="xs" className="mr-1.5">
              AI
            </Chip>
            {data.servicingAi}
          </p>
        </Panel>
        <Panel title="Repayment Calendar" meta="day of month paid">
          <table className="w-full border-separate border-spacing-1.5 text-sm">
            <caption className="sr-only">Repayment calendar by month</caption>
            <thead>
              <tr>
                <th scope="col" className="sr-only">
                  Month
                </th>
                {data.calendarColumns.map((c) => (
                  <th key={c} scope="col" className="label-micro font-normal">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.calendar.map((row) => (
                <tr key={row.month}>
                  <th scope="row" className="pr-2 text-left font-normal text-muted">
                    {row.month}
                  </th>
                  {row.cells.map((c, i) => (
                    <td key={i}>
                      <CalendarCell cell={c} card={i === 2} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-subtle">{data.nextDue}</p>
        </Panel>
      </div>
    </div>
  );
}
