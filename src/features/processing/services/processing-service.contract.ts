import { expect, it } from "vitest";
import { CaseIdSchema } from "@/shared/data/schemas/ids";
import { type ProcessingEvent } from "../schemas/processing";
import { type ProcessingService } from "./processing-service";

const MERIDIAN = CaseIdSchema.parse("BSA-26-04421");

/** Contract every ProcessingService adapter must satisfy. */
export function processingServiceContract(make: () => ProcessingService): void {
  it("plans 21 stages with data-derived details and 7 exceptions", async () => {
    const plan = await make().getPlan(MERIDIAN);
    expect(plan.stages).toHaveLength(21);
    expect(plan.totals.transactions).toBe(9318);
    expect(plan.stages[6]?.detail).toBe("3,402 Cr · 5,916 Dr");
    expect(plan.stages[8]?.detail).toContain("9,107 auto-classified (97.7%)");
    expect(plan.stages[11]?.detail).toBe("486 own-account pairs · ₹62.20 cr matched");
    expect(plan.stages.filter((s) => s.outcome === "warning").map((s) => s.index)).toEqual([4, 11]);
    expect(plan.exceptions).toHaveLength(7);
    expect(plan.perAccount.map((a) => a.transactions)).toEqual([4206, 3912, 1200]);
  });
  it("streams stage events in order and finishes with done", async () => {
    const events: ProcessingEvent[] = [];
    for await (const e of make().stream(MERIDIAN, { speed: 100_000 })) events.push(e);
    const stageEvents = events.filter((e) => e.type === "stage");
    expect(stageEvents[0]?.type === "stage" && stageEvents[0].index).toBe(1);
    expect(events[events.length - 1]?.type).toBe("done");
    const completed = new Set(
      stageEvents
        .filter((e) => e.type === "stage" && e.status !== "running")
        .map((e) => (e.type === "stage" ? e.index : 0)),
    );
    expect(completed.size).toBe(21);
  });
}
