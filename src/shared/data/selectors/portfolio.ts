import { type HealthBand, type CaseStage } from "../schemas/case";
import { type Region } from "../schemas/customer";
import { type Currency } from "@/shared/lib/money";
import {
  INSIGHT_TARGETS,
  type InsightFlag,
  type Portfolio,
  type PortfolioCase,
  type PortfolioCustomer,
  type PortfolioSegment,
} from "../generators/portfolio";
import { mean } from "./ledger";

/** Pure selectors over the seeded portfolio (Executive Dashboard). */

export type SegmentFilter = "all" | "retail" | "corporate_all" | PortfolioSegment;
export type RegionFilter = "all" | Region;

export interface PortfolioFilters {
  segment: SegmentFilter;
  region: RegionFilter;
  analyst: string | "all";
  /** KPI comparison window in days (30 = "Last 30 days"). */
  periodDays: 30 | 90;
}

export const DEFAULT_FILTERS: PortfolioFilters = {
  segment: "all",
  region: "all",
  analyst: "all",
  periodDays: 30,
};

function segmentMatches(seg: string, f: SegmentFilter): boolean {
  if (f === "all") return true;
  if (f === "retail") return seg === "salaried" || seg === "self_employed" || seg === "gig";
  if (f === "corporate_all") return seg === "sme" || seg === "corporate";
  return seg === f || (f === "self_employed" && seg === "gig");
}

export function filterCases(p: Portfolio, f: PortfolioFilters): PortfolioCase[] {
  return p.cases.filter(
    (c) =>
      segmentMatches(c.segment, f.segment) &&
      (f.region === "all" || c.region === f.region) &&
      (f.analyst === "all" || c.analyst === f.analyst),
  );
}

export function filterCustomers(p: Portfolio, f: PortfolioFilters): PortfolioCustomer[] {
  return p.customers.filter(
    (c) => segmentMatches(c.segment, f.segment) && (f.region === "all" || c.region === f.region),
  );
}

const growth = (now: number, before: number) => (before ? now / before - 1 : 0);

/** Weekly cumulative series (8 points) for sparklines. */
function cumulativeSeries(daysAgo: readonly number[], weeks = 8): number[] {
  return Array.from({ length: weeks }, (_, w) => {
    const cutoff = (weeks - 1 - w) * 7;
    return daysAgo.filter((d) => d >= cutoff).length;
  });
}

export function dashboardKpis(p: Portfolio, f: PortfolioFilters) {
  const customers = filterCustomers(p, f);
  const cases = filterCases(p, f);
  const window = f.periodDays;
  const accountsNow = customers.reduce((a, c) => a + c.accounts, 0);
  const accountsBefore = customers
    .filter((c) => c.createdDaysAgo >= window)
    .reduce((a, c) => a + c.accounts, 0);
  const completed = cases.filter((c) => c.stage === "completed");
  const scale = cases.length / Math.max(1, p.cases.length);
  const snap = (key: keyof Portfolio["snapshots"]) => {
    const s = p.snapshots[key];
    const now = s[s.length - 1] ?? 0;
    const before = s[Math.max(0, s.length - 1 - window)] ?? s[0] ?? 0;
    return { now, before, series: s.slice(-8) };
  };
  const queued = snap("statementsQueued");
  const critical = snap("criticalSignals");
  const avgProc = snap("avgProcessingMinutes");
  const review = cases.filter((c) => c.stage === "underwriter_review").length;
  const reviewBefore = Math.round(snap("awaitingReview").before * scale);
  return {
    customersAnalysed: {
      value: customers.length,
      delta: growth(customers.length, customers.filter((c) => c.createdDaysAgo >= window).length),
      series: cumulativeSeries(customers.map((c) => c.createdDaysAgo)),
    },
    bankAccounts: {
      value: accountsNow,
      delta: growth(accountsNow, accountsBefore),
      series: cumulativeSeries(
        customers.flatMap((c) => Array.from({ length: c.accounts }, () => c.createdDaysAgo)),
      ),
    },
    analysisCases: {
      value: cases.length,
      delta: growth(cases.length, cases.filter((c) => c.createdDaysAgo >= window).length),
      series: cumulativeSeries(cases.map((c) => c.createdDaysAgo)),
    },
    statementsQueued: {
      value: Math.round(queued.now * scale),
      delta: growth(queued.now, queued.before),
      series: queued.series,
    },
    awaitingReview: {
      value: review,
      delta: growth(review, reviewBefore),
      series: snap("awaitingReview").series,
    },
    profilesGenerated: {
      value: completed.length,
      delta: growth(completed.length, completed.filter((c) => (c.completedDaysAgo ?? 0) >= window).length),
      series: cumulativeSeries(completed.map((c) => c.completedDaysAgo ?? 0)),
    },
    criticalSignals: {
      value: Math.round(critical.now * scale),
      delta: growth(critical.now, critical.before),
      series: critical.series,
    },
    avgProcessingMinutes: {
      value: avgProc.now,
      delta: growth(avgProc.now, avgProc.before),
      series: avgProc.series,
    },
  };
}

export const PIPELINE_STAGES: readonly CaseStage[] = [
  "new",
  "docs_uploaded",
  "ai_processing",
  "txn_validation",
  "financial_profiling",
  "underwriter_review",
  "completed",
];

export function pipeline(p: Portfolio, f: PortfolioFilters) {
  const cases = filterCases(p, f).filter((c) => c.stage !== "archived");
  const counts = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: cases.filter((c) => c.stage === stage).length,
  }));
  return { total: cases.length, stages: counts };
}

export function openCases(p: Portfolio, f: PortfolioFilters): PortfolioCase[] {
  return filterCases(p, f)
    .filter((c) => c.stage !== "archived" && (c.stage !== "completed" || c.demo || c.updatedMinutesAgo < 120))
    .sort((a, b) => a.updatedMinutesAgo - b.updatedMinutesAgo);
}

const BANDS: readonly HealthBand[] = ["strong", "healthy", "watchlist", "weak", "critical"];

export function healthDistribution(p: Portfolio, f: PortfolioFilters) {
  const customers = filterCustomers(p, f);
  return {
    total: customers.length,
    bands: BANDS.map((band) => ({ band, count: customers.filter((c) => c.health.band === band).length })),
  };
}

export function segmentBreakdown(p: Portfolio) {
  const segs: readonly PortfolioSegment[] = ["salaried", "self_employed", "sme", "corporate"];
  return segs.map((segment) => {
    const customers = p.customers.filter((c) => c.segment === segment);
    const accounts = customers.reduce((a, c) => a + c.accounts, 0);
    const cases = p.cases.filter((c) => segmentMatches(c.segment, segment)).length;
    return {
      segment,
      customers: customers.length,
      accounts,
      cases,
      accountsPerCustomer: customers.length ? accounts / customers.length : 0,
    };
  });
}

export function retailLiquidity(p: Portfolio, group: "retail" | "corporate_all", currency: Currency) {
  const panel = p.customers.filter(
    (c) => segmentMatches(c.segment, group) && c.currency === currency && c.avgInflow > 0,
  );
  const n = panel.length;
  return {
    customers: n,
    avgInflow: mean(panel.map((c) => c.avgInflow)),
    avgOutflow: mean(panel.map((c) => c.avgOutflow)),
    avgNet: mean(panel.map((c) => c.avgInflow - c.avgOutflow)),
    avgBalance: mean(panel.map((c) => c.avgBalance)),
    negativeNetShare: n ? panel.filter((c) => c.avgOutflow > c.avgInflow).length / n : 0,
    irregularIncomeShare: n ? panel.filter((c) => c.irregularIncome).length / n : 0,
    foirAbove50Share: n ? panel.filter((c) => c.foirAbove50).length / n : 0,
  };
}

export function regionalOverview(p: Portfolio) {
  const regions: readonly Region[] = ["IN", "ME", "ANZ"];
  return regions.map((region) => {
    const cases = p.cases.filter((c) => c.region === region);
    const byId = new Map(p.customers.map((c) => [c.id, c]));
    const bands = BANDS.map((band) => ({
      band,
      count: cases.filter((c) => (c.customerId ? byId.get(c.customerId)?.health.band : undefined) === band)
        .length,
    }));
    const currencies = [...new Set(cases.map((c) => c.currency))];
    return { region, cases: cases.length, bands, currencies };
  });
}

export function processingQuality(p: Portfolio) {
  const recent = p.cases.filter((c) => c.quality !== null);
  const q = recent
    .map((c) => c.quality)
    .filter((x): x is NonNullable<PortfolioCase["quality"]> => x !== null);
  const n = q.length;
  return {
    cases: n,
    extraction: mean(q.map((x) => x.extraction)),
    autoClassified: mean(q.map((x) => x.autoClassified)),
    ownTransfers: mean(q.map((x) => x.ownTransferShare)),
    statementsWithGaps: q.reduce((a, x) => a + x.statements, 0)
      ? q.reduce((a, x) => a + x.statementsWithGaps, 0) / q.reduce((a, x) => a + x.statements, 0)
      : 0,
    reclassifications: mean(q.map((x) => x.reclassified)),
    reconFailures: n ? q.filter((x) => x.reconFailure).length / n : 0,
  };
}

export function insightCounts(p: Portfolio): Record<InsightFlag, { count: number; caseIds: string[] }> {
  const flags = Object.keys(INSIGHT_TARGETS).filter((k): k is InsightFlag => k in INSIGHT_TARGETS);
  const entries = flags.map((flag) => {
    const cases = p.cases.filter((c) => c.insightFlags.includes(flag));
    return [
      flag,
      {
        count: cases.length,
        caseIds: cases
          .map((c) => c.id)
          .sort((a, b) => (a.startsWith("BSA-26-044") ? -1 : b.startsWith("BSA-26-044") ? 1 : 0)),
      },
    ] as const;
  });
  return {
    circular_flow: entries.find(([f]) => f === "circular_flow")?.[1] ?? { count: 0, caseIds: [] },
    amb_decline: entries.find(([f]) => f === "amb_decline")?.[1] ?? { count: 0, caseIds: [] },
    salary_continuity: entries.find(([f]) => f === "salary_continuity")?.[1] ?? { count: 0, caseIds: [] },
    emi_increase: entries.find(([f]) => f === "emi_increase")?.[1] ?? { count: 0, caseIds: [] },
    inflow_concentration: entries.find(([f]) => f === "inflow_concentration")?.[1] ?? {
      count: 0,
      caseIds: [],
    },
  };
}
