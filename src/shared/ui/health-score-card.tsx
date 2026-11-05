import { Gauge } from "@/shared/charts/gauge";
import { cn } from "@/shared/lib/cn";
import { HEALTH_BAND_LABELS, type HealthBand } from "@/shared/data/schemas/case";
import { Panel, SubCard } from "./panel";
import { TONE_TEXT, type Tone } from "./tone";

export interface HealthCardData {
  score: number;
  band: HealthBand;
  bandPosition?: "lower" | "mid" | "upper";
  previous: number;
  previousPeriod: string;
  cutoffs: readonly number[];
  model: string;
  confidences: readonly { label: string; value: string; tone: Tone }[];
  dimensions?: readonly { label: string; score: number; delta: number }[];
}

const BAND_TONE: Readonly<Record<HealthBand, Tone>> = {
  strong: "lime",
  healthy: "positive",
  watchlist: "warning",
  weak: "negative",
  critical: "negative",
};

/** Health score with band, delta vs previous assessment and the separate confidence dimensions. */
export function HealthScoreCard({ data }: { data: HealthCardData }) {
  const delta = data.score - data.previous;
  return (
    <Panel title="Financial Health Score">
      <Gauge
        value={data.score}
        bands={data.cutoffs}
        label={`Financial health score ${data.score} of 100, ${HEALTH_BAND_LABELS[data.band]}`}
      />
      <p className={cn("-mt-2 text-center text-lg font-semibold", TONE_TEXT[BAND_TONE[data.band]])}>
        {HEALTH_BAND_LABELS[data.band]}
        {data.bandPosition && data.bandPosition !== "mid" ? ` · ${data.bandPosition} band` : ""}
      </p>
      <p className="num text-center text-xs text-subtle">
        <span className={delta < 0 ? "text-negative" : "text-positive"}>
          {delta < 0 ? "▼" : "▲"} {Math.abs(delta)}
        </span>{" "}
        vs {data.previousPeriod} ({data.previous})
      </p>
      {data.dimensions ? (
        <ul className="mt-4 space-y-1.5 text-sm">
          {data.dimensions.map((d) => (
            <li key={d.label} className="flex items-center justify-between">
              <span className="text-fg">{d.label}</span>
              <span className="num">
                <span
                  className={
                    d.score >= 70 ? "text-positive" : d.score >= 55 ? "text-warning" : "text-negative"
                  }
                >
                  {d.score}
                </span>
                <span className="ml-3 text-negative">{d.delta}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.confidences.map((c) => (
          <SubCard key={c.label} className="py-2">
            <p className="text-[11px] text-muted">{c.label}</p>
            <p className={cn("num text-sm font-semibold", TONE_TEXT[c.tone])}>{c.value}</p>
          </SubCard>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-subtle">
        {data.model} · bands {data.cutoffs.join("/")} configurable · decision support, not a credit decision
      </p>
    </Panel>
  );
}
