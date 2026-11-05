import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { formatSeconds } from "@/shared/lib/format";
import { Chip } from "@/shared/ui/chip";
import { Panel } from "@/shared/ui/panel";
import { type ProcessingPlan } from "../schemas/processing";
import { type RunState } from "../hooks/use-processing";

export function StageList({ plan, run }: { plan: ProcessingPlan; run: RunState }) {
  const status = run.done ? "Completed" : Object.keys(run.stages).length ? "Running" : "Queued";
  return (
    <Panel
      title={`${plan.stages.length}-Stage Pipeline`}
      meta={`job ${plan.jobId} · started ${plan.startedAt}`}
      actions={
        <>
          <Chip tone={run.done ? "positive" : "lime"} variant="outline" dot>
            {status}
          </Chip>
          <Chip tone="warning" variant="dashed" mono size="xs">
            Simulated
          </Chip>
        </>
      }
      bodyClassName="px-0 sm:px-0"
    >
      <ol aria-live="polite" aria-relevant="text" className="divide-y divide-border/60">
        {plan.stages.map((s) => {
          const st = run.stages[s.index];
          const state = st?.status ?? "pending";
          const running = state === "running";
          return (
            <li
              key={s.index}
              className={cn(
                "flex items-center gap-4 px-5 py-2.5",
                running && "bg-lime/5 shadow-[inset_2px_0_0_var(--lime)]",
              )}
              aria-current={running ? "step" : undefined}
            >
              <span
                aria-hidden
                className={cn(
                  "num grid size-6 shrink-0 place-items-center rounded-full border text-[10px]",
                  state === "done" && "border-positive/60 text-positive",
                  state === "warning" && "border-warning/60 text-warning",
                  running && "border-lime text-lime",
                  state === "pending" && "border-border-strong text-subtle",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3.5" />
                ) : state === "warning" ? (
                  <AlertTriangle className="size-3" />
                ) : (
                  s.index
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", state === "pending" ? "text-muted" : "font-medium text-fg")}>
                  {s.name}
                </p>
                <p
                  className={cn(
                    "num truncate text-[11px]",
                    state === "warning" ? "text-warning" : "text-subtle",
                  )}
                >
                  {state === "pending" ? s.pendingDetail : s.detail}
                </p>
              </div>
              <div className="hidden h-1 w-36 overflow-hidden rounded-full bg-surface-3 sm:block">
                <div
                  className={cn(
                    "h-full rounded-full",
                    state === "warning" ? "bg-warning/80" : running ? "bg-lime" : "bg-positive/80",
                  )}
                  style={{ width: `${state === "pending" ? 0 : (st?.progress ?? 0) * 100}%` }}
                />
              </div>
              <span className={cn("num w-14 text-right text-xs", running ? "text-lime" : "text-subtle")}>
                {running
                  ? `${Math.round((st?.progress ?? 0) * 100)}%`
                  : state === "pending"
                    ? "pending"
                    : formatSeconds(s.durationSec)}
              </span>
              <span className="sr-only">{state}</span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
