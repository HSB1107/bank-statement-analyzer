import { z } from "zod";
import { availabilitySchema } from "@/shared/lib/availability";
import { IsoDateSchema } from "@/shared/lib/dates";
import { CurrencySchema, MoneySchema } from "@/shared/lib/money";
import { CaseIdSchema, CustomerIdSchema, AccountIdSchema } from "./ids";

export const CustomerKindSchema = z.enum(["individual", "corporate"]);
export type CustomerKind = z.infer<typeof CustomerKindSchema>;

export const SegmentSchema = z.enum(["salaried", "self_employed", "gig", "sme", "corporate"]);
export type Segment = z.infer<typeof SegmentSchema>;

export const RegionSchema = z.enum(["IN", "ME", "ANZ"]);
export type Region = z.infer<typeof RegionSchema>;

export const BankCodeSchema = z.enum(["ICICI", "HDFC", "SBI", "AXIS", "ENBD", "ADCB", "CBA", "WESTPAC"]);
export type BankCode = z.infer<typeof BankCodeSchema>;

export const AccountTypeSchema = z.enum(["current", "savings", "od_cc"]);
export type AccountType = z.infer<typeof AccountTypeSchema>;

export const AccountRoleSchema = z.enum([
  "operating_primary",
  "collections_secondary",
  "od_cc",
  "salary",
  "savings",
]);
export type AccountRole = z.infer<typeof AccountRoleSchema>;

export const OdLimitSchema = z.object({
  limit: MoneySchema,
  source: z.literal("sanction_letter"),
  validTo: IsoDateSchema,
  fileName: z.string(),
});

export const AccountSchema = z.object({
  id: AccountIdSchema,
  customerId: CustomerIdSchema,
  bank: BankCodeSchema,
  bankName: z.string(),
  last4: z.string().regex(/^\d{4}$/),
  type: AccountTypeSchema,
  role: AccountRoleSchema,
  currency: CurrencySchema,
  /** OD limit is only ever taken from a sanction letter; otherwise Not Available. */
  odLimit: availabilitySchema(OdLimitSchema),
  /** Short label used across screens: "ICICI XX3307". */
  label: z.string(),
});
export type Account = z.infer<typeof AccountSchema>;

const CustomerBase = z.object({
  id: CustomerIdSchema,
  caseId: CaseIdSchema,
  name: z.string(),
  initials: z.string().max(3),
  region: RegionSchema,
  country: z.string(),
  reportingCurrency: CurrencySchema,
  accountIds: z.array(AccountIdSchema),
  period: z.object({ from: IsoDateSchema, to: IsoDateSchema, label: z.string() }),
  analysedOn: IsoDateSchema,
  synthetic: z.literal(true),
});

export const IndividualCustomerSchema = CustomerBase.extend({
  kind: z.literal("individual"),
  segment: z.enum(["salaried", "self_employed", "gig"]),
  segmentLabel: z.string(),
  employer: z.string(),
});

export const CorporateCustomerSchema = CustomerBase.extend({
  kind: z.literal("corporate"),
  segment: z.enum(["sme", "corporate"]),
  segmentLabel: z.string(),
  sector: z.string(),
  declaredTurnover: z.object({ amount: MoneySchema, fiscalYear: z.string() }),
  linkedFsaCase: z.string(),
  template: z.object({ id: z.string(), name: z.string(), note: z.string() }),
});

export const CustomerSchema = z.discriminatedUnion("kind", [
  IndividualCustomerSchema,
  CorporateCustomerSchema,
]);
export type Customer = z.infer<typeof CustomerSchema>;
export type IndividualCustomer = z.infer<typeof IndividualCustomerSchema>;
export type CorporateCustomer = z.infer<typeof CorporateCustomerSchema>;
