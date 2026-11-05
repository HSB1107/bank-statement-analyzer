"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CaseFrame } from "@/features/cases";
import { cn } from "@/shared/lib/cn";
import { formatCount } from "@/shared/lib/format";
import { type AccountId, type CaseId, type TransactionId } from "@/shared/data/schemas/ids";
import { Button } from "@/shared/ui/button";
import { KpiGrid } from "@/shared/ui/kpi-card";
import { Panel } from "@/shared/ui/panel";
import { EmptyState, ErrorState, PanelSkeleton } from "@/shared/ui/states";
import { type TxnFilter } from "../schemas/transactions";
import {
  useReviewActions,
  useReviewSummary,
  useTransactionDetail,
  useTransactions,
} from "../hooks/use-transactions";
import { ClassificationDrawer } from "./classification-drawer";
import { FiltersBar } from "./filters-bar";
import { ReconciliationPanel } from "./reconciliation-panel";
import { TxnTable } from "./txn-table";

export function ReviewScreen({ caseId }: { caseId: CaseId }) {
  const summary = useReviewSummary(caseId);
  const s = summary.data;
  const [filterState, setFilter] = useState<TxnFilter | null>(null);
  const [selectedState, setSelected] = useState<TransactionId | null>(null);
  const filter = filterState ?? s?.defaultFilter ?? null;
  const selected = selectedState ?? s?.defaultSelection ?? null;
  const list = useTransactions(caseId, filter);
  const detail = useTransactionDetail(caseId, selected);
  const actions = useReviewActions(caseId);
  const [message, setMessage] = useState<string | null>(null);
  const corporate = s?.corporate ?? true;
  const customerId = caseId === "BSA-26-04421" ? "CUST-IN-000318" : "CUST-IN-R-210457";

  return (
    <CaseFrame caseId={caseId} step="validation">
      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : !s || !filter ? (
        <PanelSkeleton rows={10} />
      ) : (
        <div className="space-y-4">
          <KpiGrid
            compact
            items={[
              { id: "a", label: "Accounts", value: String(s.kpis.accounts) },
              { id: "t", label: "Transactions", value: formatCount(s.kpis.transactions), tone: "info" },
              { id: "c", label: "Credits", value: formatCount(s.kpis.credits), tone: "positive" },
              { id: "d", label: "Debits", value: formatCount(s.kpis.debits) },
              { id: "cat", label: "Categorised", value: formatCount(s.kpis.categorised), tone: "lime" },
              { id: "u", label: "Uncategorised", value: formatCount(s.kpis.uncategorised), tone: "warning" },
              { id: "l", label: "Low confidence", value: formatCount(s.kpis.lowConfidence), tone: "warning" },
              { id: "e", label: "Exceptions", value: String(s.kpis.exceptions), tone: "negative" },
            ]}
          />
          <div className="grid items-start gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <Panel title="Accounts">
              <ul className="space-y-2" aria-label="Account navigator">
                {[
                  {
                    id: "all" as const,
                    label: "Consolidated",
                    rows: s.kpis.transactions,
                    subtitle: `All ${s.kpis.accounts} accounts · INR`,
                  },
                  ...s.accounts,
                ].map((a) => {
                  const active = filter.accountId === a.id;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setFilter({
                            ...filter,
                            accountId: a.id === "all" ? "all" : (a.id satisfies AccountId),
                          })
                        }
                        className={cn(
                          "w-full rounded-lg border px-3 py-2.5 text-left",
                          active
                            ? "border-lime/60 bg-lime/10"
                            : "border-border bg-surface-2 hover:border-border-strong",
                        )}
                      >
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={cn("num text-sm font-semibold", active ? "text-lime" : "text-fg")}>
                            {a.label}
                          </span>
                          <span className="num text-[11px] text-subtle">{formatCount(a.rows)}</span>
                        </span>
                        <span className="block text-[11px] text-subtle">{a.subtitle}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Button size="sm" className="mt-3 w-full" asChild>
                <Link href={`/profiles/${customerId}/overview`}>Compare</Link>
              </Button>
            </Panel>
            <section className="min-w-0 rounded-[var(--radius-card)] border border-border bg-surface shadow-card">
              <div className="border-b border-border p-3">
                <FiltersBar
                  filter={filter}
                  onChange={setFilter}
                  facets={list.data?.facets}
                  corporate={corporate}
                />
              </div>
              {list.isError ? (
                <ErrorState error={list.error} onRetry={() => void list.refetch()} className="m-4" />
              ) : !list.data ? (
                <PanelSkeleton rows={8} className="border-0 shadow-none" />
              ) : list.data.rows.length === 0 ? (
                <EmptyState
                  title="No transactions match these filters"
                  description="Widen the date range or clear the amount filter."
                />
              ) : (
                <TxnTable
                  rows={list.data.rows}
                  corporate={corporate}
                  selected={selected}
                  onSelect={setSelected}
                />
              )}
              <p
                className="num flex flex-wrap justify-between gap-2 border-t border-border px-4 py-2.5 text-[11px] text-subtle"
                aria-live="polite"
              >
                <span>
                  {corporate ? "₹ crore" : "₹"} · {formatCount(list.data?.matching ?? 0)} of{" "}
                  {formatCount(list.data?.inScope ?? 0)} rows matching · balances per account
                </span>
                <span className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-0.5 bg-info" /> own-transfer pair
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-0.5 bg-warning" /> &lt; 85% confidence
                  </span>
                </span>
              </p>
            </section>
          </div>
          {selected ? (
            <ClassificationDrawer
              detail={detail.data}
              isPending={detail.isPending}
              error={detail.error}
              corporate={corporate}
              busy={actions.apply.isPending}
              onAction={(action, reason) =>
                actions.apply.mutate(
                  { id: selected, request: { action, reason } },
                  { onSuccess: () => setMessage(`Saved · ${action.kind.replace(/_/g, " ")} — audited`) },
                )
              }
            />
          ) : null}
          <ReconciliationPanel recon={s.reconciliation} />
          <div className="sticky bottom-0 z-20 -mx-4 bg-bg/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3">
              <p className="mr-auto text-sm text-muted" aria-live="polite">
                <strong className="text-fg">Session:</strong> {s.session.reclassified} reclassified ·{" "}
                {s.session.duplicatesExcluded} dupes excluded · {s.session.flagged} flagged
                {message ? ` · ${message}` : ""}
              </p>
              <Button onClick={() => setMessage("Changes saved")}>Save Changes</Button>
              <Button
                disabled={actions.acceptAll.isPending}
                onClick={() =>
                  actions.acceptAll.mutate(undefined, {
                    onSuccess: (r) => setMessage(`${formatCount(r.affected)} accepted`),
                  })
                }
              >
                Accept All ≥ 95%
              </Button>
              <Button
                variant="warning"
                onClick={() =>
                  setFilter({ ...filter, confidence: "low", dateFrom: null, dateTo: null, minAmountMinor: 0 })
                }
              >
                Review {s.kpis.exceptions} Exceptions
              </Button>
              <Button onClick={() => setMessage("Selected rows queued for reprocessing")}>
                Reprocess Selected
              </Button>
              <Button
                variant="info"
                disabled={s.session.approved || actions.approve.isPending}
                onClick={() => actions.approve.mutate()}
              >
                {s.session.approved ? "Transaction Data Approved" : "Approve Transaction Data"}
              </Button>
              <Button variant="primary" asChild>
                <Link href={`/profiles/${customerId}/overview`}>
                  Generate Financial Profile <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </CaseFrame>
  );
}
