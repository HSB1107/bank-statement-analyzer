import { formatMoney, formatPercent } from "@/shared/lib/format";
import { money } from "@/shared/lib/money";
import {
  cardSpendGrowth,
  cashFlowAnalysis,
  incomeAnalysis,
  liquidityAnalysis,
  obligationAnalysis,
  transactionQuality,
  type IndividualInput,
} from "../selectors/individual";
import { composite, evaluateModel, type ScoringModel } from "./model";

/** All metrics the retail scoring model needs, computed once from the transaction set. */
export function individualMetrics(input: IndividualInput) {
  const income = incomeAnalysis(input);
  const cash = cashFlowAnalysis(input);
  const liquidity = liquidityAnalysis(input);
  const obligations = obligationAnalysis(input);
  const quality = transactionQuality(input.transactions);
  return { income, cash, liquidity, obligations, quality, cardGrowth: cardSpendGrowth(input.transactions) };
}
export type IndividualMetrics = ReturnType<typeof individualMetrics>;

const inr = (minor: number, scale: "full" | "lakh" = "full") =>
  formatMoney(money(Math.round(minor)), { scale });

/* ---------- IS-RTL v1.2 · Income Stability Indicator ---------- */
export const INCOME_STABILITY_RULES = {
  id: "IS-RTL",
  version: "v1.2",
  /** −1 point per 1% salary coefficient of variation. */
  cvPenaltyPerPct: 1,
  singleSourceThreshold: 0.9,
  singleSourcePenalty: 4,
  nonRecurringShareThreshold: 0.2,
  nonRecurringPenalty: 3,
  delayedCreditPenalty: 4,
  missedCreditPenalty: 10,
  minimumMonths: 6,
} as const;

export function incomeStabilityScore(m: IndividualMetrics): number {
  const r = INCOME_STABILITY_RULES;
  return (
    100 -
    Math.round(m.income.salaryCv * 100 * r.cvPenaltyPerPct) -
    (m.income.singleSourceDependence > r.singleSourceThreshold ? r.singleSourcePenalty : 0) -
    (m.income.nonRecurringShareOfCredits > r.nonRecurringShareThreshold ? r.nonRecurringPenalty : 0) -
    m.income.delayedCount * r.delayedCreditPenalty -
    m.income.missedCount * r.missedCreditPenalty
  );
}

/* ---------- LQ-RTL v1.4 · Liquidity Health Indicator ---------- */
export const LIQUIDITY_RULES = {
  id: "LQ-RTL",
  version: "v1.4",
  /** Average balance: 20 + 24 × (ADB ÷ avg monthly outflow). */
  avgBalanceBase: 20,
  avgBalancePerMonth: 24,
  /** Balance volatility: 100 − k × CV of salary-account daily balance. */
  volatilityK: 69.5,
  lowBalancePenaltyPerDay: 4.8,
  /** Recurring obligations: 2.45 × uncommitted share of latest income. */
  uncommittedMultiplier: 2.45,
  latestNegativePenalty: 5,
  bufferPointsPerMonth: 29,
  weights: {
    avgBalance: 0.1,
    volatility: 0.25,
    lowBalance: 0.25,
    obligations: 0.2,
    consistency: 0.1,
    buffer: 0.1,
  },
} as const;

export function liquiditySubScores(m: IndividualMetrics) {
  const r = LIQUIDITY_RULES;
  const avgOut = m.cash.avgMonthlyOutflowMinor || 1;
  const latestIncome = m.obligations.denominatorMinor || 1;
  return {
    avgBalance: Math.round(
      r.avgBalanceBase + r.avgBalancePerMonth * (m.liquidity.avgDailyBalanceMinor / avgOut),
    ),
    volatility: Math.round(100 - r.volatilityK * m.liquidity.primarySeriesCv),
    lowBalance: Math.round(100 - r.lowBalancePenaltyPerDay * m.liquidity.lowBalanceDays),
    obligations: Math.round(
      r.uncommittedMultiplier * 100 * (1 - m.obligations.committedJuneMinor / latestIncome),
    ),
    consistency: Math.round(
      (100 * m.cash.positiveMonths) / 6 - (m.cash.latestMonthNegative ? r.latestNegativePenalty : 0),
    ),
    buffer: Math.round(Math.min(100, r.bufferPointsPerMonth * m.liquidity.liquidityBufferMonths)),
  };
}

export function liquidityScore(m: IndividualMetrics): number {
  const s = liquiditySubScores(m);
  const w = LIQUIDITY_RULES.weights;
  return composite([
    { score: s.avgBalance, weight: w.avgBalance },
    { score: s.volatility, weight: w.volatility },
    { score: s.lowBalance, weight: w.lowBalance },
    { score: s.obligations, weight: w.obligations },
    { score: s.consistency, weight: w.consistency },
    { score: s.buffer, weight: w.buffer },
  ]);
}

/* ---------- SCM-RTL v2.1 · Financial Health Score ---------- */
export const SCM_RTL: ScoringModel<IndividualMetrics> = {
  id: "SCM-RTL",
  version: "v2.1",
  dimensions: [
    {
      id: "incomeStability",
      label: "Income Stability",
      weight: 0.25,
      confidence: "High",
      score: incomeStabilityScore,
      factors: (m) => [
        {
          direction: "positive",
          text: `Salary ${m.income.salaryCreditCount}/6 months · CV ${formatPercent(m.income.salaryCv)} · ${formatPercent(m.income.revisionPct, 1, "always")} revision in ${["Jan", "Feb", "Mar", "Apr", "May", "Jun"][m.income.revisionMonth] ?? "—"}`,
        },
        ...(m.income.delayedDetail
          ? [
              {
                direction: "negative" as const,
                text: `${["Jan", "Feb", "Mar", "Apr", "May", "Jun"][m.income.delayedDetail.month] ?? ""} salary credited ${m.income.delayedDetail.delayDays} days late`,
              },
            ]
          : []),
      ],
    },
    {
      id: "liquidity",
      label: "Liquidity Health",
      weight: 0.2,
      confidence: "High",
      score: liquidityScore,
      factors: (m) => [
        { direction: "positive", text: `Consolidated ADB ${inr(m.liquidity.avgDailyBalanceMinor, "lakh")}` },
        {
          direction: "negative",
          text: `Primary a/c fell to ${inr(m.liquidity.primaryLow.balanceMinor)} · ${m.liquidity.lowBalanceDays} low-balance days`,
        },
      ],
    },
    {
      id: "cashFlow",
      label: "Cash Flow Strength",
      weight: 0.2,
      confidence: "High",
      // 50% share of positive months + 50% retention (7 points per 1% retained).
      score: (m) =>
        0.5 * ((100 * m.cash.positiveMonths) / 6) + 0.5 * Math.min(100, m.cash.cashRetention * 100 * 7),
      factors: (m) => [
        { direction: "positive", text: `Net positive in ${m.cash.positiveMonths} of 6 months` },
        {
          direction: "negative",
          text: `Net negative ${negativeMonthLabels(m.cash.netByMonth)} · retention ${formatPercent(m.cash.cashRetention)}`,
        },
      ],
    },
    {
      id: "debtCapacity",
      label: "Debt Obligation Capacity",
      weight: 0.2,
      confidence: "High",
      // 100 − 0.75 × FOIR% − 10 per failed auto-debit.
      score: (m) =>
        100 - 0.75 * m.obligations.foirLatest * 100 - 10 * m.obligations.servicing.failedAutoDebits.length,
      factors: (m) => [
        { direction: "positive", text: `FOIR ${formatPercent(m.obligations.foirLatest)} vs 50% policy` },
        {
          direction: "negative",
          text: `New PL EMI ${inr(m.obligations.plEmiMinor)} from May · ${m.obligations.servicing.failedAutoDebits.length} failed ACH`,
        },
      ],
    },
    {
      id: "transactionQuality",
      label: "Transaction Quality",
      weight: 0.075,
      confidence: "Medium",
      // 100 − 4 × miscellaneous% − 2 per excluded (returned/duplicate) row.
      score: (m) => 100 - 4 * m.quality.miscShare * 100 - 2 * m.quality.excludedRows,
      factors: (m) => [
        {
          direction: "positive",
          text: `${Math.round(m.quality.classifiedShare * 100)}% classified · ${m.quality.duplicates === 0 ? "no duplicates" : `${m.quality.duplicates} duplicates`}`,
        },
        { direction: "negative", text: `${formatPercent(m.quality.miscShare)} grouped as miscellaneous` },
      ],
    },
    {
      id: "consistency",
      label: "Financial Consistency",
      weight: 0.075,
      confidence: "Medium",
      // 100 − 0.56 × % growth in card settlements (discretionary spend drift).
      score: (m) => 100 - 0.56 * m.cardGrowth * 100,
      factors: (m) => [
        { direction: "positive", text: "Recurring commitments stable" },
        {
          direction: "negative",
          text: `Card settlements ${formatPercent(m.cardGrowth, 1, "always")} Jan → Jun`,
        },
      ],
    },
  ],
};

function negativeMonthLabels(net: readonly number[]): string {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return net
    .map((n, i) => (n < 0 ? names[i] : null))
    .filter((x): x is string => x !== null)
    .join(" & ");
}

/** Previous assessment (Jul–Dec 2025) as stored by the scoring service. */
export const ARJUN_PREVIOUS_ASSESSMENT = {
  period: "Jul-Dec 25",
  dimensions: {
    incomeStability: 86,
    liquidity: 72,
    cashFlow: 74,
    debtCapacity: 88,
    transactionQuality: 84,
    consistency: 76,
  },
  radar: {
    incomeStability: 86,
    liquidity: 72,
    cashFlow: 74,
    debtCapacity: 88,
    balanceBehaviour: 66,
    consistency: 76,
  },
} as const;

export function scoreIndividual(m: IndividualMetrics) {
  return evaluateModel(SCM_RTL, m, ARJUN_PREVIOUS_ASSESSMENT.dimensions);
}
