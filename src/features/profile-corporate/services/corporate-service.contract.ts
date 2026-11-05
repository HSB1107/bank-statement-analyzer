import { expect, it } from "vitest";
import { CustomerIdSchema } from "@/shared/data/schemas/ids";
import { type CorporateProfileService } from "./corporate-service";

const MERIDIAN = CustomerIdSchema.parse("CUST-IN-000318");
const cr = (m: { amountMinor: number }) => Number((m.amountMinor / 1e9).toFixed(2));

/** Contract every CorporateProfileService adapter must satisfy. */
export function corporateServiceContract(make: () => CorporateProfileService): void {
  it("overview KPIs: ₹156.40 cr receipts, +₹3.45 cr net op, 73.7% top-3, 47.7% OD, health 61", async () => {
    const o = await make().getOverview(MERIDIAN);
    expect(cr(o.kpis.receiptsProxy)).toBe(156.4);
    expect(cr(o.kpis.netOperating)).toBe(3.45);
    expect((o.kpis.top3Share * 100).toFixed(1)).toBe("73.7");
    expect(o.kpis.odUtilJune.status === "available" && (o.kpis.odUtilJune.value * 100).toFixed(1)).toBe(
      "47.7",
    );
    expect(o.health.score).toBe(61);
    expect(o.radar.axes).toHaveLength(7);
  });
  it("inflows methodology reconciles to the receipts proxy", async () => {
    const i = await make().getInflows(MERIDIAN);
    expect(i.methodology.rows.map((r) => cr(r.amount))).toEqual([223.8, 62.2, 4.0, 1.2, 0, 156.4]);
    expect(i.concentration.rows).toHaveLength(6);
  });
  it("liquidity marks April OD as Not Available and closes the waterfall", async () => {
    const l = await make().getLiquidity(MERIDIAN);
    expect(l.cashflow.odMonthEnd[3]?.status).toBe("not_available");
    expect(
      l.od.series
        .filter((p) => p.date.startsWith("2026-04"))
        .every((p) => p.utilisation.status === "not_available"),
    ).toBe(true);
    const wf = l.waterfall;
    const flows = wf
      .slice(1, -1)
      .reduce((a, s) => a + (s.kind === "in" ? s.amount.amountMinor : -s.amount.amountMinor), 0);
    expect((wf[0]?.amount.amountMinor ?? 0) + flows).toBe(wf.at(-1)?.amount.amountMinor);
    expect(cr(wf.at(-1)?.amount ?? { amountMinor: 0 })).toBe(-3.8);
  });
  it("fund flow selects K S Trading with round-trip evidence", async () => {
    const f = await make().getFundFlow(MERIDIAN);
    const d = f.details[f.defaultSelection];
    expect(d?.title).toBe("K S Trading Co");
    expect(d?.triggering.map((t) => cr(t.amount))).toEqual([1.25, 1.2]);
    expect(f.signals[0]?.severity).toBe("critical");
  });
}
