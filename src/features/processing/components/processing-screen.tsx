"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { CaseFrame } from "@/features/cases";
import { cn } from "@/shared/lib/cn";
import { formatCount, formatDurationClock, formatPercent } from "@/shared/lib/format";
import { type CaseId } from "@/shared/data/schemas/ids";
import { Button } from "@/shared/ui/button";
import { KpiGrid } from "@/shared/ui/kpi-card";
import { Panel } from "@/shared/ui/panel";
import { FilterSelect } from "@/shared/ui/select";
import { ErrorState, PanelSkeleton } from "@/shared/ui/states";
import { Table, Td, Th } from "@/shared/ui/table";
import { useProcessingPlan, useProcessingRun } from "../hooks/use-processing";
import { NetworkGraph } from "./network-graph";
import { StageList } from "./stage-list";

export function ProcessingScreen({ caseId }: { caseId: CaseId }) {
  const plan = useProcessingPlan(caseId);
  const { state, error, speed, restart } = useProcessingRun(caseId, plan.data);
  const p = plan.data;
  const total = p ? p.stages.reduce((a, s) => a + s.durationSec, 0) : 1;
  const completedStages = Object.entries(state.stages)
    .filter(([, v]) => v.status === "done" || v.status === "warning")
    .map(([k]) => Number(k));
  const resolvedStage = Math.max(0, ...completedStages);
  const progress = state.done ? 1 : state.elapsedSec / total;
  const parsed = p
    ? resolvedStage >= 5
      ? p.totals.transactions
      : Math.round(p.totals.transactions * Math.min(1, state.elapsedSec / 54))
    : 0;

  return (
    <CaseFrame caseId={caseId} step="processing">
      {plan.isError ? (
        <ErrorState error={plan.error} onRetry={() => void plan.refetch()} />
      ) : !p ? (
        <PanelSkeleton rows={10} />
      ) : (
        <div className="space-y-4">
          <KpiGrid
            compact
            items={[
              { id: "progress", label: "Progress", value: formatPercent(progress, 0), tone: "lime" },
              { id: "elapsed", label: "Elapsed", value: formatDurationClock(state.elapsedSec) },
              {
                id: "eta",
                label: "ETA",
                value: formatDurationClock(state.done ? 0 : total - state.elapsedSec),
                tone: "lime",
              },
              {
                id: "accounts",
                label: "Accounts processed",
                value: `${resolvedStage >= 3 ? p.totals.accounts : 0} / ${p.totals.accounts}`,
                tone: "lime",
              },
              { id: "txns", label: "Transactions", value: formatCount(parsed), tone: "info" },
              {
                id: "cats",
                label: "Categories found",
                value: resolvedStage >= 9 ? String(p.totals.categories) : "—",
              },
              {
                id: "extraction",
                label: "Extraction confidence",
                value: resolvedStage >= 4 ? formatPercent(p.totals.extraction) : "—",
                tone: "positive",
              },
              {
                id: "exceptions",
                label: "Exceptions",
                value: String(
                  state.done
                    ? p.exceptions.length
                    : Math.min(
                        p.exceptions.length,
                        Math.floor((resolvedStage / 21) * p.exceptions.length * 1.6),
                      ),
                ),
                tone: "warning",
              },
            ]}
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            {error ? <span className="text-sm text-negative">Stream interrupted.</span> : null}
            <FilterSelect
              label="Speed"
              size="sm"
              value={String(speed)}
              options={[
                { value: "2", label: "2×" },
                { value: "6", label: "6×" },
                { value: "20", label: "20×" },
              ]}
              onValueChange={(v) => restart(Number(v))}
            />
            <Button size="sm" onClick={() => restart()}>
              <RotateCcw aria-hidden /> Restart simulation
            </Button>
            <Button
              size="sm"
              variant="primary"
              asChild
              className={cn(!state.done && "pointer-events-none opacity-50")}
            >
              <Link href={`/cases/${caseId}/transactions`} aria-disabled={!state.done}>
                Continue to Transaction Validation <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <StageList plan={p} run={state} />
            </div>
            <div className="min-w-0 space-y-4">
              <NetworkGraph plan={p} resolvedStage={resolvedStage} />
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Panel title="Per Account">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Account</Th>
                        <Th align="right">Txns</Th>
                        <Th align="right">Conf.</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.perAccount.map((a) => (
                        <tr key={a.label}>
                          <Td
                            className={cn(
                              "num font-medium",
                              a.confidence < 0.95 ? "text-warning" : "text-info",
                            )}
                          >
                            ● {a.label}
                          </Td>
                          <Td align="right" className="num text-fg">
                            {formatCount(a.transactions)}
                          </Td>
                          <Td
                            align="right"
                            className={cn("num", a.confidence < 0.95 ? "text-warning" : "text-fg")}
                          >
                            {formatPercent(a.confidence)}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Panel>
                <section
                  aria-label="Live trace"
                  className="min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-black/40 p-4 font-mono text-[11px]"
                >
                  <p className="label-micro mb-3 flex justify-between">
                    Live trace{" "}
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        state.done ? "bg-positive" : "animate-pulse bg-lime",
                      )}
                    />
                  </p>
                  <ul className="space-y-1.5" aria-live="polite">
                    {state.traces.map((t) => (
                      <li key={t.id} className="flex gap-3">
                        <span className="w-10 shrink-0 text-info">{t.tag}</span>
                        <span className="truncate text-muted">{t.text}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
              <Panel
                title="Exceptions Raised"
                meta={`${p.exceptions.length} · routed to Transaction Validation`}
              >
                <ul className="divide-y divide-border/60">
                  {p.exceptions.map((e) => (
                    <li key={e.tag + e.text} className="flex gap-4 py-2 text-sm">
                      <span className="label-micro w-24 shrink-0 text-negative">{e.tag}</span>
                      <span className="text-fg">{e.text}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        </div>
      )}
    </CaseFrame>
  );
}
