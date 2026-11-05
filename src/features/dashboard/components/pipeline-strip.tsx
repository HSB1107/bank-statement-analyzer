"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { formatCount } from "@/shared/lib/format";
import { CASE_STAGE_LABELS, type CaseStage } from "@/shared/data/schemas/case";
import { Panel } from "@/shared/ui/panel";
import { TONE_BG, TONE_TEXT, type Tone } from "@/shared/ui/tone";
import { type DashboardOverview } from "../schemas/dashboard";

const STAGE_TONE: Readonly<Record<CaseStage, Tone>> = {
  new: "neutral",
  docs_uploaded: "info",
  ai_processing: "magenta",
  txn_validation: "warning",
  financial_profiling: "indigo",
  underwriter_review: "warning",
  completed: "lime",
};
const LABEL_OVERRIDE: Partial<Record<CaseStage, string>> = {
  new: "New Cases",
  docs_uploaded: "Documents Uploaded",
  txn_validation: "Data Validation",
  completed: "Completed",
};

export function PipelineStrip({
  pipeline,
  selected,
  onSelect,
}: {
  pipeline: DashboardOverview["pipeline"];
  selected: CaseStage | "all";
  onSelect: (s: CaseStage | "all") => void;
}) {
  const max = Math.max(...pipeline.stages.filter((s) => s.stage !== "completed").map((s) => s.count), 1);
  return (
    <Panel
      title="Analysis Processing Pipeline"
      meta={`${formatCount(pipeline.total)} cases in last 30 days · click a stage to filter`}
    >
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {pipeline.stages.map((s, i) => {
          const active = selected === s.stage;
          const tone = STAGE_TONE[s.stage];
          const width = s.stage === "completed" ? 100 : Math.max(8, (s.count / max) * 60);
          return (
            <li key={s.stage} className="relative">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(active ? "all" : s.stage)}
                className={cn(
                  "w-full rounded-lg border bg-surface-2 px-3.5 py-3 text-left transition-colors hover:border-border-strong",
                  active ? "border-warning/70 bg-warning/5" : "border-border",
                )}
              >
                <span className="flex items-baseline gap-2 text-[13px] text-muted">
                  <span className="num text-[11px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                  <span className="truncate">{LABEL_OVERRIDE[s.stage] ?? CASE_STAGE_LABELS[s.stage]}</span>
                </span>
                <span
                  className={cn(
                    "num mt-1 block text-2xl font-semibold",
                    TONE_TEXT[tone],
                    tone === "neutral" && "text-fg",
                  )}
                >
                  {formatCount(s.count)}
                </span>
                <span className="mt-2 block h-1 rounded-full bg-surface-3">
                  <span
                    className={cn("block h-full rounded-full", TONE_BG[tone])}
                    style={{ width: `${width}%` }}
                  />
                </span>
              </button>
              {i < pipeline.stages.length - 1 ? (
                <ChevronRight
                  aria-hidden
                  className="absolute top-1/2 -right-2.5 z-10 hidden size-4 -translate-y-1/2 rounded-full bg-surface-3 text-subtle xl:block"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
