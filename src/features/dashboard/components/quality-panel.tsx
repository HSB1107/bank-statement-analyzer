import { formatPercent } from "@/shared/lib/format";
import { Panel, SubCard } from "@/shared/ui/panel";
import { type DashboardOverview } from "../schemas/dashboard";

const ITEMS = [
  { key: "extraction", label: "Extraction confidence", cls: "text-positive" },
  { key: "autoClassified", label: "Auto-classified", cls: "text-info" },
  { key: "ownTransfers", label: "Own-transfers detected", cls: "text-fg" },
  { key: "statementsWithGaps", label: "Statements w/ gaps", cls: "text-warning" },
  { key: "reclassifications", label: "Analyst reclassifications", cls: "text-fg" },
  { key: "reconFailures", label: "Recon failures", cls: "text-negative" },
] as const;

export function QualityPanel({ quality }: { quality: DashboardOverview["quality"] }) {
  return (
    <Panel title="Processing Quality" meta="last 30 days">
      <div className="grid grid-cols-2 gap-2">
        {ITEMS.map((i) => (
          <SubCard key={i.key}>
            <p className="text-xs text-muted">{i.label}</p>
            <p className={`num mt-1 text-xl font-semibold ${i.cls}`}>{formatPercent(quality[i.key])}</p>
          </SubCard>
        ))}
      </div>
    </Panel>
  );
}
