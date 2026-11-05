import { formatPercent } from "@/shared/lib/format";
import {
  bankBalances,
  cashFlow,
  cashRunway,
  coverage,
  dataQuality,
  inflowConcentration,
  odUtilisation,
  supplierConcentration,
  type CorporateInput,
} from "../selectors/corporate";
import { evaluateModel, type ScoringModel } from "./model";

export function corporateMetrics(input: CorporateInput) {
  const cash = cashFlow(input);
  const concentration = inflowConcentration(input);
  const od = odUtilisation(input);
  const bank = bankBalances(input);
  const quality = dataQuality(input);
  const cov = coverage(input);
  const leader = concentration.ranked[0];
  const leaderQ1 = leader
    ? (leader.monthly[0] ?? 0) + (leader.monthly[1] ?? 0) + (leader.monthly[2] ?? 0)
    : 0;
  const leaderQ2 = leader
    ? (leader.monthly[3] ?? 0) + (leader.monthly[4] ?? 0) + (leader.monthly[5] ?? 0)
    : 0;
  const juneUtil = od.status === "available" ? od.monthEnd[5] : undefined;
  return {
    cash,
    concentration,
    suppliers: supplierConcentration(input),
    od,
    bank,
    quality,
    coverage: cov,
    runway: cashRunway(input),
    netOpMargin: cash.totals.opIn ? cash.totals.netOp / cash.totals.opIn : 0,
    negativeOpMonthsLast3: cash.netOp.slice(3).filter((v) => v < 0).length,
    collectionsQoQ: cash.totals.q1Collections ? cash.totals.q2Collections / cash.totals.q1Collections - 1 : 0,
    leaderQoQ: leaderQ1 ? leaderQ2 / leaderQ1 - 1 : 0,
    leaderShareQ1: cash.totals.q1Collections ? leaderQ1 / cash.totals.q1Collections : 0,
    leaderShareQ2: cash.totals.q2Collections ? leaderQ2 / cash.totals.q2Collections : 0,
    odUtilJune: juneUtil?.status === "available" ? juneUtil.value : null,
    opCoverRatio: cash.totals.opIn ? cash.totals.opOut / cash.totals.opIn : 0,
  };
}
export type CorporateMetrics = ReturnType<typeof corporateMetrics>;

/**
 * SCM-CORP v1.3. Dimension weights are not shown in the PDF; they are chosen so the documented
 * dimension scores reproduce the overall 61 (see docs/DECISIONS.md) and are configurable here.
 */
export const SCM_CORP: ScoringModel<CorporateMetrics> = {
  id: "SCM-CORP",
  version: "v1.3",
  dimensions: [
    {
      id: "operatingCashFlow",
      label: "Operating Cash Flow",
      weight: 0.2,
      confidence: "High",
      // 66 + 3.6 × net operating margin % − 9 per negative month in the last quarter.
      score: (m) => 66 + 3.6 * m.netOpMargin * 100 - 9 * m.negativeOpMonthsLast3,
      factors: (m) => [
        { direction: "positive", text: `Net operating ${formatPercent(m.netOpMargin)} of receipts over H1` },
        { direction: "negative", text: `${m.negativeOpMonthsLast3} negative month(s) in Q2` },
      ],
    },
    {
      id: "liquidity",
      label: "Liquidity",
      weight: 0.15,
      confidence: "High",
      // 100 − 0.58 × June month-end OD utilisation % − 2 per low-balance day.
      score: (m) => 100 - 0.58 * (m.odUtilJune ?? 0) * 100 - 2 * m.bank.lowBalanceDays,
      factors: (m) => [
        { direction: "negative", text: `OD ${formatPercent(m.odUtilJune ?? 0)} at June month-end` },
        { direction: "negative", text: `${m.bank.lowBalanceDays} low-balance days` },
      ],
    },
    {
      id: "collectionStability",
      label: "Collection Stability",
      weight: 0.2,
      confidence: "High",
      // 100 − 1.5 × |Q2 vs Q1 decline %| − 6 if the largest customer fell > 15%.
      score: (m) => 100 - 1.5 * Math.abs(Math.min(0, m.collectionsQoQ)) * 100 - (m.leaderQoQ < -0.15 ? 6 : 0),
      factors: (m) => [
        { direction: "positive", text: `${m.concentration.payers} payers, collections every month` },
        { direction: "negative", text: `Q2 ${formatPercent(m.collectionsQoQ, 1, "always")} vs Q1` },
      ],
    },
    {
      id: "debtServicing",
      label: "Debt Servicing",
      weight: 0.15,
      confidence: "High",
      // 40 + 27 × debt-service proxy (net operating cash ÷ debt service).
      score: (m) => 40 + 27 * m.cash.debtServiceProxy,
      factors: (m) => [
        { direction: "negative", text: `Debt service proxy ${m.cash.debtServiceProxy.toFixed(2)}×` },
      ],
    },
    {
      id: "concentration",
      label: "Concentration",
      weight: 0.15,
      confidence: "Medium",
      // 100 − 1.48 × (top-3 share % − 40).
      score: (m) => 100 - 1.48 * (m.concentration.top3Share * 100 - 40),
      factors: (m) => [
        {
          direction: "negative",
          text: `Top-3 ${formatPercent(m.concentration.top3Share)} · HHI ${m.concentration.hhi.toFixed(2)}`,
        },
      ],
    },
    {
      id: "transactionIntegrity",
      label: "Transaction Integrity",
      weight: 0.15,
      confidence: "Medium",
      // 100 − 2 × low-confidence % − 2 per suspected duplicate row − 2.4 × coverage gap %.
      score: (m) =>
        100 -
        2 * (1 - m.quality.classificationConfidence) * 100 -
        2 * m.quality.duplicateRows -
        2.4 * (1 - m.coverage.completeness) * 100,
      factors: (m) => [
        { direction: "positive", text: `${formatPercent(m.quality.classificationConfidence)} classified` },
        {
          direction: "negative",
          text: `${m.coverage.total - m.coverage.covered} statement month missing · ${m.quality.duplicateRows} suspected duplicates`,
        },
      ],
    },
  ],
};

export const MERIDIAN_PREVIOUS_ASSESSMENT = {
  period: "Jul-Dec 25",
  dimensions: {
    operatingCashFlow: 70,
    liquidity: 68,
    collectionStability: 78,
    debtServicing: 72,
    concentration: 58,
    transactionIntegrity: 80,
  },
  radar: {
    operatingCashFlow: 70,
    liquidity: 68,
    collections: 78,
    concentration: 58,
    debtServicing: 72,
    txnConsistency: 80,
    workingCapital: 66,
  },
} as const;

/** Working-capital axis (radar only): 100 − 40 × operating outflow ÷ operating inflow. */
export function workingCapitalScore(m: CorporateMetrics): number {
  return Math.round(100 - 40 * m.opCoverRatio);
}

export function scoreCorporate(m: CorporateMetrics) {
  return evaluateModel(SCM_CORP, m, MERIDIAN_PREVIOUS_ASSESSMENT.dimensions);
}
