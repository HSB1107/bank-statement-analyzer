"use client";

import Link from "next/link";
import { useState } from "react";
import { ChartLegend } from "@/shared/charts/chart-frame";
import { cn } from "@/shared/lib/cn";
import { formatDayMonth } from "@/shared/lib/dates";
import { formatCount, formatCroreValue, formatMoney, formatPercent } from "@/shared/lib/format";
import { subtract } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { Panel, SubCard } from "@/shared/ui/panel";
import { ProvenanceTag } from "@/shared/ui/provenance-tag";
import { Table, Td, Th } from "@/shared/ui/table";
import { ToggleChips } from "@/shared/ui/toggle-chips";
import { type Tone } from "@/shared/ui/tone";
import { type FundFlow } from "../schemas/corporate";
import { FundFlowGraph, type FlowFilter } from "./fund-flow-graph";

const crore = { scale: "crore" } as const;

const FILTERS: readonly { value: FlowFilter; label: string }[] = [
  { value: "all", label: "All flows" },
  { value: "in", label: "Inflows" },
  { value: "out", label: "Outflows" },
  { value: "own", label: "Own transfers" },
  { value: "related", label: "Related party" },
  { value: "large", label: "≥ ₹1 cr only" },
];

const SEVERITY_TONE: Readonly<Record<FundFlow["signals"][number]["severity"], Tone>> = {
  critical: "negative",
  high: "warning",
  medium: "magenta",
  low: "info",
  info: "neutral",
};

export function FundFlowTab({
  data,
  links,
}: {
  data: FundFlow;
  /** Routes owned by other features, passed in by the shell (keeps features decoupled). */
  links: { transactions: string; risk: string };
}) {
  const [filter, setFilter] = useState<FlowFilter>("all");
  const [selected, setSelected] = useState(data.defaultSelection);
  const detail = data.details[selected];
  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Transaction Intelligence Graph"
          meta="H1 2026 · ₹ cr · edge ∝ value"
          actions={
            <ChartLegend
              config={{
                c: { label: "Customers", color: "var(--positive)" },
                s: { label: "Suppliers / payroll / statutory", color: "var(--negative)" },
                l: { label: "Lenders", color: "var(--magenta)" },
                o: { label: "Own accounts", color: "var(--info)" },
                f: { label: "Flagged", color: "var(--warning)" },
              }}
              dashed={["o"]}
            />
          }
        >
          <ToggleChips
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            ariaLabel="Flow filter"
            className="mb-3"
          />
          <FundFlowGraph data={data} filter={filter} selected={selected} onSelect={setSelected} />
          <p className="num mt-2 text-xs text-subtle">
            {formatCount(data.counterparties)} counterparties · {data.shown} shown · grouped below{" "}
            {formatMoney(data.groupedBelow, { ...crore, decimals: 0 })}
          </p>
        </Panel>
        <Panel
          title={<span className="label-micro">Selected node · counterparty</span>}
          highlight={detail?.badge ? "warning" : undefined}
          aria-live="polite"
        >
          {detail ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-fg">{detail.title}</h3>
                {detail.badge ? (
                  <Chip tone="warning" dot className="mt-1">
                    {detail.badge}
                  </Chip>
                ) : null}
                <p className="mt-1.5 text-xs text-subtle">{detail.subtitle}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <SubCard className="px-2.5 py-2">
                  <p className="text-[11px] text-muted">Paid out</p>
                  <p className="num text-sm font-semibold text-negative">
                    {formatMoney(detail.paidOut, crore)}
                  </p>
                </SubCard>
                <SubCard className="px-2.5 py-2">
                  <p className="text-[11px] text-muted">Received</p>
                  <p className="num text-sm font-semibold text-positive">
                    {formatMoney(detail.received, crore)}
                  </p>
                </SubCard>
                <SubCard className="px-2.5 py-2">
                  <p className="text-[11px] text-muted">Net</p>
                  <p className="num text-sm font-semibold text-fg">
                    {formatMoney(subtract(detail.received, detail.paidOut), { ...crore, sign: "always" })}
                  </p>
                </SubCard>
              </div>
              {detail.triggering.length ? (
                <div>
                  <p className="mb-2 flex items-center gap-2">
                    <span className="label-micro">Triggering transactions</span>
                    <ProvenanceTag value="FACT" />
                  </p>
                  <ul className="space-y-2">
                    {detail.triggering.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface-2 p-2.5"
                      >
                        <span className="min-w-0">
                          <span className="num block truncate text-[13px] text-fg">
                            {formatDayMonth(t.date)} · {t.narration}
                          </span>
                          <span className="num block text-[11px] text-subtle">{t.source}</span>
                        </span>
                        <span
                          className={cn(
                            "num shrink-0 text-sm font-semibold",
                            t.direction === "debit" ? "text-negative" : "text-positive",
                          )}
                        >
                          {t.direction === "debit"
                            ? `(${formatCroreValue(t.amount, 2, "none")})`
                            : formatCroreValue(t.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {detail.evidence.length ? (
                <div>
                  <p className="mb-2 flex items-center gap-2">
                    <span className="label-micro">Evidence</span>
                    <ProvenanceTag value="DERIVED" />
                  </p>
                  <ul className="space-y-1.5 text-sm text-fg">
                    {detail.evidence.map((e) => (
                      <li key={e} className="flex gap-2">
                        <span aria-hidden className="text-lime">
                          ▸
                        </span>
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {detail.ai ? (
                <div className="rounded-md border border-magenta/40 bg-magenta/6 p-3">
                  <ProvenanceTag value="AI" />
                  <p className="mt-1.5 text-sm text-fg">{detail.ai}</p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={links.transactions}>View {detail.triggering.length} transactions</Link>
                </Button>
                {detail.badge ? (
                  <Button asChild size="sm" variant="warning">
                    <Link href={links.risk}>Investigate</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Select a node in the graph to see its counterparty profile.</p>
          )}
        </Panel>
      </div>
      <Panel title="Fund-Flow Signals" meta="potential risk indicators requiring investigation">
        <Table className="text-[13px]">
          <caption className="sr-only">
            Fund-flow signals with severity, confidence and suggested action
          </caption>
          <thead>
            <tr>
              <Th>Severity</Th>
              <Th>Signal</Th>
              <Th align="right">Conf.</Th>
              <Th>Detail</Th>
              <Th>Suggested action</Th>
            </tr>
          </thead>
          <tbody>
            {data.signals.map((s) => (
              <tr key={s.title}>
                <Td>
                  <Chip tone={SEVERITY_TONE[s.severity]} variant="outline" mono size="xs">
                    {s.severity}
                  </Chip>
                </Td>
                <Td className="font-medium text-fg">{s.title}</Td>
                <Td align="right" className="num text-fg">
                  {s.confidence.toFixed(2)}
                </Td>
                <Td className="text-muted">{s.detail}</Td>
                <Td className="text-fg">→ {s.action}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel title="Top Incoming" meta="₹ cr · H1">
          <Table className="text-[13px]">
            <thead>
              <tr>
                <Th>Counterparty</Th>
                <Th>Channel</Th>
                <Th align="right">₹ cr</Th>
                <Th align="right">Share</Th>
              </tr>
            </thead>
            <tbody>
              {data.topIncoming.map((r) => (
                <tr key={r.label}>
                  <Td className="text-fg">{r.label}</Td>
                  <Td className="num text-xs text-muted">{r.channel}</Td>
                  <Td align="right" className="num font-semibold text-positive">
                    {formatCroreValue(r.amount)}
                  </Td>
                  <Td align="right" className="num text-fg">
                    {formatPercent(r.share)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
        <Panel title="Top Outgoing" meta="₹ cr · H1">
          <Table className="text-[13px]">
            <thead>
              <tr>
                <Th>Counterparty</Th>
                <Th>Pattern</Th>
                <Th align="right">₹ cr</Th>
              </tr>
            </thead>
            <tbody>
              {data.topOutgoing.map((r) => (
                <tr key={r.label}>
                  <Td className="text-fg">{r.label}</Td>
                  <Td className="num text-xs text-muted">{r.pattern}</Td>
                  <Td align="right" className="num font-semibold text-negative">
                    {formatCroreValue(r.amount)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
    </div>
  );
}
