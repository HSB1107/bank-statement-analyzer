import { z } from "zod";
import { CaseStageSchema, CaseSummarySchema, HealthBandSchema } from "@/shared/data/schemas/case";
import { CaseIdSchema } from "@/shared/data/schemas/ids";
import { RegionSchema } from "@/shared/data/schemas/customer";
import { SeveritySchema } from "@/shared/data/schemas/signal";
import { CurrencySchema, MoneySchema } from "@/shared/lib/money";

export const SegmentFilterSchema = z.enum([
  "all",
  "retail",
  "corporate_all",
  "salaried",
  "self_employed",
  "sme",
  "corporate",
]);
export const RegionFilterSchema = z.enum(["all", "IN", "ME", "ANZ"]);

export const DashboardFiltersSchema = z.object({
  periodDays: z.union([z.literal(30), z.literal(90)]),
  segment: SegmentFilterSchema,
  region: RegionFilterSchema,
  analyst: z.string(),
});
export type DashboardFilters = z.infer<typeof DashboardFiltersSchema>;

export const KpiIdSchema = z.enum([
  "customersAnalysed",
  "bankAccounts",
  "analysisCases",
  "statementsQueued",
  "awaitingReview",
  "profilesGenerated",
  "criticalSignals",
  "avgProcessingMinutes",
]);
export type KpiId = z.infer<typeof KpiIdSchema>;

export const KpiValueSchema = z.object({
  id: KpiIdSchema,
  value: z.number(),
  delta: z.number(),
  series: z.array(z.number()),
});
export type KpiValue = z.infer<typeof KpiValueSchema>;

export const InsightSchema = z.object({
  id: z.string(),
  severity: SeveritySchema,
  title: z.string(),
  detail: z.string(),
  caseIds: z.array(CaseIdSchema),
});
export type Insight = z.infer<typeof InsightSchema>;

export const DashboardOverviewSchema = z.object({
  kpis: z.array(KpiValueSchema),
  pipeline: z.object({
    total: z.number().int(),
    stages: z.array(z.object({ stage: CaseStageSchema, count: z.number().int() })),
  }),
  insights: z.array(InsightSchema),
  health: z.object({
    total: z.number().int(),
    bands: z.array(z.object({ band: HealthBandSchema, count: z.number().int() })),
    cutoffs: z.array(z.number()),
    modelNote: z.string(),
  }),
  segments: z.array(
    z.object({
      segment: z.enum(["salaried", "self_employed", "sme", "corporate"]),
      customers: z.number().int(),
      accounts: z.number().int(),
      cases: z.number().int(),
      accountsPerCustomer: z.number(),
    }),
  ),
  regions: z.array(
    z.object({
      region: RegionSchema,
      cases: z.number().int(),
      currencies: z.array(CurrencySchema),
      bands: z.array(z.object({ band: HealthBandSchema, count: z.number().int() })),
    }),
  ),
  quality: z.object({
    extraction: z.number(),
    autoClassified: z.number(),
    ownTransfers: z.number(),
    statementsWithGaps: z.number(),
    reclassifications: z.number(),
    reconFailures: z.number(),
  }),
  analysts: z.array(z.string()),
});
export type DashboardOverview = z.infer<typeof DashboardOverviewSchema>;

export const LiquidityGroupSchema = z.enum(["retail", "corporate_all"]);
export const LiquidityQuerySchema = z.object({ group: LiquidityGroupSchema, currency: CurrencySchema });
export type LiquidityQuery = z.infer<typeof LiquidityQuerySchema>;

export const LiquiditySnapshotSchema = z.object({
  group: LiquidityGroupSchema,
  currency: CurrencySchema,
  customers: z.number().int(),
  avgInflow: MoneySchema,
  avgOutflow: MoneySchema,
  avgNet: MoneySchema,
  avgBalance: MoneySchema,
  negativeNetShare: z.number(),
  irregularIncomeShare: z.number(),
  foirAbove50Share: z.number(),
  options: z.array(LiquidityQuerySchema),
});
export type LiquiditySnapshot = z.infer<typeof LiquiditySnapshotSchema>;

export const WorkQueueQuerySchema = z.object({
  filters: DashboardFiltersSchema,
  type: z.string().default("all"),
  queueRegion: z.string().default("all"),
  sector: z.string().default("all"),
  risk: z.string().default("all"),
  stage: z.union([CaseStageSchema, z.literal("all")]).default("all"),
  limit: z.number().int().positive().default(8),
});
export type WorkQueueQuery = z.input<typeof WorkQueueQuerySchema>;

export const WorkQueuePageSchema = z.object({
  total: z.number().int(),
  rows: z.array(CaseSummarySchema),
  facets: z.object({ types: z.array(z.string()), sectors: z.array(z.string()) }),
});
export type WorkQueuePage = z.infer<typeof WorkQueuePageSchema>;
