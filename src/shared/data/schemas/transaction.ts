import { z } from "zod";
import { IsoDateSchema } from "@/shared/lib/dates";
import { MoneySchema } from "@/shared/lib/money";
import { CategoryIdSchema } from "./category";
import {
  AccountIdSchema,
  CounterpartyIdSchema,
  SignalIdSchema,
  StatementFileIdSchema,
  TransactionIdSchema,
} from "./ids";

export const DirectionSchema = z.enum(["credit", "debit"]);
export type Direction = z.infer<typeof DirectionSchema>;

export const ChannelSchema = z.enum([
  "NEFT",
  "RTGS",
  "IMPS",
  "UPI",
  "ACH",
  "CHQ",
  "CASH",
  "BBPS",
  "POS",
  "SWIFT",
  "TRF",
  "INT",
  "BULK_NEFT",
  "CHALLAN",
  "CARD",
]);
export type Channel = z.infer<typeof ChannelSchema>;

export const CounterpartyKindSchema = z.enum([
  "employer",
  "customer",
  "supplier",
  "payroll",
  "statutory",
  "lender",
  "own_account",
  "related_party",
  "merchant",
  "landlord",
  "government",
  "bank",
  "individual",
  "unknown",
]);
export type CounterpartyKind = z.infer<typeof CounterpartyKindSchema>;

export const CounterpartyRefSchema = z.object({
  id: CounterpartyIdSchema,
  name: z.string(),
  kind: CounterpartyKindSchema,
});
export type CounterpartyRef = z.infer<typeof CounterpartyRefSchema>;

/**
 * Ledger effect: `excluded` rows appear on the statement but do not move the balance
 * (a returned ACH, a parser-duplicated line). They are kept for audit, never summed.
 */
export const LedgerEffectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("posted") }),
  z.object({
    kind: z.literal("excluded"),
    reason: z.enum(["returned_unpaid", "suspected_duplicate"]),
    note: z.string(),
  }),
]);
export type LedgerEffect = z.infer<typeof LedgerEffectSchema>;

export const FxDetailSchema = z.object({
  original: MoneySchema,
  rate: z.number().positive(),
  rateDate: IsoDateSchema,
  rateSource: z.literal("RBI reference rate"),
});

export const AlternativeSchema = z.object({ label: z.string(), probability: z.number().min(0).max(1) });

export const TransactionSchema = z.object({
  id: TransactionIdSchema,
  accountId: AccountIdSchema,
  date: IsoDateSchema,
  /** Original bank description (FACT). */
  narration: z.string(),
  normalisedNarration: z.string(),
  reference: z.string(),
  channel: ChannelSchema,
  direction: DirectionSchema,
  /** Always positive; sign comes from `direction`. In the account's currency. */
  amount: MoneySchema,
  /** Statement running balance after this row (FACT). Negative for drawn OD. */
  balance: MoneySchema,
  counterparty: CounterpartyRefSchema,
  category: CategoryIdSchema,
  categoryConfidence: z.number().min(0).max(1),
  alternatives: z.array(AlternativeSchema),
  counterpartyConfidence: z.number().min(0).max(1),
  extractionConfidence: z.number().min(0).max(1),
  /** OCR confidence only exists for scanned sources. */
  ocrConfidence: z.number().min(0).max(1).nullable(),
  source: z.object({
    fileId: StatementFileIdSchema,
    fileName: z.string(),
    page: z.number().int().positive().nullable(),
    row: z.number().int().positive(),
  }),
  ledgerEffect: LedgerEffectSchema,
  /** Shared key linking both legs of an own-account transfer. */
  transferPairId: z.string().nullable(),
  duplicateGroup: z.string().nullable(),
  recurringId: z.string().nullable(),
  fx: FxDetailSchema.nullable(),
  signalIds: z.array(SignalIdSchema),
});
export type Transaction = z.infer<typeof TransactionSchema>;
