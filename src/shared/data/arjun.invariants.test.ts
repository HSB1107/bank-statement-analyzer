import { describe, expect, it } from "vitest";
import { ARJUN_ICICI, getArjunDataset } from "./generators/arjun";
import {
  individualMetrics,
  liquidityScore,
  liquiditySubScores,
  scoreIndividual,
} from "./scoring/individual-model";

const ds = getArjunDataset();
const m = individualMetrics({
  transactions: ds.transactions,
  accounts: ds.accounts,
  period: ds.customer.period,
  primaryAccountId: ARJUN_ICICI,
  lowBalanceThresholdMinor: 10_000_00,
  policyFoir: 0.5,
});
const rupees = (minor: number) => Math.round(minor / 100);
const pct1 = (ratio: number) => Number((ratio * 100).toFixed(1));

describe("Arjun Mehta — PDF invariants (computed from the seeded 124-transaction set)", () => {
  it("has 124 transactions across 2 INR accounts", () => {
    expect(ds.transactions).toHaveLength(124);
    expect(new Set(ds.transactions.map((t) => t.accountId)).size).toBe(2);
    expect(ds.transactions.every((t) => t.amount.currency === "INR")).toBe(true);
  });

  it("is deterministic (same seed → same ledger)", () => {
    expect(getArjunDataset().transactions[17]).toEqual(ds.transactions[17]);
  });

  it("avg monthly income ₹1,50,392 (salary + interest)", () => {
    expect(rupees(m.income.avgMonthlyIncomeMinor)).toBe(150392);
    expect(rupees(m.income.medianMonthlyIncomeMinor)).toBe(150720);
    expect(rupees(m.income.salaryTotalMinor)).toBe(897900);
    expect(rupees(m.income.totalCreditsMinor)).toBe(1220750);
    expect(rupees(m.income.ownTransfersInMinor)).toBe(150000);
    expect(pct1(m.income.salaryGrowthQ1toQ2)).toBe(10.0);
    expect(pct1(m.income.salaryCv)).toBe(4.8);
  });

  it("FOIR 15.4% = ₹24,450 / ₹1,59,110 (June)", () => {
    expect(rupees(m.obligations.numeratorMinor)).toBe(24450);
    expect(rupees(m.obligations.denominatorMinor)).toBe(159110);
    expect(pct1(m.obligations.foirLatest)).toBe(15.4);
    expect(m.obligations.foirByMonth.map(pct1)).toEqual([10.2, 10.2, 10.1, 9.3, 15.6, 15.4]);
    expect(rupees(m.obligations.headroomMinor)).toBe(55105);
    expect(pct1(m.obligations.fixedObligationRatio)).toBe(35.5);
  });

  it("expense-to-income 93.5% (mean of monthly ratios, Jan 81.7% → Jun 100.4%)", () => {
    expect(pct1(m.cash.expenseToIncome)).toBe(93.5);
    expect(pct1(m.cash.expenseRatios[0] ?? 0)).toBe(81.7);
    expect(pct1(m.cash.expenseRatios[5] ?? 0)).toBe(100.4);
    expect(rupees(m.cash.avgMonthlyOutflowMinor)).toBe(141048);
  });

  it("cash flow table reconciles", () => {
    expect(rupees(m.cash.totalInMinor)).toBe(1220750);
    expect(rupees(m.cash.totalOutMinor)).toBe(1146290);
    expect(rupees(m.cash.netMinor)).toBe(74460);
    expect(m.cash.inByMonth.map((v) => Math.round(v / 100_000))).toEqual([143, 143, 163, 457, 157, 159]);
    expect(m.cash.outByMonth.map((v) => Math.round(v / 100_000))).toEqual([126, 129, 155, 402, 165, 170]);
    expect(m.cash.monthEnd.map((v) => Math.round(v / 100_000))).toEqual([264, 278, 286, 341, 333, 322]);
    expect(pct1(m.cash.cashFlowMargin)).toBe(6.1);
    expect(pct1(m.cash.cashRetention)).toBe(8.3);
    expect(m.cash.negativeMonths).toBe(2);
  });

  it("liquidity figures match screen 08", () => {
    expect(rupees(m.liquidity.avgDailyBalanceMinor)).toBe(339009);
    expect(rupees(m.liquidity.avgMonthlyBalanceMinor)).toBe(338966);
    expect(rupees(m.liquidity.avgMonthEndMinor)).toBe(304207);
    expect(rupees(m.liquidity.min.balanceMinor)).toBe(264100);
    expect(rupees(m.liquidity.max.balanceMinor)).toBe(603860);
    expect(m.liquidity.max.date).toBe("2026-04-18");
    expect(rupees(m.liquidity.closingMinor)).toBe(322460);
    expect(m.liquidity.lowBalanceDays).toBe(10);
    expect(m.liquidity.negativeBalanceDays).toBe(0);
    expect(m.liquidity.hasOdFacility).toBe(false);
    expect(Number(m.liquidity.liquidityBufferMonths.toFixed(1))).toBe(2.3);
    expect(rupees(m.liquidity.primaryLow.balanceMinor)).toBe(4510);
    expect(m.liquidity.primaryLow.date).toBe("2026-05-05");
  });

  it("May EMI return: ACH returned 05-May, ₹590 charge, cleared 08-May", () => {
    const s = m.obligations.servicing;
    expect(s.failedAutoDebits).toHaveLength(1);
    expect(s.failedAutoDebits[0]?.date).toBe("2026-05-05");
    expect(s.penaltyCharges.map((t) => rupees(t.amount.amountMinor))).toEqual([590]);
    expect(s.delayedEmis.map((t) => t.date)).toEqual(["2026-05-08"]);
    expect(s.calendar[4]?.auto).toEqual({ kind: "returned_then_paid", returnedDay: 5, paidDay: 8 });
    expect(s.newLoanDeductions).toHaveLength(1);
  });

  it("health score 72 from weighted dimensions (84, 58, 62, 78, 82, 70)", () => {
    const result = scoreIndividual(m);
    expect(result.dimensions.map((d) => d.score)).toEqual([84, 58, 62, 78, 82, 70]);
    expect(result.dimensions.map((d) => d.weight)).toEqual([0.25, 0.2, 0.2, 0.2, 0.075, 0.075]);
    expect(result.score).toBe(72);
    expect(result.previousScore).toBe(80);
    expect(Object.values(liquiditySubScores(m))).toEqual([78, 48, 52, 60, 62, 66]);
    expect(Math.round(liquidityScore(m))).toBe(58);
  });

  it("transaction quality: 96.0% classified, 4.0% miscellaneous, 99.4% extraction", () => {
    expect(pct1(m.quality.classifiedShare)).toBe(96.0);
    expect(pct1(m.quality.miscShare)).toBe(4.0);
    expect(pct1(m.quality.extractionConfidence)).toBe(99.4);
    expect(pct1(m.cardGrowth)).toBe(53.5);
  });
});
