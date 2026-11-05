import { Check, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Chip } from "@/shared/ui/chip";
import { Panel } from "@/shared/ui/panel";
import { type CheckStatus, type ReviewSummary } from "../schemas/transactions";

const CELL: Readonly<Record<CheckStatus, { cls: string; label: string; icon: React.ReactNode }>> = {
  pass: { cls: "text-positive", label: "passed", icon: <Check className="size-3" aria-hidden /> },
  warning: {
    cls: "text-warning",
    label: "warning",
    icon: (
      <span aria-hidden className="font-bold">
        !
      </span>
    ),
  },
  fail: { cls: "text-negative", label: "failed", icon: <X className="size-3" aria-hidden /> },
  na: {
    cls: "text-subtle",
    label: "not applicable",
    icon: (
      <span aria-hidden className="text-[9px]">
        N/A
      </span>
    ),
  },
};

export function ReconciliationPanel({ recon }: { recon: ReviewSummary["reconciliation"] }) {
  const all = recon.checks.flatMap((c) => c.results);
  const count = (s: CheckStatus) => all.filter((x) => x === s).length;
  return (
    <Panel
      title="Transaction Reconciliation"
      meta={`per account · ${recon.accounts.join(" / ")}`}
      actions={
        <>
          <Chip tone="positive" variant="outline">
            {count("pass")} passed
          </Chip>
          <Chip tone="warning" variant="outline">
            {count("warning")} warning
          </Chip>
          <Chip tone="negative" variant="outline">
            {count("fail")} failed
          </Chip>
          <Chip tone="neutral" variant="outline">
            {count("na")} N/A
          </Chip>
        </>
      }
    >
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        {recon.checks.map((c) => (
          <li key={c.id} className="rounded-lg border border-border bg-surface-2 p-3">
            <p className="min-h-10 text-[13px] text-fg">{c.label}</p>
            <ul className="mt-2 flex gap-1.5">
              {c.results.map((r, i) => (
                <li
                  key={i}
                  className={cn(
                    "num flex items-center gap-1 rounded border border-border-strong px-1.5 py-0.5 text-[10px]",
                    CELL[r].cls,
                  )}
                >
                  <span className="text-subtle">{recon.accounts[i]}</span> {CELL[r].icon}
                  <span className="sr-only">{CELL[r].label}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-subtle">{recon.note}</p>
    </Panel>
  );
}
