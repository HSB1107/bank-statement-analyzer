import { z } from "zod";
import { availabilitySchema } from "@/shared/lib/availability";
import { ConfidenceDimensionSchema } from "@/shared/lib/provenance";
import { AuditEntrySchema } from "@/shared/data/schemas/audit";
import { CaseIdSchema } from "@/shared/data/schemas/ids";
import {
  RiskSignalSchema,
  SeveritySchema,
  SignalCategorySchema,
  type SignalStatus,
} from "@/shared/data/schemas/signal";

/** A signal as the workspace shows it: current triage state plus its audit trail. */
export const SignalViewSchema = RiskSignalSchema.extend({
  audit: z.array(AuditEntrySchema),
  /** True when the explainability path was assembled from the signal's own fields (no rule-authored path). */
  explainabilityDerived: z.boolean(),
});
export type SignalView = z.infer<typeof SignalViewSchema>;

export const ConfidenceTileSchema = z.object({
  id: ConfidenceDimensionSchema,
  label: z.string(),
  value: availabilitySchema(z.number().min(0).max(1)),
  format: z.enum(["percent", "score"]),
  note: z.string(),
  tone: z.enum(["positive", "info", "warning", "magenta", "neutral"]),
});
export type ConfidenceTile = z.infer<typeof ConfidenceTileSchema>;

export const RiskWorkspaceSchema = z.object({
  caseId: CaseIdSchema,
  rulesEvaluated: z.number().int().nonnegative(),
  severity: z.array(z.object({ severity: SeveritySchema, count: z.number().int(), note: z.string() })),
  /** The six confidence dimensions, always reported separately. */
  confidence: z.array(ConfidenceTileSchema).length(6),
  signals: z.array(SignalViewSchema),
  timeline: z.object({
    months: z.array(z.string()),
    partialMonths: z.array(z.number().int()),
    note: z.string().nullable(),
    lanes: z.array(
      z.object({ id: SignalCategorySchema, label: z.string(), cells: z.array(SeveritySchema.nullable()) }),
    ),
  }),
  categories: z.array(
    z.object({
      label: RiskSignalSchema.shape.reportingCategory,
      signals: z.number().int(),
      open: z.number().int(),
    }),
  ),
  /** Signals not marked false positive — drives the profile tab badge. */
  activeCount: z.number().int(),
});
export type RiskWorkspace = z.infer<typeof RiskWorkspaceSchema>;

const reason = z
  .string()
  .trim()
  .min(10, "Give a reason of at least 10 characters — it is kept in the audit trail.");

/** Underwriter actions on a signal. Closing a signal always needs a reason. */
export const SignalActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("acknowledge") }),
  z.object({ type: z.literal("investigate") }),
  z.object({ type: z.literal("assign"), owner: z.string().trim().min(1) }),
  z.object({ type: z.literal("comment"), text: z.string().trim().min(3, "Commentary is too short.") }),
  z.object({ type: z.literal("false_positive"), reason }),
  z.object({ type: z.literal("resolve"), reason }),
]);
export type SignalAction = z.infer<typeof SignalActionSchema>;
export type SignalActionType = SignalAction["type"];

export const CLOSED_STATUSES: readonly SignalStatus[] = ["resolved", "false_positive"];

/** Analysts a signal can be assigned to (demo directory). */
export const ANALYSTS = ["P. Raman", "S. Menon", "A. Iyer", "R. Kulkarni"] as const;
