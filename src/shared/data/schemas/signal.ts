import { z } from "zod";
import { availabilitySchema } from "@/shared/lib/availability";
import { ProvenanceSchema } from "@/shared/lib/provenance";
import { CaseIdSchema, SignalIdSchema, TransactionIdSchema } from "./ids";

export const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const SEVERITY_RANK: Readonly<Record<Severity, number>> = { critical: 4, high: 3, medium: 2, low: 1 };

export const SignalStatusSchema = z.enum([
  "open",
  "acknowledged",
  "investigate",
  "resolved",
  "false_positive",
]);
export type SignalStatus = z.infer<typeof SignalStatusSchema>;

export const SIGNAL_STATUS_LABELS: Readonly<Record<SignalStatus, string>> = {
  open: "Open",
  acknowledged: "Acknowledged",
  investigate: "Investigate",
  resolved: "Resolved",
  false_positive: "False positive",
};

export const SignalCategorySchema = z.enum([
  "liquidity",
  "cash_flow",
  "concentration",
  "collections",
  "fund_flow",
  "integrity",
  "income",
  "debt",
  "corporate",
]);
export type SignalCategory = z.infer<typeof SignalCategorySchema>;

export const ExplainStepSchema = z.object({
  title: z.string(),
  provenance: ProvenanceSchema,
  text: z.string(),
});

export const RiskSignalSchema = z.object({
  id: SignalIdSchema,
  caseId: CaseIdSchema,
  severity: SeveritySchema,
  title: z.string(),
  /** Reporting bucket for the "By Category" panel and the table sub-label. */
  reportingCategory: z.enum(["Income", "Liquidity", "Debt", "Corporate", "Integrity"]),
  /** Timeline lane. */
  lane: SignalCategorySchema,
  periodLabel: z.string(),
  evidenceCount: availabilitySchema(z.number().int().nonnegative()),
  impact: z.string(),
  /** Financial impact used for ranking (₹, minor units). */
  impactMinor: z.number().int().nonnegative(),
  aiConfidence: z.number().min(0).max(1),
  detection: z.string(),
  status: SignalStatusSchema,
  owner: z.string().nullable(),
  explainability: z.array(ExplainStepSchema),
  linkedTransactionIds: z.array(TransactionIdSchema),
  /** Months (0-based) in which the signal manifests, with severity per month. */
  timeline: z.array(z.object({ month: z.number().int().min(0).max(11), severity: SeveritySchema })),
});
export type RiskSignal = z.infer<typeof RiskSignalSchema>;
