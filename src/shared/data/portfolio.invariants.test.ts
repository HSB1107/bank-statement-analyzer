import { describe, expect, it } from "vitest";
import { getPortfolio } from "./generators/portfolio";
import {
  DEFAULT_FILTERS,
  dashboardKpis,
  healthDistribution,
  insightCounts,
  pipeline,
  processingQuality,
  regionalOverview,
  retailLiquidity,
  segmentBreakdown,
} from "./selectors/portfolio";

const p = getPortfolio();
const pct1 = (r: number) => Number((r * 100).toFixed(1));

describe("Executive dashboard — computed from the seeded portfolio", () => {
  it("KPI cards", () => {
    const k = dashboardKpis(p, DEFAULT_FILTERS);
    expect([k.customersAnalysed.value, pct1(k.customersAnalysed.delta)]).toEqual([1184, 7.4]);
    expect([k.bankAccounts.value, pct1(k.bankAccounts.delta)]).toEqual([2736, 9.1]);
    expect([k.analysisCases.value, pct1(k.analysisCases.delta)]).toEqual([2947, 8.6]);
    expect([k.statementsQueued.value, pct1(k.statementsQueued.delta)]).toEqual([214, 31.3]);
    // PDF shows +12.9%; 87 vs 77 is +13.0% (see docs/DECISIONS.md).
    expect([k.awaitingReview.value, pct1(k.awaitingReview.delta)]).toEqual([87, 13.0]);
    expect([k.profilesGenerated.value, pct1(k.profilesGenerated.delta)]).toEqual([2318, 10.2]);
    expect([k.criticalSignals.value, pct1(k.criticalSignals.delta)]).toEqual([42, 27.3]);
    expect([k.avgProcessingMinutes.value, pct1(k.avgProcessingMinutes.delta)]).toEqual([6.8, -21.8]);
  });
  it("pipeline 46 / 61 / 29 / 52 / 18 / 87 / 2,318 = 2,611", () => {
    const pl = pipeline(p, DEFAULT_FILTERS);
    expect(pl.stages.map((s) => s.count)).toEqual([46, 61, 29, 52, 18, 87, 2318]);
    expect(pl.total).toBe(2611);
  });
  it("financial health bands and segments", () => {
    expect(healthDistribution(p, DEFAULT_FILTERS).bands.map((b) => b.count)).toEqual([
      162, 431, 362, 168, 61,
    ]);
    expect(
      segmentBreakdown(p).map((s) => [
        s.customers,
        s.accounts,
        s.cases,
        Number(s.accountsPerCustomer.toFixed(1)),
      ]),
    ).toEqual([
      [612, 1104, 1368, 1.8],
      [238, 461, 579, 1.9],
      [251, 812, 694, 3.2],
      [83, 359, 306, 4.3],
    ]);
  });
  it("retail INR liquidity & risk", () => {
    const l = retailLiquidity(p, "retail", "INR");
    expect((l.avgInflow / 1e5).toFixed(2)).toBe("1.38");
    expect((l.avgOutflow / 1e5).toFixed(2)).toBe("1.29");
    expect((l.avgNet / 1e3).toFixed(1)).toBe("9.1");
    expect((l.avgBalance / 1e5).toFixed(2)).toBe("2.06");
    expect([pct1(l.negativeNetShare), pct1(l.irregularIncomeShare), pct1(l.foirAbove50Share)]).toEqual([
      23.4, 17.8, 11.2,
    ]);
  });
  it("regions and processing quality", () => {
    expect(regionalOverview(p).map((r) => r.cases)).toEqual([2214, 418, 315]);
    const q = processingQuality(p);
    expect([
      pct1(q.extraction),
      pct1(q.autoClassified),
      pct1(q.ownTransfers),
      pct1(q.statementsWithGaps),
      pct1(q.reclassifications),
      pct1(q.reconFailures),
    ]).toEqual([97.6, 93.1, 11.4, 6.2, 2.8, 0.9]);
  });
  it("AI insight counts", () => {
    const i = insightCounts(p);
    expect([
      i.circular_flow.count,
      i.amb_decline.count,
      i.salary_continuity.count,
      i.emi_increase.count,
      i.inflow_concentration.count,
    ]).toEqual([2, 8, 5, 6, 3]);
    expect(i.circular_flow.caseIds[0]).toBe("BSA-26-04421");
  });
});
