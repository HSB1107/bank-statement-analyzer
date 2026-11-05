import { type Account } from "../schemas/customer";
import { type Transaction } from "../schemas/transaction";
import { isOwnTransfer, isPosted, signedMinor } from "./ledger";

export type ReconStatus = "pass" | "warning" | "fail" | "na";

export interface ReconCheck {
  id: string;
  label: string;
  results: ReconStatus[];
}

/** Per-account statement reconciliation checks (computed from the statement rows). */
export function reconciliation(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  missingMonths: Readonly<Record<string, readonly number[]>>,
): ReconCheck[] {
  const rowsFor = (a: Account) => transactions.filter((t) => t.accountId === a.id);
  const per = <T>(fn: (a: Account, rows: Transaction[]) => T) => accounts.map((a) => fn(a, rowsFor(a)));

  // 1. Opening + credits − debits = closing, chained across statement files.
  const chain = per((a, rows) => {
    let expected: number | null = null;
    let gap = false;
    let prevFile = "";
    for (const r of rows) {
      if (r.source.fileId !== prevFile && expected !== null) {
        const opening = r.balance.amountMinor - signedMinor(r);
        if (opening !== expected) gap = true;
      }
      expected = r.balance.amountMinor;
      prevFile = r.source.fileId;
    }
    return gap ? "warning" : missingMonths[a.id]?.length ? "warning" : "pass";
  });
  // 2. Running balance consistency within each file.
  const running = per((_a, rows) => {
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const cur = rows[i];
      if (!prev || !cur || prev.source.fileId !== cur.source.fileId) continue;
      if (prev.balance.amountMinor + signedMinor(cur) !== cur.balance.amountMinor) return "fail";
    }
    return "pass";
  });
  // 3. Duplicate references within an account (own-transfer legs share refs across accounts, not within).
  const dupRefs = per((_a, rows) => {
    const seen = new Set<string>();
    for (const r of rows) {
      if (seen.has(r.reference)) return "fail";
      seen.add(r.reference);
    }
    return "pass";
  });
  // 4. Duplicate amount + date (flagged duplicate groups).
  const dupAmount = per((_a, rows) => (rows.some((r) => r.duplicateGroup !== null) ? "warning" : "pass"));
  // 5. Missing statement periods.
  const missing = per((a) => (missingMonths[a.id]?.length ? "fail" : "pass"));
  // 6. Unexpected negative balances — not applicable to current accounts without OD; expected on OD.
  const negative = per((a, rows) =>
    a.type === "od_cc" ? "na" : rows.some((r) => r.balance.amountMinor < 0) ? "fail" : "na",
  );
  // 7. Currency mismatches (foreign amounts must carry an FX record).
  const currency = per((a, rows) =>
    rows.some((r) => r.amount.currency !== a.currency || (r.fx && r.fx.original.currency === a.currency))
      ? "fail"
      : "pass",
  );
  // 8. Unexplained reversals: receipts from parties normally paid (supplier / related party) in the same account.
  const reversals = per((_a, rows) => {
    const paid = new Set(
      transactions
        .filter((t) => t.direction === "debit" && isPosted(t) && !isOwnTransfer(t))
        .map((t) => t.counterparty.id),
    );
    return rows.some((r) => r.direction === "credit" && !isOwnTransfer(r) && paid.has(r.counterparty.id))
      ? "warning"
      : "pass";
  });
  return [
    { id: "opening_closing", label: "Opening + Credits − Debits = Closing", results: chain },
    { id: "running_balance", label: "Running balance consistency", results: running },
    { id: "duplicate_refs", label: "Duplicate references", results: dupRefs },
    { id: "duplicate_amount", label: "Duplicate amount + date", results: dupAmount },
    { id: "missing_periods", label: "Missing statement periods", results: missing },
    { id: "negative_balances", label: "Unexpected negative balances", results: negative },
    { id: "currency", label: "Currency mismatches", results: currency },
    { id: "reversals", label: "Unexplained reversals", results: reversals },
  ];
}
