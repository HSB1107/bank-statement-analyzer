import { z } from "zod";
import { type IsoDate } from "@/shared/lib/dates";
import { money, type Currency } from "@/shared/lib/money";
import { type CategoryId } from "../schemas/category";
import {
  AccountIdSchema,
  CounterpartyIdSchema,
  StatementFileIdSchema,
  TransactionIdSchema,
  type AccountId,
  type SignalId,
} from "../schemas/ids";
import {
  TransactionSchema,
  type Channel,
  type CounterpartyKind,
  type Direction,
  type LedgerEffect,
  type Transaction,
} from "../schemas/transaction";

/** A transaction before balances/ids/rows are assigned. Amounts in minor units (positive). */
export interface DraftTxn {
  accountId: AccountId;
  date: IsoDate;
  /** Intra-day ordering hint (lower first). */
  seq?: number;
  direction: Direction;
  amountMinor: number;
  narration: string;
  normalised: string;
  reference: string;
  channel: Channel;
  counterparty: { key: string; name: string; kind: CounterpartyKind };
  category: CategoryId;
  categoryConfidence: number;
  alternatives?: { label: string; probability: number }[];
  counterpartyConfidence?: number;
  ocrConfidence?: number | null;
  ledgerEffect?: LedgerEffect;
  transferPairId?: string | null;
  duplicateGroup?: string | null;
  recurringId?: string | null;
  fx?: Transaction["fx"];
  signalIds?: SignalId[];
  /** Force a specific source page (otherwise derived from row). */
  page?: number | null;
  /** Assert the natural statement row (e.g. the PDF cites row 3,211); generation fails if it drifts. */
  expectRow?: number;
}

export interface AccountLedgerConfig {
  accountId: AccountId;
  currency: Currency;
  openingMinor: number;
  /** Statement files: rows are attributed to the file whose period contains the date. */
  files: readonly {
    fileId: string;
    fileName: string;
    from: IsoDate;
    to: IsoDate;
    rowsPerPage: number | null;
    extractionConfidence: number;
    /** Statement opening balance, when it does not follow from the previous file (coverage gap). */
    openingMinor?: number;
  }[];
}

export function accountId(value: string): AccountId {
  return AccountIdSchema.parse(value);
}

const ParsedLedger = z.array(TransactionSchema);

/**
 * Sorts drafts per account, computes running balances from the opening balance,
 * assigns stable ids + statement rows, and validates the result through the same
 * Zod schema an API response would use.
 */
export function buildLedger(
  drafts: readonly DraftTxn[],
  accounts: readonly AccountLedgerConfig[],
  idPrefix: string,
): Transaction[] {
  const out: Transaction[] = [];
  for (const acct of accounts) {
    const rows = drafts
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.accountId === acct.accountId)
      .sort((a, b) =>
        a.d.date < b.d.date ? -1 : a.d.date > b.d.date ? 1 : (a.d.seq ?? 50) - (b.d.seq ?? 50) || a.i - b.i,
      );
    let balance = acct.openingMinor;
    const rowCounters = new Map<string, number>();
    let currentFile: string | null = null;
    for (const { d } of rows) {
      const effect: LedgerEffect = d.ledgerEffect ?? { kind: "posted" };
      const file = acct.files.find((f) => d.date >= f.from && d.date <= f.to);
      if (!file) throw new Error(`No statement file covers ${d.date} for ${acct.accountId}`);
      if (file.fileId !== currentFile) {
        if (file.openingMinor !== undefined) balance = file.openingMinor;
        currentFile = file.fileId;
      }
      if (effect.kind === "posted") balance += d.direction === "credit" ? d.amountMinor : -d.amountMinor;
      const counted = (rowCounters.get(file.fileId) ?? 0) + 1;
      rowCounters.set(file.fileId, counted);
      const row = counted;
      if (d.expectRow !== undefined && d.expectRow !== row) {
        throw new Error(`Row anchor drift for "${d.narration}": expected ${d.expectRow}, got ${row}`);
      }
      const page =
        d.page !== undefined
          ? d.page
          : file.rowsPerPage
            ? Math.floor((row - 1) / file.rowsPerPage) + 1
            : null;
      out.push({
        id: TransactionIdSchema.parse(
          `${idPrefix}-${acct.accountId.slice(-4)}-${String(out.length + 1).padStart(5, "0")}`,
        ),
        accountId: acct.accountId,
        date: d.date,
        narration: d.narration,
        normalisedNarration: d.normalised,
        reference: d.reference,
        channel: d.channel,
        direction: d.direction,
        amount: money(d.amountMinor, acct.currency),
        balance: money(balance, acct.currency),
        counterparty: {
          id: CounterpartyIdSchema.parse(`CP-${d.counterparty.key}`),
          name: d.counterparty.name,
          kind: d.counterparty.kind,
        },
        category: d.category,
        categoryConfidence: d.categoryConfidence,
        alternatives: d.alternatives ?? [],
        counterpartyConfidence: d.counterpartyConfidence ?? 0.99,
        extractionConfidence: file.extractionConfidence,
        ocrConfidence: d.ocrConfidence ?? null,
        source: { fileId: StatementFileIdSchema.parse(file.fileId), fileName: file.fileName, page, row },
        ledgerEffect: effect,
        transferPairId: d.transferPairId ?? null,
        duplicateGroup: d.duplicateGroup ?? null,
        recurringId: d.recurringId ?? null,
        fx: d.fx ?? null,
        signalIds: d.signalIds ?? [],
      });
    }
  }
  return ParsedLedger.parse(out);
}

/** Random-looking but seeded numeric reference. */
export function refDigits(next: () => number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) s += String(Math.floor(next() * 10));
  return s;
}
