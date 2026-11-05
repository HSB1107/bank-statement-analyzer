import { IsoDateSchema } from "@/shared/lib/dates";
import { type MockRuntime } from "@/shared/lib/mock-runtime";
import { type AuditLog } from "@/shared/data/audit-log";
import { caseExceptions } from "@/shared/data/exceptions";
import { caseLedger } from "@/shared/data/review-dataset";
import { reconciliation } from "@/shared/data/selectors/reconciliation";
import { isOwnTransfer } from "@/shared/data/selectors/ledger";
import { CATEGORY_IDS, categoryGroup, categoryLabel, type CategoryId } from "@/shared/data/schemas/category";
import { type Account } from "@/shared/data/schemas/customer";
import { type CaseId, type TransactionId } from "@/shared/data/schemas/ids";
import { type Transaction } from "@/shared/data/schemas/transaction";
import { ROUND_TRIP_SIGNAL_ID } from "@/shared/data/signal-ids";
import {
  ReviewSummarySchema,
  TxnDetailSchema,
  TxnPageSchema,
  TxnActionRequestSchema,
  type TxnFilter,
  type TxnRow,
} from "../schemas/transactions";
import { type TransactionService } from "./transaction-service";

const ACTOR = "Priya Raman";

interface Override {
  category?: CategoryId;
  confidence?: number;
  flagged?: boolean;
  nonOperating?: boolean;
  recurring?: boolean;
  accepted?: boolean;
}

interface State {
  overrides: Map<string, Override>;
  approved: boolean;
}

const shortOf = (a: Account | undefined) => (a ? (a.type === "od_cc" ? a.bank : a.bank) : "—");
const GROUP_LABEL: Readonly<Record<string, string>> = {
  income: "Income",
  transfer: "Transfer",
  obligation: "Obligation",
  fixed_expense: "Fixed expense",
  investment: "Investment",
  living: "Living",
  business_outflow: "Business outflow",
  charges: "Charges",
  uncategorised: "Uncategorised",
};

function toRow(t: Transaction, accounts: readonly Account[], o: Override | undefined): TxnRow {
  const category = o?.category ?? t.category;
  return {
    id: t.id,
    accountId: t.accountId,
    accountShort: shortOf(accounts.find((a) => a.id === t.accountId)),
    date: t.date,
    narration: t.narration,
    reference: t.reference,
    counterparty: t.counterparty.name,
    direction: t.direction,
    amount: t.amount,
    balance: t.balance,
    category,
    categoryLabel: categoryLabel(category),
    categoryGroup: categoryGroup(category),
    confidence: o?.confidence ?? t.categoryConfidence,
    ownTransferPair: t.transferPairId !== null,
    excluded: t.ledgerEffect.kind === "excluded",
    flagged: o?.flagged ?? false,
    overridden: o?.category !== undefined || o?.accepted === true,
  };
}

/** Explain a low-confidence classification from observable features of the row. */
function reasoning(t: Transaction, all: readonly Transaction[]): string {
  const reasons: string[] = [];
  const sameCp = all.filter((x) => x.counterparty.id === t.counterparty.id);
  const firstSeen = sameCp[0]?.date ?? t.date;
  if (sameCp.length <= 2 && firstSeen > "2026-02-28") reasons.push("the counterparty is new");
  const topChannel = t.direction === "credit" ? "RTGS" : "NEFT";
  if (t.channel !== topChannel && (t.channel === "CHQ" || t.channel === "CASH"))
    reasons.push(`it arrived by ${t.channel === "CHQ" ? "cheque" : "cash"} (top payers use ${topChannel})`);
  if (t.amount.amountMinor % 5_00_000_00 === 0) reasons.push("the amount is round");
  if (!/INV|PO/.test(t.narration)) reasons.push("the narration has no invoice reference");
  const kind = t.direction === "credit" ? "Credit" : "Debit";
  const what = `${kind} ${t.direction === "credit" ? "from" : "to"} ${t.counterparty.kind === "related_party" ? "a trading-type entity" : t.counterparty.name}`;
  if (t.categoryConfidence >= 0.85)
    return `${what}. Classified with high confidence from the narration, counterparty history and channel.`;
  return `${what}. Confidence is lower because ${reasons.length ? reasons.join(", ").replace(/, ([^,]*)$/, " and $1") : "the pattern is ambiguous"}.`;
}

export function createMockTransactionService(runtime: MockRuntime, audit: AuditLog): TransactionService {
  const states = new Map<string, State>();
  const stateOf = (caseId: CaseId) => {
    let s = states.get(caseId);
    if (!s) {
      s = { overrides: new Map(), approved: false };
      // Seed the analyst's earlier session on the corporate case: 14 reclassifications and the 2 flagged K S Trading rows.
      const { transactions } = caseLedger(caseId);
      const low = transactions
        .filter(
          (t) =>
            t.categoryConfidence < 0.85 &&
            t.counterparty.kind !== "related_party" &&
            t.category !== "unclassified",
        )
        .slice(0, caseId === "BSA-26-04421" ? 14 : 0);
      for (const t of low) s.overrides.set(t.id, { category: t.category, confidence: 1, accepted: true });
      for (const t of transactions.filter((x) => x.counterparty.kind === "related_party"))
        s.overrides.set(t.id, { flagged: true, nonOperating: true });
      states.set(caseId, s);
    }
    return s;
  };

  const detail = (caseId: CaseId, id: TransactionId) => {
    const { transactions, accounts } = caseLedger(caseId);
    const s = stateOf(caseId);
    const t = transactions.find((x) => x.id === id);
    if (!t) throw new Error(`Transaction ${id} not found`);
    const o = s.overrides.get(t.id);
    const sameCp = transactions.filter(
      (x) => x.counterparty.id === t.counterparty.id && x.counterparty.kind !== "own_account",
    );
    const account = accounts.find((a) => a.id === t.accountId);
    const related = sameCp.filter((x) => x.id !== t.id).slice(-4);
    const ordered = [...related, t].sort((a, b) => (a.date < b.date ? -1 : 1));
    const out = ordered.find((x) => x.direction === "debit");
    const back = ordered.find((x) => x.direction === "credit");
    const roundTrip = t.counterparty.kind === "related_party" && out && back && back.date > out.date;
    const days = out && back ? Math.round((Date.parse(back.date) - Date.parse(out.date)) / 86_400_000) : 0;
    return TxnDetailSchema.parse({
      row: toRow(t, accounts, o),
      accountLabel: account?.label ?? "",
      original: { narration: t.narration, provenance: "FACT" },
      normalised: t.normalisedNarration,
      counterparty: {
        name: t.counterparty.name,
        firstSeen: IsoDateSchema.parse(sameCp[0]?.date ?? t.date),
        transactions: sameCp.length,
        isNew: sameCp.length <= 2 && (sameCp[0]?.date ?? t.date) > "2026-02-28",
      },
      source: t.source,
      extraction: {
        confidence: t.ocrConfidence ?? t.extractionConfidence,
        method:
          t.ocrConfidence !== null
            ? "scanned image · OCR"
            : t.source.fileName.endsWith(".xlsx")
              ? "native XLSX, no OCR"
              : "digital PDF text layer",
      },
      channel: t.channel,
      ai: {
        group:
          t.direction === "credit" && categoryGroup(t.category) !== "transfer"
            ? "Income"
            : (GROUP_LABEL[categoryGroup(t.category)] ?? "—"),
        category: t.category === "related_party_receipt" ? "Customer Collection" : categoryLabel(t.category),
        confidence: t.categoryConfidence,
        reasoning: reasoning(t, transactions),
        alternatives: t.alternatives,
      },
      related: ordered.map((x) => ({
        id: x.id,
        date: x.date,
        accountShort: shortOf(accounts.find((a) => a.id === x.accountId)),
        narration: x.narration,
        direction: x.direction,
        amount: x.amount,
      })),
      relatedNote:
        roundTrip && out && back
          ? `₹${(out.amount.amountMinor / 1e9).toFixed(2)} cr paid out ${days} days earlier returns as ₹${(back.amount.amountMinor / 1e9).toFixed(2)} cr → linked to signal ${ROUND_TRIP_SIGNAL_ID} (possible round-trip, needs investigation).`
          : null,
      nonOperating: o?.nonOperating ?? false,
      recurring: o?.recurring ?? t.recurringId !== null,
      audit: audit.list({ entity: "transaction", entityId: t.id }),
    });
  };

  return {
    async getSummary(caseId) {
      await runtime.delay();
      runtime.maybeFail("transaction summary");
      const { transactions, accounts, missingMonths, corporate } = caseLedger(caseId);
      const s = stateOf(caseId);
      // Model output (original AI confidence), independent of analyst overrides.
      const low = transactions.filter((t) => t.categoryConfidence < 0.85).length;
      const recon = reconciliation(transactions, accounts, missingMonths);
      const ks = transactions.find(
        (t) => t.counterparty.kind === "related_party" && t.direction === "credit",
      );
      return ReviewSummarySchema.parse({
        kpis: {
          accounts: accounts.length,
          transactions: transactions.length,
          credits: transactions.filter((t) => t.direction === "credit").length,
          debits: transactions.filter((t) => t.direction === "debit").length,
          categorised: transactions.length - transactions.filter((t) => t.categoryConfidence < 0.85).length,
          uncategorised: transactions.filter((t) => t.categoryConfidence < 0.85).length,
          lowConfidence: low,
          exceptions: caseExceptions(caseId).length,
        },
        corporate,
        accounts: accounts.map((a) => ({
          id: a.id,
          label: `${a.bank}${a.type === "od_cc" ? " OD" : ""} XX${a.last4}`,
          rows: transactions.filter((t) => t.accountId === a.id).length,
          subtitle:
            a.type === "od_cc" && a.odLimit.status === "available"
              ? `OD/CC · limit ₹${(a.odLimit.value.limit.amountMinor / 1e9).toFixed(2)} cr`
              : `${a.type === "current" ? "Current" : "Savings"} · ${a.role === "operating_primary" ? "Operating" : a.role === "collections_secondary" ? "Collections" : a.role === "salary" ? "Salary" : "Savings"}`,
        })),
        reconciliation: {
          accounts: accounts.map((a) =>
            a.bank.slice(0, 2).toUpperCase().replace("IC", "IC").replace("HD", "HD").replace("SB", "SB"),
          ),
          checks: recon,
          note: corporate
            ? "Negative balance N/A for current accounts with no OD; SBI is an OD account — negative is expected."
            : "Negative balance N/A for savings accounts without an OD facility.",
        },
        session: {
          reclassified: [...s.overrides.values()].filter((o) => o.category !== undefined).length,
          duplicatesExcluded: transactions.filter((t) => t.duplicateGroup !== null).length,
          flagged: [...s.overrides.values()].filter((o) => o.flagged).length,
          approved: s.approved,
        },
        defaultSelection: ks?.id ?? transactions.find((t) => t.categoryConfidence < 0.85)?.id ?? null,
        defaultFilter: corporate
          ? {
              accountId: "all",
              search: "",
              dateFrom: "2026-06-01",
              dateTo: "2026-06-18",
              minAmountMinor: 10_00_000_00,
              direction: "all",
              category: "all",
              counterparty: "",
              confidence: "all",
            }
          : {
              accountId: "all",
              search: "",
              dateFrom: null,
              dateTo: null,
              minAmountMinor: 0,
              direction: "all",
              category: "all",
              counterparty: "",
              confidence: "all",
            },
      });
    },
    async list(caseId, f: TxnFilter) {
      await runtime.delay();
      const { transactions, accounts } = caseLedger(caseId);
      const s = stateOf(caseId);
      const scoped = transactions.filter(
        (t) =>
          (f.accountId === "all" || t.accountId === f.accountId) &&
          (!f.dateFrom || t.date >= f.dateFrom) &&
          (!f.dateTo || t.date <= f.dateTo),
      );
      const q = f.search.trim().toLowerCase();
      const cp = f.counterparty.trim().toLowerCase();
      const rows = scoped
        .map((t) => toRow(t, accounts, s.overrides.get(t.id)))
        .filter(
          (r) =>
            r.amount.amountMinor >= f.minAmountMinor &&
            (f.direction === "all" || r.direction === f.direction) &&
            (f.category === "all" || r.category === f.category) &&
            (!cp || r.counterparty.toLowerCase().includes(cp)) &&
            (f.confidence === "all" ||
              (f.confidence === "low" ? r.confidence < 0.85 : r.confidence >= 0.85)) &&
            (!q ||
              r.narration.toLowerCase().includes(q) ||
              r.reference.toLowerCase().includes(q) ||
              r.counterparty.toLowerCase().includes(q)),
        )
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const used = new Set(transactions.map((t) => t.category));
      const cps = new Map<string, number>();
      for (const t of transactions)
        if (!isOwnTransfer(t))
          cps.set(t.counterparty.name, (cps.get(t.counterparty.name) ?? 0) + t.amount.amountMinor);
      return TxnPageSchema.parse({
        rows,
        matching: rows.length,
        inScope: scoped.length,
        facets: {
          categories: CATEGORY_IDS.filter((c) => used.has(c)).map((c) => ({
            id: c,
            label: categoryLabel(c),
          })),
          counterparties: [...cps.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([n]) => n),
        },
      });
    },
    async getDetail(caseId, id) {
      await runtime.delay();
      return detail(caseId, id);
    },
    async applyAction(caseId, id, raw) {
      await runtime.delay();
      const req = TxnActionRequestSchema.parse(raw);
      const s = stateOf(caseId);
      const { transactions } = caseLedger(caseId);
      const t = transactions.find((x) => x.id === id);
      if (!t) throw new Error(`Transaction ${id} not found`);
      const cur = s.overrides.get(id) ?? {};
      const before = JSON.stringify({
        category: cur.category ?? t.category,
        flagged: cur.flagged ?? false,
        nonOperating: cur.nonOperating ?? false,
      });
      let next: Override = cur;
      let action: string = req.action.kind;
      switch (req.action.kind) {
        case "accept":
          next = { ...cur, accepted: true, confidence: 1 };
          break;
        case "change_category":
          next = { ...cur, category: req.action.category, confidence: 1 };
          break;
        case "internal_transfer":
          next = { ...cur, category: "own_account_transfer", confidence: 1 };
          break;
        case "mark_recurring":
          next = { ...cur, recurring: true };
          break;
        case "comment":
          action = `comment: ${req.action.text}`;
          break;
        case "toggle_non_operating":
          next = { ...cur, nonOperating: !(cur.nonOperating ?? false) };
          break;
        case "flag":
          next = { ...cur, flagged: !(cur.flagged ?? false) };
          break;
      }
      s.overrides.set(id, next);
      audit.append({
        actor: ACTOR,
        entity: "transaction",
        entityId: id,
        action: action.toUpperCase(),
        before,
        after: JSON.stringify({
          category: next.category ?? t.category,
          flagged: next.flagged ?? false,
          nonOperating: next.nonOperating ?? false,
        }),
        reason: req.reason,
      });
      return detail(caseId, id);
    },
    async acceptAllAbove(caseId, threshold) {
      await runtime.delay();
      const s = stateOf(caseId);
      const { transactions } = caseLedger(caseId);
      const targets = transactions.filter(
        (t) => t.categoryConfidence >= threshold && !s.overrides.get(t.id)?.accepted,
      );
      for (const t of targets) s.overrides.set(t.id, { ...s.overrides.get(t.id), accepted: true });
      audit.append({
        actor: ACTOR,
        entity: "case",
        entityId: caseId,
        action: "ACCEPT_ALL",
        before: null,
        after: String(targets.length),
        reason: `Bulk accept ≥ ${Math.round(threshold * 100)}%`,
      });
      return { affected: targets.length };
    },
    async approve(caseId) {
      await runtime.delay();
      const s = stateOf(caseId);
      s.approved = true;
      audit.append({
        actor: ACTOR,
        entity: "case",
        entityId: caseId,
        action: "APPROVE_TRANSACTIONS",
        before: "validation",
        after: "approved",
        reason: "Transaction data approved",
      });
      return { affected: caseLedger(caseId).transactions.length };
    },
  };
}
