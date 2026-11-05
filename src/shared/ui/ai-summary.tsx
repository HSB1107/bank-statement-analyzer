import { type Provenance } from "@/shared/lib/provenance";
import { Chip } from "./chip";
import { Panel } from "./panel";
import { ProvenanceTag } from "./provenance-tag";

/** AI executive summary where every line carries its provenance tag. */
export function AiSummary({
  headline,
  lines,
  citations,
  confidence,
}: {
  headline: string;
  lines: readonly { provenance: Provenance; text: string }[];
  citations: number;
  confidence: number;
}) {
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Chip tone="magenta" variant="outline" mono size="xs">
            ◆ AI summary
          </Chip>
          Executive Summary
        </span>
      }
      meta={`${citations} citations · conf. ${confidence.toFixed(2)}`}
    >
      <p className="border-l-2 border-lime pl-4 text-[17px] leading-snug font-semibold text-fg">{headline}</p>
      <ul className="mt-4 space-y-2">
        {lines.map((l, i) => (
          <li key={i} className="grid grid-cols-[104px_1fr] items-start gap-3">
            <span className="flex h-full items-start">
              <ProvenanceTag value={l.provenance} className="w-full justify-center py-1.5" />
            </span>
            <span className="text-sm leading-relaxed text-fg">{l.text}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function InsightList({
  title,
  items,
  tone,
}: {
  title: string;
  items: readonly string[];
  tone: "positive" | "negative" | "warning";
}) {
  const cls = tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-warning";
  return (
    <Panel title={<span className={cls}>{title}</span>}>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s} className="flex gap-2 text-sm text-fg">
            <span aria-hidden className={cls}>
              ▸
            </span>
            {s}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
