import { expect, it } from "vitest";
import { CustomerIdSchema } from "@/shared/data/schemas/ids";
import { toMajor } from "@/shared/lib/money";
import { type IndividualProfileService } from "./individual-service";

const ARJUN = CustomerIdSchema.parse("CUST-IN-R-210457");

/** Contract every IndividualProfileService adapter must satisfy. */
export function individualServiceContract(make: () => IndividualProfileService): void {
  it("overview: ₹1,50,392 income, 15.4% FOIR, 93.5% expense-to-income, health 72", async () => {
    const o = await make().getOverview(ARJUN);
    expect(Math.round(toMajor(o.kpis.avgMonthlyIncome))).toBe(150392);
    expect((o.kpis.foir * 100).toFixed(1)).toBe("15.4");
    expect((o.kpis.expenseToIncome * 100).toFixed(1)).toBe("93.5");
    expect(o.health.score).toBe(72);
    expect(o.dimensions.map((d) => d.score)).toEqual([84, 58, 62, 78, 82, 70]);
    expect(o.summary.lines.map((l) => l.provenance)).toEqual([
      "FACT",
      "DERIVED",
      "FACT",
      "FACT",
      "AI",
      "INVESTIGATE",
    ]);
  });
  it("income, liquidity and obligations tabs reconcile", async () => {
    const svc = make();
    const i = await svc.getIncome(ARJUN);
    expect(Math.round(toMajor(i.kpis.totalCredits))).toBe(1220750);
    const l = await svc.getLiquidity(ARJUN);
    expect(l.series).toHaveLength(181);
    expect(l.kpis.lowBalanceDays).toBe(10);
    const ob = await svc.getObligations(ARJUN);
    expect(Math.round(toMajor(ob.headroom))).toBe(55105);
    expect(ob.calendar[4]?.cells[0]).toEqual({ kind: "returned_then_paid", returnedDay: 5, paidDay: 8 });
  });
  it("rejects non-demo customers", async () => {
    await expect(make().getOverview(CustomerIdSchema.parse("CUST-IN-R-999999"))).rejects.toThrow();
  });
}
