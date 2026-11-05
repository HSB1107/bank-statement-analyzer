import { SyntheticBadge } from "@/shared/ui/chip";

export interface CaseHeaderData {
  caseId: string;
  customerName: string;
  customerRef: string;
  facts: readonly { label: string; value: string }[];
  stage: string;
}

function Fact({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="min-w-0 border-l border-border pl-4">
      <p className="label-micro text-[10px]">{label}</p>
      <p className={highlight ? "mt-1 font-semibold text-lime" : "mt-1 font-semibold text-fg"}>{value}</p>
    </div>
  );
}

export function CaseHeader({ data }: { data: CaseHeaderData }) {
  return (
    <section aria-label="Case summary" className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[var(--radius-card)] border border-border bg-surface px-5 py-4 shadow-card">
      <div>
        <p className="label-micro text-[10px]">Case</p>
        <p className="num mt-1 text-lg font-semibold text-info">{data.caseId}</p>
      </div>
      <div className="min-w-0 flex-1 border-l border-border pl-5 sm:min-w-[240px]">
        <p className="truncate text-lg font-semibold text-fg">{data.customerName}</p>
        <p className="truncate text-[13px] text-muted">{data.customerRef}</p>
      </div>
      {data.facts.map((f) => (
        <Fact key={f.label} label={f.label} value={f.value} />
      ))}
      <Fact label="Stage" value={data.stage} highlight />
      <SyntheticBadge className="ml-auto" />
    </section>
  );
}
