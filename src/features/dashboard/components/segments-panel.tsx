import { formatCount } from "@/shared/lib/format";
import { Panel } from "@/shared/ui/panel";
import { Meter } from "@/shared/ui/meter";
import { TONE_BG, type Tone } from "@/shared/ui/tone";
import { cn } from "@/shared/lib/cn";
import { type DashboardOverview } from "../schemas/dashboard";

const SEGMENTS: Readonly<
  Record<DashboardOverview["segments"][number]["segment"], { label: string; tone: Tone }>
> = {
  salaried: { label: "Salaried individuals", tone: "info" },
  self_employed: { label: "Self-employed", tone: "magenta" },
  sme: { label: "SME", tone: "lime" },
  corporate: { label: "Corporate", tone: "warning" },
};

export function SegmentsPanel({ segments }: { segments: DashboardOverview["segments"] }) {
  const max = Math.max(...segments.map((s) => s.customers), 1);
  return (
    <Panel title="Retail vs Corporate" meta="customers">
      <ul className="space-y-5">
        {segments.map((s) => (
          <li key={s.segment}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-fg">
                <span aria-hidden className={cn("size-2.5 rounded-sm", TONE_BG[SEGMENTS[s.segment].tone])} />
                {SEGMENTS[s.segment].label}
              </span>
              <span className="num font-semibold text-fg">{formatCount(s.customers)}</span>
            </div>
            <Meter
              value={s.customers / max}
              tone={SEGMENTS[s.segment].tone}
              className="mt-2"
              label={`${SEGMENTS[s.segment].label} share`}
            />
            <p className="num mt-1.5 flex justify-between text-[11px] text-subtle">
              <span>
                {formatCount(s.accounts)} accounts &nbsp; {formatCount(s.cases)} cases
              </span>
              <span>{s.accountsPerCustomer.toFixed(1)} accts/cust</span>
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
