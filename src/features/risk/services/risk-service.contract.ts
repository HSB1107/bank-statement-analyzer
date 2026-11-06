import { expect, it } from "vitest";
import { CaseIdSchema, SignalIdSchema } from "@/shared/data/schemas/ids";
import { type RiskService } from "./risk-service";

const MERIDIAN = CaseIdSchema.parse("BSA-26-04421");
const ARJUN = CaseIdSchema.parse("BSA-26-04417");
const sid = (s: string) => SignalIdSchema.parse(s);

/** Contract every RiskService adapter must satisfy (screen 11 numbers). */
export function riskServiceContract(make: () => RiskService): void {
  it("Meridian: 8 signals ranked by severity, severity cards 1/3/3/1, badge 7", async () => {
    const w = await make().getWorkspace(MERIDIAN);
    expect(w.signals.map((s) => s.id)).toEqual([
      "RS-C-04",
      "RS-C-01",
      "RS-C-02",
      "RS-C-03",
      "RS-C-05",
      "RS-C-06",
      "RS-C-07",
      "RS-C-08",
    ]);
    expect(w.severity.map((s) => [s.severity, s.count, s.note])).toEqual([
      ["critical", 1, "fund flow"],
      ["high", 3, "liquidity · cash flow · concentration"],
      ["medium", 3, "collections · integrity"],
      ["low", 1, "marked false positive"],
    ]);
    expect(w.activeCount).toBe(7);
    expect(w.rulesEvaluated).toBe(31);
  });

  it("Meridian: six separate confidence dimensions and the April gap", async () => {
    const w = await make().getWorkspace(MERIDIAN);
    const pct = (id: string) => {
      const v = w.confidence.find((c) => c.id === id)?.value;
      return v?.status === "available" ? (v.value * 100).toFixed(1) : null;
    };
    expect([
      pct("ocr"),
      pct("extraction"),
      pct("classification"),
      pct("counterparty"),
      pct("completeness"),
    ]).toEqual(["96.2", "98.9", "97.7", "96.4", "94.4"]);
    expect(w.timeline.partialMonths).toEqual([3]);
    expect(w.timeline.lanes.map((l) => l.label)).toEqual([
      "Liquidity",
      "Cash flow",
      "Concentration",
      "Collections",
      "Fund flow",
      "Integrity",
    ]);
    expect(w.timeline.lanes.find((l) => l.id === "fund_flow")?.cells).toEqual([
      null,
      null,
      null,
      null,
      "medium",
      "critical",
    ]);
    expect(w.categories.map((c) => [c.label, c.signals, c.open])).toEqual([
      ["Income", 1, 1],
      ["Liquidity", 1, 1],
      ["Debt", 0, 0],
      ["Corporate", 4, 1],
      ["Integrity", 2, 1],
    ]);
  });

  it("RS-C-04 carries the authored six-step explainability path", async () => {
    const w = await make().getWorkspace(MERIDIAN);
    const s = w.signals[0];
    expect(s?.explainabilityDerived).toBe(false);
    expect(s?.explainability.map((e) => e.provenance)).toEqual([
      "AI",
      "DERIVED",
      "DERIVED",
      "FACT",
      "FACT",
      "INVESTIGATE",
    ]);
  });

  it("status actions are audited and drive the badge", async () => {
    const svc = make();
    const v = await svc.applyAction(MERIDIAN, sid("RS-C-01"), {
      type: "false_positive",
      reason: "OD drawdown pre-agreed with bank for capex",
    });
    expect(v.status).toBe("false_positive");
    expect(v.audit.at(-1)).toMatchObject({
      action: "STATUS_FALSE_POSITIVE",
      before: "Open",
      after: "False positive",
    });
    expect((await svc.getWorkspace(MERIDIAN)).activeCount).toBe(6);
  });

  it("closed signals accept commentary only; closing needs a reason", async () => {
    const svc = make();
    await expect(svc.applyAction(MERIDIAN, sid("RS-C-06"), { type: "acknowledge" })).rejects.toThrow();
    const c = await svc.applyAction(MERIDIAN, sid("RS-C-06"), {
      type: "comment",
      text: "Bank confirmed reversal",
    });
    expect(c.audit.at(-1)?.action).toBe("COMMENT");
    await expect(
      svc.applyAction(MERIDIAN, sid("RS-C-05"), { type: "resolve", reason: "short" }),
    ).rejects.toThrow();
  });

  it("assign and investigate set the owner", async () => {
    const svc = make();
    const a = await svc.applyAction(MERIDIAN, sid("RS-C-05"), { type: "assign", owner: "S. Menon" });
    expect(a.owner).toBe("S. Menon");
    const i = await svc.applyAction(MERIDIAN, sid("RS-C-01"), { type: "investigate" });
    expect([i.status, i.owner]).toEqual(["investigate", "P. Raman"]);
  });

  it("Arjun: 4 signals, OCR not applicable, derived explainability", async () => {
    const w = await make().getWorkspace(ARJUN);
    expect(w.signals).toHaveLength(4);
    expect(w.activeCount).toBe(4);
    expect(w.confidence.find((c) => c.id === "ocr")?.value.status).toBe("not_available");
    expect(w.signals.every((s) => s.explainabilityDerived && s.explainability.length === 4)).toBe(true);
  });
}
