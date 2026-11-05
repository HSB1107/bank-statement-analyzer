"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Breadcrumbs, PageHeading } from "@/shared/layout/breadcrumbs";
import { Button } from "@/shared/ui/button";
import { FilterSelect } from "@/shared/ui/select";
import { ErrorState, PanelSkeleton, Skeleton } from "@/shared/ui/states";
import { SegmentFilterSchema, type DashboardFilters } from "../schemas/dashboard";
import { useDashboardOverview } from "../hooks/use-dashboard";
import { HealthPanel } from "./health-panel";
import { InsightsPanel } from "./insights-panel";
import { KpiStrip } from "./kpi-strip";
import { LiquidityPanel } from "./liquidity-panel";
import { PipelineStrip } from "./pipeline-strip";
import { QualityPanel } from "./quality-panel";
import { RegionalPanel } from "./regional-panel";
import { SegmentsPanel } from "./segments-panel";
import { WorkQueue, type QueueFilterState } from "./work-queue";

const SEGMENT_OPTIONS = [
  { value: "all", label: "All" },
  { value: "retail", label: "Retail" },
  { value: "corporate_all", label: "SME & Corporate" },
  { value: "salaried", label: "Salaried" },
  { value: "self_employed", label: "Self-employed" },
  { value: "sme", label: "SME" },
  { value: "corporate", label: "Corporate" },
] as const;

export function DashboardScreen() {
  const [filters, setFilters] = useState<DashboardFilters>({
    periodDays: 30,
    segment: "all",
    region: "all",
    analyst: "all",
  });
  const [queue, setQueue] = useState<QueueFilterState>({
    type: "all",
    queueRegion: "all",
    sector: "all",
    risk: "all",
    stage: "all",
  });
  const overview = useDashboardOverview(filters);
  const qc = useQueryClient();
  const o = overview.data;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Workspace" }, { label: "Executive Dashboard" }]} />
      <PageHeading
        title="Transaction Intelligence Dashboard"
        subtitle="Statement processing, financial profiling and risk across retail and corporate underwriting."
        actions={
          <>
            <FilterSelect
              label="Period"
              value={String(filters.periodDays)}
              options={[
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
              ]}
              onValueChange={(v) => setFilters({ ...filters, periodDays: v === "90" ? 90 : 30 })}
            />
            <FilterSelect
              label="Segment"
              value={filters.segment}
              options={SEGMENT_OPTIONS}
              onValueChange={(v) => setFilters({ ...filters, segment: SegmentFilterSchema.parse(v) })}
            />
            <FilterSelect
              label="Region"
              value={filters.region}
              options={[
                { value: "all", label: "All" },
                { value: "IN", label: "India" },
                { value: "ME", label: "Middle East" },
                { value: "ANZ", label: "ANZ" },
              ]}
              onValueChange={(v) =>
                setFilters({ ...filters, region: v === "IN" || v === "ME" || v === "ANZ" ? v : "all" })
              }
            />
            <FilterSelect
              label="Analyst"
              value={filters.analyst}
              options={[
                { value: "all", label: "All" },
                ...(o?.analysts ?? []).map((a) => ({ value: a, label: a })),
              ]}
              onValueChange={(v) => setFilters({ ...filters, analyst: v })}
            />
            <Button
              onClick={() => void qc.invalidateQueries({ queryKey: ["dashboard"] })}
              aria-label="Refresh dashboard"
            >
              <RefreshCw aria-hidden className={overview.isFetching ? "animate-spin" : undefined} /> Refresh
            </Button>
          </>
        }
      />
      {overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
      ) : !o ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-8">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <PanelSkeleton rows={2} />
          <PanelSkeleton rows={6} />
        </>
      ) : (
        <>
          <KpiStrip kpis={o.kpis} />
          <PipelineStrip
            pipeline={o.pipeline}
            selected={queue.stage}
            onSelect={(stage) => setQueue({ ...queue, stage })}
          />
          <WorkQueue filters={filters} state={queue} onChange={setQueue} />
          <div className="grid gap-4 xl:grid-cols-3">
            <InsightsPanel insights={o.insights} />
            <HealthPanel health={o.health} />
            <SegmentsPanel segments={o.segments} />
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <LiquidityPanel />
            <RegionalPanel regions={o.regions} />
            <QualityPanel quality={o.quality} />
          </div>
        </>
      )}
    </div>
  );
}
