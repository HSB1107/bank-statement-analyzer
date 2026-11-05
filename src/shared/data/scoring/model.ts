/**
 * Config-driven scoring. A model is a list of dimensions; each dimension has a weight and a
 * rule set that turns metrics into a 0–100 score plus explainable factors. The health score is
 * Σ dimension × weight. Health score, model confidence and extraction confidence are reported
 * separately — never blended.
 */
export interface ScoreFactor {
  direction: "positive" | "negative";
  text: string;
}

export interface DimensionResult {
  id: string;
  label: string;
  weight: number;
  score: number;
  previous: number;
  factors: readonly ScoreFactor[];
  confidence: "High" | "Medium" | "Low";
}

export interface DimensionDefinition<M> {
  id: string;
  label: string;
  weight: number;
  confidence: DimensionResult["confidence"];
  score: (metrics: M) => number;
  factors: (metrics: M) => ScoreFactor[];
}

export interface ScoringModel<M> {
  id: string;
  version: string;
  dimensions: readonly DimensionDefinition<M>[];
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function evaluateModel<M>(
  model: ScoringModel<M>,
  metrics: M,
  previous: Readonly<Record<string, number>>,
) {
  const dimensions: DimensionResult[] = model.dimensions.map((d) => ({
    id: d.id,
    label: d.label,
    weight: d.weight,
    score: clampScore(d.score(metrics)),
    previous: previous[d.id] ?? 0,
    factors: d.factors(metrics),
    confidence: d.confidence,
  }));
  const raw = dimensions.reduce((a, d) => a + d.score * d.weight, 0);
  const previousRaw = dimensions.reduce((a, d) => a + d.previous * d.weight, 0);
  return { dimensions, score: Math.round(raw), rawScore: raw, previousScore: Math.round(previousRaw) };
}

/** Weighted composite of sub-scores (e.g. the LQ-RTL liquidity indicator). */
export function composite(parts: readonly { score: number; weight: number }[]): number {
  return parts.reduce((a, p) => a + p.score * p.weight, 0);
}
