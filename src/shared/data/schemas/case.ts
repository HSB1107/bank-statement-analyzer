import { z } from "zod";
import { availabilitySchema } from "@/shared/lib/availability";
import { CurrencySchema } from "@/shared/lib/money";
import { CaseIdSchema, CustomerIdSchema } from "./ids";
import { RegionSchema, SegmentSchema } from "./customer";

export const CaseStageSchema = z.enum([
  "new",
  "docs_uploaded",
  "ai_processing",
  "txn_validation",
  "financial_profiling",
  "underwriter_review",
  "completed",
]);
export type CaseStage = z.infer<typeof CaseStageSchema>;

export const CASE_STAGE_LABELS: Readonly<Record<CaseStage, string>> = {
  new: "New",
  docs_uploaded: "Docs Uploaded",
  ai_processing: "AI Processing",
  txn_validation: "Txn Validation",
  financial_profiling: "Financial Profiling",
  underwriter_review: "Underwriter Review",
  completed: "Completed",
};

export const HealthBandSchema = z.enum(["critical", "weak", "watchlist", "healthy", "strong"]);
export type HealthBand = z.infer<typeof HealthBandSchema>;

export const HEALTH_BAND_LABELS: Readonly<Record<HealthBand, string>> = {
  critical: "Critical",
  weak: "Weak",
  watchlist: "Watchlist",
  healthy: "Healthy",
  strong: "Strong",
};

/** Configurable band cut-offs (SCM-RTL v2.1 & SCM-CORP v1.3): 40 / 55 / 70 / 85. */
export const HEALTH_BAND_CUTOFFS = { weak: 40, watchlist: 55, healthy: 70, strong: 85 } as const;

export function healthBandFor(score: number): HealthBand {
  if (score >= HEALTH_BAND_CUTOFFS.strong) return "strong";
  if (score >= HEALTH_BAND_CUTOFFS.healthy) return "healthy";
  if (score >= HEALTH_BAND_CUTOFFS.watchlist) return "watchlist";
  if (score >= HEALTH_BAND_CUTOFFS.weak) return "weak";
  return "critical";
}

export const RiskLevelSchema = z.enum(["low", "moderate", "elevated", "high"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const CaseSummarySchema = z.object({
  id: CaseIdSchema,
  customerId: CustomerIdSchema.nullable(),
  customerName: z.string(),
  segment: SegmentSchema,
  typeLabel: z.string(),
  sector: z.string(),
  region: RegionSchema,
  accounts: z.number().int().nonnegative(),
  currency: CurrencySchema,
  periodLabel: z.string(),
  analyst: z.string().nullable(),
  health: availabilitySchema(z.object({ score: z.number().int().min(0).max(100), band: HealthBandSchema })),
  risk: availabilitySchema(RiskLevelSchema),
  stage: CaseStageSchema,
  updatedMinutesAgo: z.number().int().nonnegative(),
  /** Pass-1 demo cases link to built screens. */
  demo: z.boolean(),
});
export type CaseSummary = z.infer<typeof CaseSummarySchema>;
