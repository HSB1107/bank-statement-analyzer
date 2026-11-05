"use client";

import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/shared/lib/cn";
import { formatCount } from "@/shared/lib/format";
import {
  CASE_STAGE_LABELS,
  CaseStageSchema,
  type CaseStage,
  type CaseSummary,
} from "@/shared/data/schemas/case";
import { Panel } from "@/shared/ui/panel";
import { FilterSelect } from "@/shared/ui/select";
import { EmptyState, ErrorState, PanelSkeleton } from "@/shared/ui/states";
import { Table, Td, Th } from "@/shared/ui/table";
import { type DashboardFilters } from "../schemas/dashboard";
import { useWorkQueue } from "../hooks/use-dashboard";
import { caseHref, formatUpdated, HealthChip, RiskChip, StageChip } from "./case-chips";

export interface QueueFilterState {
  type: string;
  queueRegion: string;
  sector: string;
  risk: string;
  stage: CaseStage | "all";
}

const col = createColumnHelper<CaseSummary>();

/** Column definitions (data) for the underwriting work queue. */
const COLUMNS = [
  col.accessor("id", {
    header: "Case ID",
    cell: (c) => (
      <Link href={caseHref(c.row.original)} className="num font-medium text-info hover:underline">
        {c.getValue()}
      </Link>
    ),
  }),
  col.accessor("customerName", {
    header: "Customer",
    cell: (c) => <span className="font-medium text-fg">{c.getValue()}</span>,
  }),
  col.accessor("typeLabel", {
    header: "Type",
    cell: (c) => <span className="text-muted">{c.getValue()}</span>,
  }),
  col.display({
    id: "accts",
    header: "Accts",
    cell: (c) => (
      <span className="num text-muted">{`${c.row.original.accounts} · ${c.row.original.currency}`}</span>
    ),
  }),
  col.accessor("periodLabel", {
    header: "Period",
    cell: (c) => <span className="num text-muted">{c.getValue()}</span>,
  }),
  col.accessor("analyst", {
    header: "Analyst",
    cell: (c) => <span className="text-muted">{c.getValue() ?? "—"}</span>,
  }),
  col.display({ id: "health", header: "Health", cell: (c) => <HealthChip health={c.row.original.health} /> }),
  col.display({ id: "risk", header: "Risk", cell: (c) => <RiskChip risk={c.row.original.risk} /> }),
  col.accessor("stage", { header: "Status", cell: (c) => <StageChip stage={c.getValue()} /> }),
  col.accessor("updatedMinutesAgo", {
    header: "Updated",
    cell: (c) => <span className="num text-subtle">{formatUpdated(c.getValue())}</span>,
  }),
];

const ALL = { value: "all", label: "All" } as const;

export function WorkQueue({
  filters,
  state,
  onChange,
}: {
  filters: DashboardFilters;
  state: QueueFilterState;
  onChange: (next: QueueFilterState) => void;
}) {
  const query = useWorkQueue({ filters, ...state, limit: 8 });
  const rows = useMemo(() => query.data?.rows ?? [], [query.data]);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns mutable instances; the compiler skips memoising this component.
  const table = useReactTable({ data: rows, columns: COLUMNS, getCoreRowModel: getCoreRowModel() });
  const facets = query.data?.facets;
  const set = (patch: Partial<QueueFilterState>) => onChange({ ...state, ...patch });

  return (
    <Panel
      title="Underwriting Work Queue"
      meta={query.data ? `${rows.length} of ${formatCount(query.data.total)} open` : "…"}
      actions={
        <>
          <FilterSelect
            label="Type"
            size="sm"
            value={state.type}
            options={[ALL, ...(facets?.types ?? []).map((t) => ({ value: t, label: t }))]}
            onValueChange={(v) => set({ type: v })}
          />
          <FilterSelect
            label="Region"
            size="sm"
            value={state.queueRegion}
            options={[
              ALL,
              { value: "IN", label: "India" },
              { value: "ME", label: "Middle East" },
              { value: "ANZ", label: "ANZ" },
            ]}
            onValueChange={(v) => set({ queueRegion: v })}
          />
          <FilterSelect
            label="Sector"
            size="sm"
            value={state.sector}
            options={[ALL, ...(facets?.sectors ?? []).map((t) => ({ value: t, label: t }))]}
            onValueChange={(v) => set({ sector: v })}
          />
          <FilterSelect
            label="Risk"
            size="sm"
            value={state.risk}
            options={[
              ALL,
              { value: "low", label: "Low" },
              { value: "moderate", label: "Moderate" },
              { value: "elevated", label: "Elevated" },
              { value: "high", label: "High" },
            ]}
            onValueChange={(v) => set({ risk: v })}
          />
          <FilterSelect
            label="Status"
            size="sm"
            value={state.stage}
            options={[
              ALL,
              ...CaseStageSchema.options.map((s) => ({ value: s, label: CASE_STAGE_LABELS[s] })),
            ]}
            onValueChange={(v) =>
              set({ stage: v === "all" ? "all" : (CaseStageSchema.safeParse(v).data ?? "all") })
            }
          />
        </>
      }
    >
      {query.isPending ? (
        <PanelSkeleton rows={6} className="border-0 p-0 shadow-none" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No open cases match these filters"
          description="Clear a filter or pick another pipeline stage."
        />
      ) : (
        <Table aria-label="Underwriting work queue" className={cn(query.isFetching && "opacity-70")}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <Th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</Th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r, i) => (
              <tr
                key={r.id}
                className={cn(
                  "transition-colors hover:bg-surface-2",
                  i === 0 && "bg-info/5 shadow-[inset_2px_0_0_var(--info)]",
                )}
              >
                {r.getVisibleCells().map((c) => (
                  <Td key={c.id} className="whitespace-nowrap">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}
