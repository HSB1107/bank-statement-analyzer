import { describe, expect, it } from "vitest";
import { MERIDIAN_HDFC, MERIDIAN_ICICI, MERIDIAN_SBI, getMeridianDataset } from "./generators/meridian";
import { meridianInput } from "./meridian-input";
import { corporateMetrics, scoreCorporate } from "./scoring/corporate-model";
import {
  bankBalances,
  cashFlow,
  cashRunway,
  collectionWeeks,
  detectRoundTrips,
  odUtilisation,
  roundAmountTransfers,
  topOutgoing,
  waterfall,
} from "./selectors/corporate";

const ds = getMeridianDataset();
const input = meridianInput();
const crore = (minor: number) => Number((minor / 1e9).toFixed(2));
const pct1 = (r: number) => Number((r * 100).toFixed(1));
const cf = cashFlow(input);
const m = corporateMetrics(input);

describe("Meridian Precision — PDF invariants (computed from the seeded 9,318-transaction set)", () => {
  it("has 9,318 transactions split 4,206 / 3,912 / 1,200 and 3,402 Cr / 5,916 Dr", () => {
    const t = ds.transactions;
    expect(t).toHaveLength(9318);
    expect(t.filter((x) => x.accountId === MERIDIAN_ICICI)).toHaveLength(4206);
    expect(t.filter((x) => x.accountId === MERIDIAN_HDFC)).toHaveLength(3912);
    expect(t.filter((x) => x.accountId === MERIDIAN_SBI)).toHaveLength(1200);
    expect(m.quality.credits).toBe(3402);
    expect(m.quality.debits).toBe(5916);
  });

  it("every amount is a positive integer of minor units", () => {
    expect(
      ds.transactions.every((t) => Number.isInteger(t.amount.amountMinor) && t.amount.amountMinor > 0),
    ).toBe(true);
  });

  it("receipts proxy ₹156.40 cr reconciles from gross credits", () => {
    expect(crore(cf.totals.grossCredits)).toBe(223.8);
    expect(crore(cf.totals.ownTransfers)).toBe(62.2);
    expect(crore(cf.totals.loanProceeds)).toBe(4.0);
    expect(crore(cf.totals.relatedPartyReceipt)).toBe(1.2);
    expect(crore(cf.totals.reversals)).toBe(0);
    expect(crore(cf.totals.receiptsProxy)).toBe(156.4);
    expect(cf.ownTransferPairs).toBe(486);
  });

  it("monthly cash flow matches screen 12", () => {
    expect(cf.opIn.map(crore)).toEqual([27.1, 25.9, 31.3, 24.2, 25.8, 22.1]);
    expect(cf.opOut.map(crore)).toEqual([25.15, 24.21, 26.75, 25.35, 25.57, 25.92]);
    expect(cf.netOp.map(crore)).toEqual([1.95, 1.69, 4.55, -1.15, 0.23, -3.82]);
    expect(cf.financing.map(crore)).toEqual([-0.83, -0.84, 3.14, -0.88, -0.91, -0.93]);
    expect(cf.investing.map(crore)).toEqual([0, 0, 3.4, 0.85, 0, 0]);
    expect(cf.related.map(crore)).toEqual([0, 0, 0, 0, -1.25, 1.2]);
    expect(cf.netCash.map(crore)).toEqual([1.12, 0.85, 4.29, -2.88, -1.93, -3.55]);
  });

  it("net operating +₹3.45 cr (Q1 +₹8.19 cr, Q2 −₹4.74 cr); debt service proxy 0.66×", () => {
    expect(crore(cf.totals.netOp)).toBe(3.45);
    expect(crore(cf.totals.q1NetOp)).toBe(8.19);
    expect(crore(cf.totals.q2NetOp)).toBe(-4.74);
    expect(crore(cf.totals.opOut)).toBe(152.95);
    expect(crore(cf.totals.netCash)).toBe(-2.1);
    expect(cf.debtServiceProxy.toFixed(2)).toBe("0.66");
  });

  it("top-3 concentration 73.7% (Apex 37.0%), top-5 80.7%, HHI 0.21, 41 payers", () => {
    expect(pct1(m.concentration.top3Share)).toBe(73.7);
    expect(pct1(m.concentration.top5Share)).toBe(80.7);
    expect(m.concentration.top.map((c) => c.name)).toEqual([
      "Apex Motors Ltd",
      "Ridgeline Two-Wheelers",
      "Volta Auto Systems",
      "Kestrel Brakes GmbH",
      "Indus Tractors",
    ]);
    expect(m.concentration.top.map((c) => crore(c.totalMinor))).toEqual([57.8, 37.1, 20.3, 7.1, 3.9]);
    expect(pct1(m.concentration.top[0]?.share ?? 0)).toBe(37.0);
    expect(m.concentration.hhi.toFixed(2)).toBe("0.21");
    expect(m.concentration.payers).toBe(41);
    expect(m.concentration.recurringPayers).toBe(38);
    expect(m.concentration.rest.count).toBe(36);
    expect(crore(m.concentration.rest.totalMinor)).toBe(30.2);
    expect(pct1(m.collectionsQoQ)).toBe(-14.5);
    expect(pct1(m.leaderQoQ)).toBe(-18.2);
    expect(collectionWeeks(input).withCollections).toBe(26);
  });

  it("OD utilisation 47.7% vs ₹12.00 cr limit, peak 71% on 08-Jun; April SBI is Not Available", () => {
    const od = odUtilisation(input);
    if (od.status !== "available") throw new Error("OD expected");
    expect(crore(od.limitMinor)).toBe(12);
    expect(od.limitSource).toMatch(/Sanction_Letter/);
    expect(od.monthEnd.map((u) => (u.status === "available" ? pct1(u.value) : "N/A"))).toEqual([
      36.5,
      25.0,
      5.9,
      "N/A",
      21.5,
      47.7,
    ]);
    expect(pct1(od.peak.utilisation)).toBe(71.0);
    expect(od.peak.date).toBe("2026-06-08");
    const april = od.series.filter((p) => p.date.startsWith("2026-04"));
    expect(
      april.every((p) => p.utilisation.status === "not_available" && p.drawn.status === "not_available"),
    ).toBe(true);
    expect(ds.transactions.some((t) => t.accountId === MERIDIAN_SBI && t.date.startsWith("2026-04"))).toBe(
      false,
    );
    expect(m.coverage.covered).toBe(17);
    expect(m.coverage.total).toBe(18);
    expect(pct1(m.coverage.completeness)).toBe(94.4);
  });

  it("K S Trading round-trip: ₹1.25 cr out (28-May, ICICI row 3,902) → ₹1.20 cr back (10-Jun, HDFC row 3,211)", () => {
    const trips = detectRoundTrips(input);
    expect(trips).toHaveLength(1);
    const trip = trips[0];
    expect(trip?.counterpartyName).toBe("K S Trading Co");
    expect(crore(trip?.out.amount.amountMinor ?? 0)).toBe(1.25);
    expect(crore(trip?.back.amount.amountMinor ?? 0)).toBe(1.2);
    expect(trip?.days).toBe(13);
    expect(pct1(trip?.returnedShare ?? 0)).toBe(96.0);
    expect(trip?.out.source.row).toBe(3902);
    expect(trip?.out.source.page).toBe(181);
    expect(trip?.back.source.row).toBe(3211);
  });

  it("bank balances & liquidity match screen 12", () => {
    const b = bankBalances(input);
    expect(crore(b.averageMinor)).toBe(3.25);
    expect(crore(b.min.balanceMinor)).toBe(0.31);
    expect(b.min.date).toBe("2026-06-07");
    expect(crore(b.max.balanceMinor)).toBe(6.84);
    expect(b.max.date).toBe("2026-03-19");
    expect(crore(b.closingMinor)).toBe(1.92);
    expect(b.lowBalanceDays).toBe(9);
    expect(b.lowBalanceDates.every((d) => d.startsWith("2026-06"))).toBe(true);
    expect(b.negativeInstances).toBe(0);
    expect(crore(b.monthEnd[2] ?? 0)).toBe(5.27);
    const r = cashRunway(input);
    expect(crore(r.availableLiquidityMinor)).toBe(8.2);
    expect(crore(r.undrawnOdMinor)).toBe(6.28);
    expect(crore(r.avgOperatingOutflowMinor)).toBe(25.49);
    expect(crore(r.netOperatingBurnMinor)).toBe(1.58);
    expect(r.netBurnRunwayMonths.toFixed(1)).toBe("5.2");
    expect(Math.round(r.grossCoverDays)).toBe(10);
  });

  it("waterfall, suppliers and top outgoing", () => {
    const w = waterfall(input);
    expect(crore(w.collections)).toBe(156.4);
    expect(crore(w.suppliers)).toBe(111.8);
    expect(crore(w.payroll)).toBe(12.84);
    expect(crore(w.statutory)).toBe(11.65);
    expect(crore(w.otherOpex)).toBe(16.66);
    expect(crore(w.debtService)).toBe(5.25);
    expect(crore(w.capex)).toBe(4.25);
    expect(pct1(m.suppliers.top1Share)).toBe(39.1);
    expect(pct1(m.suppliers.top2Share)).toBe(57.1);
    expect(m.suppliers.supplierCount).toBe(56);
    expect(topOutgoing(input).map((o) => [o.name, crore(o.totalMinor)])).toEqual([
      ["Shakti Steel & Alloys", 43.7],
      ["Precision Castings Hub", 20.1],
      ["Payroll (412 employees)", 12.84],
      ["GSTN / CBDT / EPFO", 11.65],
      ["HDFC Bank · Term Loan", 5.25],
    ]);
    const round = roundAmountTransfers(input, [3, 4, 5]);
    expect(round).toHaveLength(4);
    expect(crore(round.reduce((a, t) => a + t.amount.amountMinor, 0))).toBe(5.4);
  });

  it("data quality: 9,107 categorised / 211 low-confidence, 6 confidence dimensions kept separate", () => {
    expect(m.quality.categorised).toBe(9107);
    expect(m.quality.lowConfidence).toBe(211);
    expect(pct1(m.quality.classificationConfidence)).toBe(97.7);
    expect(pct1(m.quality.extractionConfidence)).toBe(98.9);
    expect(pct1(m.quality.counterpartyConfidence)).toBe(96.4);
    expect(pct1(m.quality.ocrConfidence)).toBe(96.2);
    expect(m.quality.ocrBelow90).toBe(38);
    expect(m.quality.counterparties).toBe(412);
    expect(m.quality.aliases).toBe(38);
    expect(m.quality.duplicateRows).toBe(3);
    expect(crore(m.quality.duplicateAmountMinor)).toBe(0.42);
  });

  it("health score 61 from weighted dimensions (56, 54, 72, 58, 50, 76); previous 71", () => {
    const s = scoreCorporate(m);
    expect(s.dimensions.map((d) => d.score)).toEqual([56, 54, 72, 58, 50, 76]);
    expect(s.score).toBe(61);
    expect(s.previousScore).toBe(71);
  });
});
