import { Check, X } from "lucide-react";
import { Panel } from "@/shared/ui/panel";
import { type Ingestion } from "../schemas/cases";

const CELL = {
  covered: <span className="mx-auto block size-2.5 rounded-full bg-positive" aria-label="covered" />,
  low_ocr: <span className="mx-auto block size-2.5 rounded-full bg-warning" aria-label="low OCR" />,
  duplicate: (
    <span className="relative mx-auto block w-fit" aria-label="covered, duplicate excluded">
      <span className="block size-2.5 rounded-full bg-positive" />
      <span className="num absolute -top-2 -right-3 text-[8px] text-magenta">2×</span>
    </span>
  ),
  missing: <X className="mx-auto size-3.5 text-negative" aria-label="missing" />,
} as const;

export function CoveragePanel({ coverage }: { coverage: Ingestion["coverage"] }) {
  return (
    <Panel
      title="Statement Coverage"
      actions={
        <span
          className={`num text-sm font-semibold ${coverage.covered < coverage.total ? "text-warning" : "text-positive"}`}
        >
          {coverage.covered} / {coverage.total} months
        </span>
      }
    >
      <table className="w-full text-sm">
        <caption className="sr-only">Statement coverage by account and month</caption>
        <thead>
          <tr>
            <th scope="col" className="label-micro pb-2 text-left font-normal">
              Account
            </th>
            {coverage.months.map((m) => (
              <th key={m} scope="col" className="label-micro pb-2 text-center font-normal">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {coverage.rows.map((r) => (
            <tr key={r.label} className="border-t border-border/60">
              <th scope="row" className="num py-2.5 text-left font-normal text-fg">
                {r.label}
              </th>
              {r.cells.map((c, i) => (
                <td key={i} className="py-2.5 text-center">
                  {CELL[c]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 flex flex-wrap gap-3 text-[11px] text-subtle">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-positive" /> covered
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-warning" /> low OCR
        </span>
        <span className="flex items-center gap-1">
          <X className="size-3 text-negative" aria-hidden /> missing
        </span>
        <span className="flex items-center gap-1">
          <span className="text-magenta">2×</span> duplicate
        </span>
        <Check className="hidden" aria-hidden />
      </p>
    </Panel>
  );
}
