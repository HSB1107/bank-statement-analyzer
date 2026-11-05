import { z } from "zod";
import { CaseIdSchema, JobIdSchema } from "@/shared/data/schemas/ids";

export const StageStatusSchema = z.enum(["pending", "running", "done", "warning"]);
export type StageStatus = z.infer<typeof StageStatusSchema>;

export const PlanStageSchema = z.object({
  index: z.number().int().min(1),
  id: z.string(),
  name: z.string(),
  /** Detail shown once the stage has run (computed from the data). */
  detail: z.string(),
  /** Detail shown while pending (what the stage will do). */
  pendingDetail: z.string(),
  durationSec: z.number().positive(),
  outcome: z.enum(["done", "warning"]),
});
export type PlanStage = z.infer<typeof PlanStageSchema>;

export const NetworkNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  side: z.enum(["inflow", "outflow"]),
  hub: z.enum(["icici", "hdfc", "sbi"]),
  valueMinor: z.number().int().nonnegative(),
  /** Stage index at which the node resolves and appears. */
  appearsAtStage: z.number().int(),
});
export type NetworkNode = z.infer<typeof NetworkNodeSchema>;

export const ProcessingPlanSchema = z.object({
  caseId: CaseIdSchema,
  jobId: JobIdSchema,
  startedAt: z.string(),
  stages: z.array(PlanStageSchema),
  totals: z.object({
    transactions: z.number().int(),
    categories: z.number().int(),
    extraction: z.number(),
    accounts: z.number().int(),
  }),
  perAccount: z.array(
    z.object({ label: z.string(), transactions: z.number().int(), confidence: z.number() }),
  ),
  exceptions: z.array(z.object({ tag: z.string(), text: z.string() })),
  network: z.object({
    hubs: z.array(z.object({ id: z.enum(["icici", "hdfc", "sbi"]), label: z.string() })),
    nodes: z.array(NetworkNodeSchema),
    ownTransferMinor: z.number().int(),
  }),
  periodLabel: z.string(),
});
export type ProcessingPlan = z.infer<typeof ProcessingPlanSchema>;

export const ProcessingEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stage"),
    index: z.number().int(),
    status: StageStatusSchema,
    progress: z.number().min(0).max(1),
    elapsedSec: z.number(),
  }),
  z.object({ type: z.literal("trace"), tag: z.string(), text: z.string() }),
  z.object({ type: z.literal("done"), elapsedSec: z.number() }),
]);
export type ProcessingEvent = z.infer<typeof ProcessingEventSchema>;
