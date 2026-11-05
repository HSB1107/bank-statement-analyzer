import { expect, it } from "vitest";
import { type DashboardFilters } from "../schemas/dashboard";
import { type DashboardService } from "./dashboard-service";

const ALL: DashboardFilters = { periodDays: 30, segment: "all", region: "all", analyst: "all" };

/** Contract every DashboardService adapter must satisfy. */
export function dashboardServiceContract(make: () => DashboardService): void {
  it("returns eight KPIs, a seven-stage pipeline and band counts that sum to the customer total", async () => {
    const o = await make().getOverview(ALL);
    expect(o.kpis).toHaveLength(8);
    expect(o.pipeline.stages).toHaveLength(7);
    expect(o.pipeline.stages.reduce((a, s) => a + s.count, 0)).toBe(o.pipeline.total);
    expect(o.health.bands.reduce((a, b) => a + b.count, 0)).toBe(o.health.total);
  });
  it("narrows counts when a segment filter is applied", async () => {
    const svc = make();
    const all = await svc.getOverview(ALL);
    const sme = await svc.getOverview({ ...ALL, segment: "sme" });
    const value = (o: typeof all, id: string) => o.kpis.find((k) => k.id === id)?.value ?? 0;
    expect(value(sme, "customersAnalysed")).toBeLessThan(value(all, "customersAnalysed"));
  });
  it("returns a liquidity snapshot in the requested currency", async () => {
    const l = await make().getLiquidity({ group: "retail", currency: "INR" });
    expect(l.avgInflow.currency).toBe("INR");
    expect(l.options.length).toBeGreaterThan(0);
  });
  it("leads the work queue with the PDF's named cases and filters by stage", async () => {
    const svc = make();
    const page = await svc.getWorkQueue({ filters: ALL });
    expect(page.rows[0]?.id).toBe("BSA-26-04417");
    expect(page.rows).toHaveLength(8);
    const review = await svc.getWorkQueue({ filters: ALL, stage: "underwriter_review", limit: 500 });
    expect(review.rows.every((r) => r.stage === "underwriter_review")).toBe(true);
    expect(review.total).toBe(87);
  });
}
