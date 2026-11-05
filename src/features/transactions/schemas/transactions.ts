import { z } from "zod";
import { IsoDateSchema } from "@/shared/lib/dates";
import { MoneySchema } from "@/shared/lib/money";
import { ProvenanceSchema } from "@/shared/lib/provenance";
import { AuditEntrySchema } from "@/shared/data/schemas/audit";
import { CategoryGroupSchema, CategoryIdSchema } from "@/shared/data/schemas/category";
import { AccountIdSchema, TransactionIdSchema } from "@/shared/data/schemas/ids";
import { ChannelSchema, DirectionSchema } from "@/shared/data/schemas/transaction";

export const TxnFilterSchema = z.object({
  accountId: z.union([AccountIdSchema, z.literal("all")]),
  search: z.string(),
  dateFrom: IsoDateSchema.nullable(),
  dateTo: IsoDateSchema.nullable(),
  minAmountMinor: z.number().int().nonnegative(),
  direction: z.enum(["all", "credit", "debit"]),
  category: z.union([CategoryIdSchema, z.literal("all")]),
  counterparty: z.string(),
  confidence: z.enum(["all", "low", "high"]),
});
export type TxnFilter = z.infer<typeof TxnFilterSchema>;

/** Lightweight row DTO for the virtualised table. */
export const TxnRowSchema = z.object({
  id: TransactionIdSchema,
  accountId: AccountIdSchema,
  accountShort: z.string(),
  date: IsoDateSchema,
  narration: z.string(),
  reference: z.string(),
  counterparty: z.string(),
  direction: DirectionSchema,
  amount: MoneySchema,
  balance: MoneySchema,
  category: CategoryIdSchema,
  categoryLabel: z.string(),
  categoryGroup: CategoryGroupSchema,
  confidence: z.number(),
  ownTransferPair: z.boolean(),
  excluded: z.boolean(),
  flagged: z.boolean(),
  overridden: z.boolean(),
});
export type TxnRow = z.infer<typeof TxnRowSchema>;

export const TxnPageSchema = z.object({
  rows: z.array(TxnRowSchema),
  matching: z.number().int(),
  inScope: z.number().int(),
  facets: z.object({
    categories: z.array(z.object({ id: CategoryIdSchema, label: z.string() })),
    counterparties: z.array(z.string()),
  }),
});
export type TxnPage = z.infer<typeof TxnPageSchema>;

export const CheckStatusSchema = z.enum(["pass", "warning", "fail", "na"]);
export type CheckStatus = z.infer<typeof CheckStatusSchema>;

export const ReviewSummarySchema = z.object({
  kpis: z.object({
    accounts: z.number().int(),
    transactions: z.number().int(),
    credits: z.number().int(),
    debits: z.number().int(),
    categorised: z.number().int(),
    uncategorised: z.number().int(),
    lowConfidence: z.number().int(),
    exceptions: z.number().int(),
  }),
  corporate: z.boolean(),
  accounts: z.array(
    z.object({ id: AccountIdSchema, label: z.string(), rows: z.number().int(), subtitle: z.string() }),
  ),
  reconciliation: z.object({
    accounts: z.array(z.string()),
    checks: z.array(z.object({ id: z.string(), label: z.string(), results: z.array(CheckStatusSchema) })),
    note: z.string(),
  }),
  session: z.object({
    reclassified: z.number().int(),
    duplicatesExcluded: z.number().int(),
    flagged: z.number().int(),
    approved: z.boolean(),
  }),
  defaultSelection: TransactionIdSchema.nullable(),
  defaultFilter: TxnFilterSchema,
});
export type ReviewSummary = z.infer<typeof ReviewSummarySchema>;

export const TxnDetailSchema = z.object({
  row: TxnRowSchema,
  accountLabel: z.string(),
  original: z.object({ narration: z.string(), provenance: ProvenanceSchema }),
  normalised: z.string(),
  counterparty: z.object({
    name: z.string(),
    firstSeen: IsoDateSchema,
    transactions: z.number().int(),
    isNew: z.boolean(),
  }),
  source: z.object({ fileName: z.string(), page: z.number().int().nullable(), row: z.number().int() }),
  extraction: z.object({ confidence: z.number(), method: z.string() }),
  channel: ChannelSchema,
  ai: z.object({
    group: z.string(),
    category: z.string(),
    confidence: z.number(),
    reasoning: z.string(),
    alternatives: z.array(z.object({ label: z.string(), probability: z.number() })),
  }),
  related: z.array(
    z.object({
      id: TransactionIdSchema,
      date: IsoDateSchema,
      accountShort: z.string(),
      narration: z.string(),
      direction: DirectionSchema,
      amount: MoneySchema,
    }),
  ),
  relatedNote: z.string().nullable(),
  nonOperating: z.boolean(),
  recurring: z.boolean(),
  audit: z.array(AuditEntrySchema),
});
export type TxnDetail = z.infer<typeof TxnDetailSchema>;

export const TxnActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("accept") }),
  z.object({ kind: z.literal("change_category"), category: CategoryIdSchema }),
  z.object({ kind: z.literal("internal_transfer") }),
  z.object({ kind: z.literal("mark_recurring") }),
  z.object({ kind: z.literal("comment"), text: z.string().min(1) }),
  z.object({ kind: z.literal("toggle_non_operating") }),
  z.object({ kind: z.literal("flag") }),
]);
export type TxnAction = z.infer<typeof TxnActionSchema>;
export const TxnActionRequestSchema = z.object({
  action: TxnActionSchema,
  reason: z.string().min(3, "Give a reason (min 3 chars)"),
});
export type TxnActionRequest = z.infer<typeof TxnActionRequestSchema>;

export const BulkResultSchema = z.object({ affected: z.number().int() });
