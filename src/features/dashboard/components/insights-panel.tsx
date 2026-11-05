import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/cn";
import { type Severity } from "@/shared/data/schemas/signal";
import { Chip } from "@/shared/ui/chip";
import { Panel } from "@/shared/ui/panel";
import { TONE_TEXT, type Tone } from "@/shared/ui/tone";
import { type Insight } from "../schemas/dashboard";

export const SEVERITY_TONE: Readonly<Record<Severity, Tone>> = {
  critical: "negative",
  high: "warning",
  medium: "magenta",
  low: "info",
};
const BAR: Readonly<Record<Severity, string>> = {
  critical: "before:bg-negative",
  high: "before:bg-warning",
  medium: "before:bg-magenta",
  low: "before:bg-info",
};

function hrefFor(caseId: string | undefined): string {
  if (caseId === "BSA-26-04421") return "/profiles/CUST-IN-000318/risk";
  if (caseId === "BSA-26-04417") return "/profiles/CUST-IN-R-210457/overview";
  return "/cases";
}

export function InsightsPanel({ insights }: { insights: readonly Insight[] }) {
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Chip tone="magenta" variant="outline" mono size="xs">
            ◆ AI
          </Chip>
          AI Insights
        </span>
      }
      meta="click to open case"
    >
      <ul className="divide-y divide-border">
        {insights.map((i) => (
          <li key={i.id}>
            <Link
              href={hrefFor(i.caseIds[0])}
              className={cn(
                "relative flex items-start gap-3 py-3 pr-1 pl-4 before:absolute before:top-3 before:bottom-3 before:left-0 before:w-0.5 before:rounded-full hover:bg-surface-2",
                BAR[i.severity],
              )}
            >
              <span className="min-w-0 flex-1">
                <span className={cn("label-micro block", TONE_TEXT[SEVERITY_TONE[i.severity]])}>
                  {i.severity}
                </span>
                <span className="mt-1 block text-sm font-medium text-fg">{i.title}</span>
                <span className="num mt-1 block text-[11px] text-subtle">{i.detail}</span>
              </span>
              <ChevronRight className="mt-5 size-4 shrink-0 text-subtle" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-subtle">
        Signals are indicators for review, not findings of fraud or credit decisions.
      </p>
    </Panel>
  );
}
