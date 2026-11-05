import { assertNever } from "@/shared/lib/assert";
import {
  CASE_STAGE_LABELS,
  HEALTH_BAND_LABELS,
  type CaseStage,
  type CaseSummary,
  type HealthBand,
  type RiskLevel,
} from "@/shared/data/schemas/case";
import { Chip } from "@/shared/ui/chip";
import { type Tone } from "@/shared/ui/tone";

export function bandTone(band: HealthBand): Tone {
  switch (band) {
    case "strong":
      return "lime";
    case "healthy":
      return "positive";
    case "watchlist":
      return "warning";
    case "weak":
    case "critical":
      return "negative";
    default:
      return assertNever(band, "band");
  }
}

export function riskTone(risk: RiskLevel): Tone {
  switch (risk) {
    case "low":
      return "positive";
    case "moderate":
      return "info";
    case "elevated":
      return "warning";
    case "high":
      return "negative";
    default:
      return assertNever(risk, "risk");
  }
}

export function stageTone(stage: CaseStage): Tone {
  switch (stage) {
    case "underwriter_review":
      return "warning";
    case "txn_validation":
      return "info";
    case "completed":
      return "positive";
    case "ai_processing":
      return "magenta";
    case "financial_profiling":
      return "indigo";
    case "docs_uploaded":
    case "new":
      return "neutral";
    default:
      return assertNever(stage, "stage");
  }
}

const RISK_LABEL: Readonly<Record<RiskLevel, string>> = {
  low: "Low",
  moderate: "Moderate",
  elevated: "Elevated",
  high: "High",
};

const Dash = () => (
  <Chip tone="neutral" variant="outline" dot aria-label="Not available">
    —
  </Chip>
);

export function HealthChip({ health }: { health: CaseSummary["health"] }) {
  if (health.status !== "available") return <Dash />;
  return (
    <Chip tone={bandTone(health.value.band)} variant="outline" dot>
      <span className="num">{health.value.score}</span> {HEALTH_BAND_LABELS[health.value.band]}
    </Chip>
  );
}

export function RiskChip({ risk }: { risk: CaseSummary["risk"] }) {
  if (risk.status !== "available") return <Dash />;
  return (
    <Chip tone={riskTone(risk.value)} variant="outline" dot>
      {RISK_LABEL[risk.value]}
    </Chip>
  );
}

export function StageChip({ stage }: { stage: CaseStage }) {
  return (
    <Chip tone={stageTone(stage)} variant="outline" dot>
      {CASE_STAGE_LABELS[stage]}
    </Chip>
  );
}

/** Where a case row navigates: Pass-1 demo cases open their built screens. */
export function caseHref(c: Pick<CaseSummary, "id" | "customerId" | "demo" | "stage">): string {
  if (!c.demo || !c.customerId) return "/cases";
  if (c.stage === "underwriter_review" || c.stage === "completed")
    return `/profiles/${c.customerId}/overview`;
  return `/cases/${c.id}/transactions`;
}

export function formatUpdated(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} hr`;
  return `${Math.round(minutes / (60 * 24))} d`;
}
