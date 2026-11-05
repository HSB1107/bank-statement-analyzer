import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface StepperStep {
  id: string;
  label: string;
  href?: string;
}

/** Case workflow stepper. Steps before `currentIndex` are complete. */
export function Stepper({ steps, currentIndex }: { steps: readonly StepperStep[]; currentIndex: number }) {
  return (
    <nav
      aria-label="Case workflow"
      className="mb-5 scrollbar-thin overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 shadow-card"
    >
      <ol className="flex min-w-max items-center gap-3">
        {steps.map((step, i) => {
          const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
          const content = (
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={cn(
                  "grid size-6 place-items-center rounded-full border text-xs font-semibold",
                  state === "done" && "border-positive/60 text-positive",
                  state === "current" && "border-transparent bg-primary text-primary-fg",
                  state === "todo" && "border-border-strong text-subtle",
                )}
              >
                {state === "done" ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm whitespace-nowrap",
                  state === "current" ? "font-semibold text-fg" : state === "done" ? "text-fg" : "text-muted",
                )}
              >
                {step.label}
              </span>
              <span className="sr-only">
                {state === "done" ? "(complete)" : state === "current" ? "(current step)" : ""}
              </span>
            </span>
          );
          return (
            <li
              key={step.id}
              className="flex items-center gap-3"
              aria-current={state === "current" ? "step" : undefined}
            >
              {step.href ? (
                <Link href={step.href} className="rounded-md hover:opacity-90">
                  {content}
                </Link>
              ) : (
                content
              )}
              {i < steps.length - 1 ? <span aria-hidden className="h-px w-6 bg-border-strong" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
