import { expect, it } from "vitest";
import { CaseIdSchema } from "@/shared/data/schemas/ids";
import { type TransactionService } from "./transaction-service";

const MERIDIAN = CaseIdSchema.parse("BSA-26-04421");

/** Contract every TransactionService adapter must satisfy. */
export function transactionServiceContract(make: () => TransactionService): void {
  it("summarises 9,318 rows and computes per-account reconciliation", async () => {
    const s = await make().getSummary(MERIDIAN);
    expect(s.kpis).toMatchObject({
      accounts: 3,
      transactions: 9318,
      credits: 3402,
      debits: 5916,
      categorised: 9107,
      uncategorised: 211,
      exceptions: 7,
    });
    const byId = Object.fromEntries(s.reconciliation.checks.map((c) => [c.id, c.results]));
    expect(byId.opening_closing).toEqual(["pass", "pass", "warning"]);
    expect(byId.duplicate_refs).toEqual(["pass", "pass", "fail"]);
    expect(byId.missing_periods).toEqual(["pass", "pass", "fail"]);
    expect(byId.negative_balances).toEqual(["na", "na", "na"]);
    expect(byId.reversals).toEqual(["pass", "warning", "pass"]);
  });
  it("filters by account, amount and confidence", async () => {
    const svc = make();
    const all = await svc.list(MERIDIAN, {
      accountId: "all",
      search: "",
      dateFrom: null,
      dateTo: null,
      minAmountMinor: 0,
      direction: "all",
      category: "all",
      counterparty: "",
      confidence: "all",
    });
    expect(all.matching).toBe(9318);
    const low = await svc.list(MERIDIAN, {
      accountId: "all",
      search: "",
      dateFrom: null,
      dateTo: null,
      minAmountMinor: 0,
      direction: "all",
      category: "all",
      counterparty: "",
      confidence: "low",
    });
    expect(low.rows.every((r) => r.confidence < 0.85)).toBe(true);
    const ks = await svc.list(MERIDIAN, {
      accountId: "all",
      search: "K S TRADING",
      dateFrom: null,
      dateTo: null,
      minAmountMinor: 0,
      direction: "all",
      category: "all",
      counterparty: "",
      confidence: "all",
    });
    expect(ks.rows.map((r) => r.direction).sort()).toEqual(["credit", "debit"]);
  });
  it("explains the K S Trading cheque and links the round-trip signal", async () => {
    const svc = make();
    const s = await svc.getSummary(MERIDIAN);
    if (!s.defaultSelection) throw new Error("no default selection");
    const d = await svc.getDetail(MERIDIAN, s.defaultSelection);
    expect(d.original.narration).toBe("CHQ DEP-K S TRADING CO");
    expect(d.source.row).toBe(3211);
    expect(d.ai.confidence).toBeCloseTo(0.71, 2);
    expect(d.ai.reasoning).toMatch(/counterparty is new/);
    expect(d.relatedNote).toMatch(/RS-C-04/);
  });
  it("applies an audited override without touching the original", async () => {
    const svc = make();
    const s = await svc.getSummary(MERIDIAN);
    const id = s.defaultSelection;
    if (!id) throw new Error("no default selection");
    const d = await svc.applyAction(MERIDIAN, id, {
      action: { kind: "change_category", category: "related_party_receipt" },
      reason: "Director-linked entity",
    });
    expect(d.row.category).toBe("related_party_receipt");
    expect(d.original.narration).toBe("CHQ DEP-K S TRADING CO");
    expect(d.audit.at(-1)?.reason).toBe("Director-linked entity");
    await expect(svc.applyAction(MERIDIAN, id, { action: { kind: "accept" }, reason: "" })).rejects.toThrow();
  });
}
