import { z } from "zod";
import { IsoDateSchema } from "@/shared/lib/dates";
import { MoneySchema } from "@/shared/lib/money";
import { ProvenanceSchema } from "@/shared/lib/provenance";
import { HealthBandSchema } from "@/shared/data/schemas/case";

const Ratio = z.number();
const Line = z.object({ provenance: ProvenanceSchema, text: z.string() });

export const DimensionSchema = z.object({
  id: z.string(),
  label: z.string(),
  weight: z.number(),
  score: z.number().int(),
  delta: z.number().int(),
  positive: z.string(),
  negative: z.string(),
  confidence: z.enum(["High", "Medium", "Low"]),
});

export const HealthSchema = z.object({
  score: z.number().int(),
  band: HealthBandSchema,
  bandPosition: z.enum(["lower", "mid", "upper"]),
  previous: z.number().int(),
  previousPeriod: z.string(),
  cutoffs: z.array(z.number()),
  model: z.string(),
  modelConfidence: z.number(),
  dataCompleteness: z.number(),
  extractionConfidence: z.number(),
  classificationConfidence: z.number(),
});

export const RadarAxisSchema = z.object({
  id: z.string(),
  label: z.string(),
  current: z.number(),
  previous: z.number(),
});

export const IndividualOverviewSchema = z.object({
  kpis: z.object({
    avgMonthlyIncome: MoneySchema,
    avgMonthlyOutflow: MoneySchema,
    expenseToIncome: Ratio,
    expenseToIncomeFirst: Ratio,
    expenseToIncomeLast: Ratio,
    foir: Ratio,
    policyFoir: Ratio,
    avgDailyBalance: MoneySchema,
    days: z.number().int(),
    primaryLow: MoneySchema,
    primaryLowDate: IsoDateSchema,
    primaryAccount: z.string(),
  }),
  health: HealthSchema,
  radar: z.object({ currentLabel: z.string(), previousLabel: z.string(), axes: z.array(RadarAxisSchema) }),
  summary: z.object({
    headline: z.string(),
    citations: z.number().int(),
    confidence: z.number(),
    lines: z.array(Line),
  }),
  dimensions: z.array(DimensionSchema),
  formula: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  attention: z.array(z.string()),
});
export type IndividualOverview = z.infer<typeof IndividualOverviewSchema>;

export const IncomeAnalysisSchema = z.object({
  kpis: z.object({
    totalCredits: MoneySchema,
    ownTransfers: MoneySchema,
    avgIncome: MoneySchema,
    median: MoneySchema,
    salaryTotal: MoneySchema,
    salaryCredits: z.number().int(),
    employers: z.number().int(),
    otherRecurring: MoneySchema,
    nonRecurring: MoneySchema,
    loan: MoneySchema,
    growth: Ratio,
    volatility: Ratio,
  }),
  trend: z.array(
    z.object({
      month: z.string(),
      salary: MoneySchema,
      otherRecurring: MoneySchema,
      nonIncome: MoneySchema,
      total: MoneySchema,
      note: z.string().nullable(),
    }),
  ),
  trendNote: z.string(),
  distribution: z.array(
    z.object({ id: z.string(), label: z.string(), amount: MoneySchema, share: Ratio, nature: z.string() }),
  ),
  distributionTotal: MoneySchema,
  notObserved: z.string(),
  salary: z.object({
    rule: z.string(),
    calendar: z.array(
      z.object({
        month: z.string(),
        amount: MoneySchema,
        day: z.number().int().nullable(),
        status: z.enum(["on_time", "delayed", "missed"]),
        delayDays: z.number().int(),
      }),
    ),
    facts: z.array(
      z.object({ label: z.string(), value: z.string(), tone: z.enum(["positive", "warning", "neutral"]) }),
    ),
  }),
  stability: z.object({
    score: z.number().int(),
    label: z.string(),
    model: z.string(),
    note: z.string(),
    items: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        meter: Ratio,
        tone: z.enum(["positive", "warning", "negative"]),
      }),
    ),
    ai: z.string(),
  }),
});
export type IncomeAnalysis = z.infer<typeof IncomeAnalysisSchema>;

export const LiquidityAnalysisSchema = z.object({
  kpis: z.object({
    avgMonthlyBalance: MoneySchema,
    avgDailyBalance: MoneySchema,
    avgMonthEnd: MoneySchema,
    min: MoneySchema,
    max: MoneySchema,
    closing: MoneySchema,
    lowBalanceDays: z.number().int(),
    lowBalanceRule: z.string(),
    negativeBalances: z.number().int(),
    odFacility: z.boolean(),
    bufferMonths: z.number(),
  }),
  series: z.array(
    z.object({
      date: IsoDateSchema,
      consolidated: MoneySchema,
      primary: MoneySchema,
      secondary: MoneySchema,
    }),
  ),
  seriesLabels: z.object({ primary: z.string(), secondary: z.string() }),
  markers: z.array(
    z.object({
      date: IsoDateSchema,
      label: z.string(),
      kind: z.enum(["salary", "loan", "major_payment", "returned", "closing"]),
      series: z.enum(["consolidated", "primary"]),
    }),
  ),
  lowThreshold: MoneySchema,
  indicator: z.object({
    score: z.number().int(),
    label: z.string(),
    model: z.string(),
    previous: z.number().int(),
    previousPeriod: z.string(),
    confidence: z.number(),
    items: z.array(z.object({ label: z.string(), detail: z.string(), score: z.number().int() })),
  }),
  monthly: z.array(
    z.object({
      month: z.string(),
      inflow: MoneySchema,
      outflow: MoneySchema,
      net: MoneySchema,
      monthEnd: MoneySchema,
    }),
  ),
  totals: z.object({
    inflow: MoneySchema,
    outflow: MoneySchema,
    net: MoneySchema,
    margin: Ratio,
    retention: Ratio,
    negativeMonths: z.number().int(),
  }),
  seasonality: z.string(),
});
export type LiquidityAnalysis = z.infer<typeof LiquidityAnalysisSchema>;

export const ObligationsAnalysisSchema = z.object({
  foir: z.object({
    month: z.string(),
    value: Ratio,
    policy: Ratio,
    policyId: z.string(),
    within: z.boolean(),
    first: Ratio,
    numerator: MoneySchema,
    numeratorParts: z.string(),
    denominator: MoneySchema,
    denominatorParts: z.string(),
    cardAvg: MoneySchema,
    fixedRatio: Ratio,
  }),
  trend: z.array(z.object({ month: z.string(), foir: Ratio, emi: MoneySchema, income: MoneySchema })),
  headroom: MoneySchema,
  maxNewEmi: MoneySchema,
  committedInclRent: MoneySchema,
  recurring: z.array(
    z.object({
      label: z.string(),
      sublabel: z.string(),
      counterparty: z.string(),
      avgMonthly: MoneySchema,
      frequency: z.string(),
      lastPayment: IsoDateSchema.nullable(),
      regularity: z.string(),
      regularityTone: z.enum(["positive", "warning", "info"]),
      confidence: z.number(),
      treatment: z.enum(["FOIR", "Fixed", "Excluded"]),
    }),
  ),
  recurringRule: z.string(),
  servicing: z.array(
    z.object({
      label: z.string(),
      count: z.number().int(),
      detail: z.string(),
      provenance: ProvenanceSchema,
    }),
  ),
  servicingAi: z.string(),
  calendar: z.array(
    z.object({
      month: z.string(),
      cells: z.array(
        z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("none") }),
          z.object({ kind: z.literal("paid"), day: z.number().int(), full: z.boolean() }),
          z.object({
            kind: z.literal("returned_then_paid"),
            returnedDay: z.number().int(),
            paidDay: z.number().int(),
          }),
        ]),
      ),
    }),
  ),
  calendarColumns: z.array(z.string()),
  nextDue: z.string(),
});
export type ObligationsAnalysis = z.infer<typeof ObligationsAnalysisSchema>;
