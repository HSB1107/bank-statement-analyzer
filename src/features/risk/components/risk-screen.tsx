"use client";

import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { formatAvailability, formatCount, formatPercent, formatScore01 } from "@/shared/lib/format";
import { type CaseId, type SignalId } from "@/shared/data/schemas/ids";
import {
  SIGNAL_STATUS_LABELS,
  SignalStatusSchema,
  type Severity,
  type SignalStatus,
} from "@/shared/data/schemas/signal";
import { Chip } from "@/shared/ui/chip";
import { Panel, SubCard } from "@/shared/ui/panel";
import { FilterSelect } from "@/shared/ui/select";
import { ErrorState, PanelSkeleton } from "@/shared/ui/states";
import { Table, Td, Th } from "@/shared/ui/table";
import { TONE_TEXT, TONE_VAR } from "@/shared/ui/tone";
import { useRiskWorkspace, useSignalAction } from "../hooks/use-risk";
import { type RiskWorkspace } from "../schemas/risk";
import { ExplainPanel } from "./explain-panel";
import { SEVERITY_TONE, STATUS_TONE } from "./tones";

type CategoryFilter = "all" | RiskWorkspace["signals"][number]["reportingCategory"];
type StatusFilter = "all" | SignalStatus;

/** Literal class names so Tailwind generates them. */
const SEVERITY_LEFT_BORDER: Readonly<Record<Severity, string>> = {
  critical: "border-l-negative",
  high: "border-l-warning",
  medium: "border-l-magenta",
  low: "border-l-info",
};

const DOT_SIZE: Readonly<Record<Severity, number>> = { critical: 16, high: 12, medium: 10, low: 7 };

export function RiskScreen({ caseId }: { caseId: CaseId }) {
  const q = useRiskWorkspace(caseId);
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data) return <PanelSkeleton rows={10} />;
  return <RiskWorkspaceView data={q.data} caseId={caseId} />;
}

function RiskWorkspaceView({ data, caseId }: { data: RiskWorkspace; caseId: CaseId }) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<SignalId | null>(data.signals[0]?.id ?? null);
  const action = useSignalAction(caseId);

  const rows = data.signals.filter(
    (s) =>
      (category === "all" || s.reportingCategory === category) && (status === "all" || s.status === status),
  );
  const selected = data.signals.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.severity.map((s) => (
          <div
            key={s.severity}
            className={cn(
              "rounded-[var(--radius-card)] border border-l-4 border-border bg-surface p-4 shadow-card",
              SEVERITY_LEFT_BORDER[s.severity],
            )}
          >
            <p className="label-micro">{s.severity}</p>
            <p className={cn("num mt-1 text-3xl font-semibold", TONE_TEXT[SEVERITY_TONE[s.severity]])}>
              {s.count}
            </p>
            <p className="text-xs text-muted">{s.note}</p>
          </div>
        ))}
      </div>

      <Panel title={<span className="label-micro">Confidence framework · six separate dimensions</span>}>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {data.confidence.map((c) => (
            <li key={c.id}>
              <SubCard className="h-full">
                <p className="text-[12px] text-muted">{c.label}</p>
                <p
                  className={cn(
                    "num mt-1 text-xl font-semibold",
                    c.value.status === "available" ? TONE_TEXT[c.tone] : "text-subtle",
                  )}
                  title={c.value.status === "not_available" ? c.value.reason : undefined}
                >
                  {formatAvailability(c.value, (v) =>
                    c.format === "percent" ? formatPercent(v) : formatScore01(v),
                  )}
                </p>
                <p className="text-[11px] text-subtle">{c.note}</p>
              </SubCard>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4">
        <Panel
          title="Ranked Risk Signals"
          meta={`${data.signals.length} signals · ${data.rulesEvaluated} rules evaluated · sorted by severity × financial impact`}
          actions={
            <>
              <FilterSelect
                label="Category"
                size="sm"
                value={category}
                options={[
                  { value: "all", label: "All" },
                  ...data.categories
                    .filter((c) => c.signals > 0)
                    .map((c) => ({ value: c.label, label: c.label })),
                ]}
                onValueChange={setCategory}
              />
              <FilterSelect
                label="Status"
                size="sm"
                value={status}
                options={[
                  { value: "all", label: "All" },
                  ...SignalStatusSchema.options.map((s) => ({ value: s, label: SIGNAL_STATUS_LABELS[s] })),
                ]}
                onValueChange={setStatus}
              />
            </>
          }
        >
          <Table className="text-[13px]">
            <caption className="sr-only">
              Risk signals ranked by severity. Select a signal to see its explainability path and actions.
            </caption>
            <thead>
              <tr>
                <Th>Signal</Th>
                <Th>Severity</Th>
                <Th>Description</Th>
                <Th>Period</Th>
                <Th align="right">Evidence</Th>
                <Th>Financial impact</Th>
                <Th align="right">AI conf.</Th>
                <Th>Detection</Th>
                <Th>Status</Th>
                <Th>Owner</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const active = s.id === selectedId;
                return (
                  <tr
                    key={s.id}
                    aria-selected={active}
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-surface-2/70",
                      active && "bg-lime/6",
                    )}
                  >
                    <Td className={cn("border-l-2", active ? "border-l-lime" : "border-l-transparent")}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(s.id);
                        }}
                        aria-pressed={active}
                        aria-label={`${s.id} ${s.title}, select to view explainability`}
                        className="num rounded text-fg underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-info"
                      >
                        {s.id}
                      </button>
                    </Td>
                    <Td>
                      <Chip tone={SEVERITY_TONE[s.severity]} variant="outline" mono size="xs">
                        {s.severity}
                      </Chip>
                    </Td>
                    <Td className="min-w-56">
                      <span className="block font-medium text-fg">{s.title}</span>
                      <span className="block text-[11px] text-subtle">{s.reportingCategory}</span>
                    </Td>
                    <Td className="num whitespace-nowrap text-muted">{s.periodLabel}</Td>
                    <Td align="right" className="num whitespace-nowrap text-muted">
                      {formatAvailability(s.evidenceCount, (n) => `${formatCount(n)} txns`, "—")}
                    </Td>
                    <Td className="num min-w-44 text-fg">{s.impact}</Td>
                    <Td align="right" className="num text-fg">
                      {formatScore01(s.aiConfidence)}
                    </Td>
                    <Td className="num text-xs whitespace-nowrap text-muted">{s.detection}</Td>
                    <Td>
                      <Chip tone={STATUS_TONE[s.status]} dot size="xs">
                        {SIGNAL_STATUS_LABELS[s.status]}
                      </Chip>
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{s.owner ?? "—"}</Td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <Td colSpan={10} className="py-8 text-center text-muted">
                    No signals match these filters.
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </Panel>
        {selected ? (
          <ExplainPanel
            key={selected.id}
            signal={selected}
            pending={action.isPending}
            error={action.error instanceof Error ? action.error.message : null}
            onAction={(a) => action.mutateAsync({ signalId: selected.id, action: a })}
          />
        ) : (
          <Panel title="Explainability path">
            <p className="text-sm text-muted">Select a signal to see how it was detected.</p>
          </Panel>
        )}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="AI Risk Timeline"
          meta={`severity by month · ${data.timeline.months[0] ?? ""}–${data.timeline.months.at(-1) ?? ""} 26`}
        >
          <Table>
            <caption className="sr-only">Highest signal severity per category and month</caption>
            <thead>
              <tr>
                <Th>Category</Th>
                {data.timeline.months.map((m, i) => {
                  const partial = data.timeline.partialMonths.includes(i);
                  return (
                    <Th
                      key={m}
                      align="center"
                      className={cn(partial && "border-x border-dashed border-warning/60 text-warning")}
                    >
                      {m}
                      {partial ? "*" : ""}
                    </Th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.timeline.lanes.map((lane) => (
                <tr key={lane.id}>
                  <Td className="text-fg">{lane.label}</Td>
                  {lane.cells.map((sev, i) => {
                    const partial = data.timeline.partialMonths.includes(i);
                    return (
                      <Td
                        key={i}
                        align="center"
                        className={cn("h-11", partial && "border-x border-dashed border-warning/60")}
                      >
                        {sev ? (
                          <span className="inline-flex items-center justify-center">
                            <span
                              aria-hidden
                              className="inline-block rounded-full"
                              style={{
                                width: DOT_SIZE[sev],
                                height: DOT_SIZE[sev],
                                background: TONE_VAR[SEVERITY_TONE[sev]],
                                boxShadow: sev === "critical" ? `0 0 12px ${TONE_VAR.negative}` : undefined,
                              }}
                            />
                            <span className="sr-only">{sev}</span>
                          </span>
                        ) : (
                          <span className="sr-only">none</span>
                        )}
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Table>
          <ul className="mt-3 flex flex-wrap gap-4 text-xs text-muted" aria-label="Severity legend">
            {(["critical", "high", "medium", "low"] as const).map((sev) => (
              <li key={sev} className="flex items-center gap-1.5 capitalize">
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-full"
                  style={{ background: TONE_VAR[SEVERITY_TONE[sev]] }}
                />
                {sev}
              </li>
            ))}
          </ul>
          {data.timeline.note ? <p className="mt-2 text-xs text-subtle">* {data.timeline.note}</p> : null}
        </Panel>
        <Panel title="By Category" meta="signals · open">
          <ul className="space-y-2">
            {data.categories.map((c) => (
              <li
                key={c.label}
                className="flex items-center justify-between border-b border-border/60 pb-2 text-sm"
              >
                <span className="text-fg">{c.label}</span>
                <span className="num text-muted">
                  <span className="text-fg">{c.signals}</span> ({c.open} open)
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-subtle">
            Signals support the underwriter&apos;s judgement. None of them approves or declines credit, and
            each can be challenged, overridden with a reason, and audited.
          </p>
        </Panel>
      </div>
    </div>
  );
}
