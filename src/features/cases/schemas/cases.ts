import { z } from "zod";
import { availabilitySchema } from "@/shared/lib/availability";
import { CurrencySchema, MoneySchema } from "@/shared/lib/money";
import {
  AccountIdSchema,
  CaseIdSchema,
  CustomerIdSchema,
  JobIdSchema,
  StatementFileIdSchema,
} from "@/shared/data/schemas/ids";
import { AccountRoleSchema, CustomerKindSchema } from "@/shared/data/schemas/customer";
import { StatementFileSchema } from "@/shared/data/statement-files";

export const WORKFLOW_STEPS = [
  { id: "context", label: "Case Context" },
  { id: "upload", label: "Upload Statements" },
  { id: "processing", label: "AI Processing" },
  { id: "validation", label: "Transaction Validation" },
  { id: "profiling", label: "Financial Profiling" },
  { id: "review", label: "Underwriter Review" },
  { id: "report", label: "Report Generation" },
] as const;
export const WorkflowStepIdSchema = z.enum([
  "context",
  "upload",
  "processing",
  "validation",
  "profiling",
  "review",
  "report",
]);
export type WorkflowStepId = z.infer<typeof WorkflowStepIdSchema>;

export const CaseDetailSchema = z.object({
  id: CaseIdSchema,
  customerId: CustomerIdSchema,
  customerName: z.string(),
  customerRef: z.string(),
  kind: CustomerKindSchema,
  regionLabel: z.string(),
  purpose: z.string(),
  periodLabel: z.string(),
  accounts: z.number().int(),
  stage: WorkflowStepIdSchema,
});
export type CaseDetail = z.infer<typeof CaseDetailSchema>;

export const CustomerContextSchema = z.object({
  customerType: z.string().min(1, "Required"),
  sector: z.string().min(1, "Required"),
  regionCountry: z.string().min(1, "Required"),
  reportingCurrency: CurrencySchema,
  analysisPeriod: z.string().min(1, "Required"),
  expectedAccounts: z.number().int().min(1).max(20),
  declaredTurnover: z.string(),
  linkedFsaCase: z.string(),
  template: z.object({ id: z.string(), name: z.string(), note: z.string() }),
  confirmed: z.boolean(),
});
export type CustomerContext = z.infer<typeof CustomerContextSchema>;

export const ValidationCheckSchema = z.object({
  id: z.enum([
    "duplicates",
    "missing_months",
    "missing_pages",
    "unsupported",
    "inconsistent_accounts",
    "overlaps",
    "balance_continuity",
  ]),
  label: z.string(),
  detail: z.string(),
  count: z.number().int(),
  severity: z.enum(["ok", "warning", "error"]),
});
export type ValidationCheck = z.infer<typeof ValidationCheckSchema>;

export const ProcessingOptionIdSchema = z.enum([
  "ocr",
  "classification",
  "income",
  "expenses",
  "transfers",
  "recurring",
  "counterparty",
  "liquidity",
  "cashflow",
  "anomaly",
  "signals",
  "scoring",
]);
export type ProcessingOptionId = z.infer<typeof ProcessingOptionIdSchema>;
export const ProcessingOptionsSchema = z.record(ProcessingOptionIdSchema, z.boolean());
export type ProcessingOptions = z.infer<typeof ProcessingOptionsSchema>;
export const ProcessingOptionsPatchSchema = z.partialRecord(ProcessingOptionIdSchema, z.boolean());
export type ProcessingOptionsPatch = z.infer<typeof ProcessingOptionsPatchSchema>;

export const AccountMappingSchema = z.object({
  accountId: AccountIdSchema,
  bankName: z.string(),
  maskedAccount: z.string(),
  typeLabel: z.string(),
  currency: CurrencySchema,
  periodLabel: z.string(),
  incomplete: z.boolean(),
  opening: availabilitySchema(MoneySchema),
  closing: availabilitySchema(MoneySchema),
  role: AccountRoleSchema,
});
export type AccountMapping = z.infer<typeof AccountMappingSchema>;

export const IngestionSchema = z.object({
  caseId: CaseIdSchema,
  files: z.array(StatementFileSchema),
  context: CustomerContextSchema,
  coverage: z.object({
    months: z.array(z.string()),
    rows: z.array(
      z.object({ label: z.string(), cells: z.array(z.enum(["covered", "missing", "low_ocr", "duplicate"])) }),
    ),
    covered: z.number().int(),
    total: z.number().int(),
  }),
  validation: z.array(ValidationCheckSchema),
  mapping: z.array(AccountMappingSchema),
  mappingNote: z.string(),
  options: ProcessingOptionsSchema,
  completeness: z.number(),
  coverageWarning: z.string().nullable(),
});
export type Ingestion = z.infer<typeof IngestionSchema>;

export const AddFileRequestSchema = z.object({
  name: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
export type AddFileRequest = z.infer<typeof AddFileRequestSchema>;
export const StartProcessingResultSchema = z.object({ jobId: JobIdSchema, startedAt: z.string() });
export type StartProcessingResult = z.infer<typeof StartProcessingResultSchema>;
export const RemoveFileRequestSchema = z.object({ fileId: StatementFileIdSchema });
