import { z } from "zod";
import { availabilitySchema } from "@/shared/lib/availability";
import { IsoDateSchema } from "@/shared/lib/dates";
import { MoneySchema } from "@/shared/lib/money";
import { ProvenanceSchema } from "@/shared/lib/provenance";
import { HealthBandSchema } from "@/shared/data/schemas/case";
import { TransactionIdSchema } from "@/shared/data/schemas/ids";
import { SeveritySchema } from "@/shared/data/schemas/signal";

const Ratio = z.number();
const Line = z.object({ provenance: ProvenanceSchema, text: z.string() });

export const CorporateOverviewSchema = z.object({
  kpis: z.object({
    receiptsProxy: MoneySchema,
    operatingOutflows: MoneySchema,
    netOperating: MoneySchema,
    q1NetOperating: MoneySchema,
    q2NetOperating: MoneySchema,
    top3Share: Ratio,
    top3Names: z.array(z.string()),
    odUtilJune: availabilitySchema(Ratio),
    odLimit: availabilitySchema(MoneySchema),
    odPeak: Ratio,
    debtServiceProxy: z.number(),
  }),
  health: z.object({
    score: z.number().int(),
    band: HealthBandSchema,
    previous: z.number().int(),
    previousPeriod: z.string(),
    cutoffs: z.array(z.number()),
    model: z.string(),
    dimensions: z.array(
      z.object({ label: z.string(), score: z.number().int(), delta: z.number().int(), weight: z.number() }),
    ),
    modelConfidence: z.number(),
    completeness: z.number(),
  }),
  radar: z.object({
    currentLabel: z.string(),
    previousLabel: z.string(),
    axes: z.array(z.object({ id: z.string(), label: z.string(), current: z.number(), previous: z.number() })),
  }),
  summary: z.object({
    headline: z.string(),
    citations: z.number().int(),
    confidence: z.number(),
    lines: z.array(Line),
  }),
  concentration: z.object({ rows: z.array(z.object({ label: z.string(), share: Ratio })), hhi: z.number() }),
  assessment: z.object({
    strengths: z.array(z.string()),
    concerns: z.array(z.string()),
    attention: z.array(z.string()),
  }),
});
export type CorporateOverview = z.infer<typeof CorporateOverviewSchema>;

export const InflowAnalysisSchema = z.object({
  kpis: z.object({
    grossCredits: MoneySchema,
    ownTransfers: MoneySchema,
    pairs: z.number().int(),
    loanProceeds: MoneySchema,
    loanNote: z.string(),
    relatedParty: MoneySchema,
    relatedNote: z.string(),
    receiptsProxy: MoneySchema,
    payers: z.number().int(),
    recurringPayers: z.number().int(),
    oneOffPayers: z.number().int(),
  }),
  trend: z.array(
    z.object({
      month: z.string(),
      collections: MoneySchema,
      termLoan: MoneySchema,
      relatedParty: MoneySchema,
      ownTransfers: MoneySchema,
      total: MoneySchema,
    }),
  ),
  quarters: z.object({ q1: MoneySchema, q2: MoneySchema, change: Ratio }),
  methodology: z.object({
    id: z.string(),
    rows: z.array(
      z.object({ label: z.string(), amount: MoneySchema, sign: z.enum(["base", "minus", "result"]) }),
    ),
    annualised: MoneySchema,
    fyRevenue: MoneySchema,
    fyLabel: z.string(),
  }),
  concentration: z.object({
    months: z.array(z.string()),
    rows: z.array(
      z.object({
        rank: z.number().int().nullable(),
        label: z.string(),
        fx: z.string().nullable(),
        monthly: z.array(MoneySchema),
        total: MoneySchema,
        share: Ratio,
        cumulative: Ratio,
      }),
    ),
    top3: Ratio,
    top5: Ratio,
  }),
  fxNote: z.string(),
  resolutionNote: z.string(),
  trendSeries: z.array(z.object({ month: z.string(), top3: Ratio, leader: Ratio })),
  alertThreshold: Ratio,
  alertId: z.string(),
  consistency: z.array(
    z.object({
      label: z.string(),
      detail: z.string(),
      tone: z.enum(["positive", "negative", "warning", "neutral"]),
    }),
  ),
});
export type InflowAnalysis = z.infer<typeof InflowAnalysisSchema>;

export const CorporateLiquiditySchema = z.object({
  kpis: z.object({
    avgBank: MoneySchema,
    min: MoneySchema,
    minDate: IsoDateSchema,
    max: MoneySchema,
    maxDate: IsoDateSchema,
    closing: MoneySchema,
    lowDays: z.number().int(),
    lowThreshold: MoneySchema,
    lowAllInMonth: z.string().nullable(),
    negatives: z.number().int(),
    odJune: availabilitySchema(Ratio),
    odJuneDrawn: availabilitySchema(MoneySchema),
    odLimit: availabilitySchema(MoneySchema),
    netCash: MoneySchema,
    negativeNetMonths: z.number().int(),
  }),
  od: z.object({
    account: z.string(),
    limitSource: z.string().nullable(),
    series: z.array(z.object({ date: IsoDateSchema, utilisation: availabilitySchema(Ratio) })),
    peak: z.object({ date: IsoDateSchema, utilisation: Ratio }),
    stress: Ratio,
    missingNote: z.string(),
  }),
  runway: z.object({
    months: z.number(),
    coverDays: z.number(),
    available: MoneySchema,
    cash: MoneySchema,
    undrawn: MoneySchema,
    avgOutflow: MoneySchema,
    burn: MoneySchema,
  }),
  waterfall: z.array(
    z.object({ label: z.string(), amount: MoneySchema, kind: z.enum(["total", "in", "out"]) }),
  ),
  stress: z.array(z.object({ label: z.string(), detail: z.string(), tone: z.enum(["warning", "negative"]) })),
  cashflow: z.object({
    months: z.array(z.string()),
    rows: z.array(
      z.object({
        label: z.string(),
        values: z.array(MoneySchema),
        total: MoneySchema,
        emphasis: z.boolean(),
      }),
    ),
    odMonthEnd: z.array(availabilitySchema(Ratio)),
    note: z.string(),
  }),
});
export type CorporateLiquidity = z.infer<typeof CorporateLiquiditySchema>;

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(["own", "customer", "supplier", "payroll", "statutory", "lender", "flagged"]),
  inflow: MoneySchema,
  outflow: MoneySchema,
  share: z.string(),
  hub: z.string(),
});
export const FundFlowSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  ownTransfers: MoneySchema,
  counterparties: z.number().int(),
  shown: z.number().int(),
  groupedBelow: MoneySchema,
  details: z.record(
    z.string(),
    z.object({
      title: z.string(),
      badge: z.string().nullable(),
      subtitle: z.string(),
      paidOut: MoneySchema,
      received: MoneySchema,
      triggering: z.array(
        z.object({
          id: TransactionIdSchema,
          date: IsoDateSchema,
          narration: z.string(),
          source: z.string(),
          direction: z.enum(["credit", "debit"]),
          amount: MoneySchema,
        }),
      ),
      evidence: z.array(z.string()),
      ai: z.string().nullable(),
    }),
  ),
  defaultSelection: z.string(),
  signals: z.array(
    z.object({
      severity: z.union([SeveritySchema, z.literal("info")]),
      title: z.string(),
      detail: z.string(),
      action: z.string(),
      confidence: z.number(),
    }),
  ),
  topIncoming: z.array(
    z.object({ label: z.string(), channel: z.string(), amount: MoneySchema, share: Ratio }),
  ),
  topOutgoing: z.array(z.object({ label: z.string(), pattern: z.string(), amount: MoneySchema })),
});
export type FundFlow = z.infer<typeof FundFlowSchema>;
