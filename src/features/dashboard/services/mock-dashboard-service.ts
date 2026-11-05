import { available } from "@/shared/lib/availability";
import { money, type Currency } from "@/shared/lib/money";
import { type MockRuntime } from "@/shared/lib/mock-runtime";
import { demoCaseHealth } from "@/shared/data/demo-profiles";
import { getPortfolio, NAMED_QUEUE, type PortfolioCase } from "@/shared/data/generators/portfolio";
import { HEALTH_BAND_CUTOFFS, type CaseSummary } from "@/shared/data/schemas/case";
import {
  dashboardKpis,
  healthDistribution,
  insightCounts,
  openCases,
  pipeline,
  processingQuality,
  regionalOverview,
  retailLiquidity,
  segmentBreakdown,
} from "@/shared/data/selectors/portfolio";
import {
  DashboardOverviewSchema,
  KpiIdSchema,
  LiquiditySnapshotSchema,
  WorkQueuePageSchema,
  WorkQueueQuerySchema,
  type LiquidityQuery,
} from "../schemas/dashboard";
import { type DashboardService } from "./dashboard-service";

function toSummary(c: PortfolioCase): CaseSummary {
  const demo = demoCaseHealth(c.id);
  return {
    id: c.id,
    customerId: c.customerId,
    customerName: c.customerName,
    segment: c.segment,
    typeLabel: c.typeLabel,
    sector: c.sector,
    region: c.region,
    accounts: c.accounts,
    currency: c.currency,
    periodLabel: c.periodLabel,
    analyst: c.analyst,
    health: demo ? available(demo) : c.health,
    risk: c.risk,
    stage: c.stage === "archived" ? "completed" : c.stage,
    updatedMinutesAgo: c.updatedMinutesAgo,
    demo: c.demo,
  };
}

function insights() {
  const i = insightCounts(getPortfolio());
  const more = (ids: readonly string[], shown: number) =>
    ids.length > shown ? ` +${ids.length - shown}` : "";
  return [
    {
      id: "circular",
      severity: "critical",
      title: `Potential circular fund movement observed in ${i.circular_flow.count} corporate cases`,
      detail: `Out → related party → back within 30d · ${i.circular_flow.caseIds[0] ?? ""}${more(i.circular_flow.caseIds, 1)}`,
      caseIds: i.circular_flow.caseIds,
    },
    {
      id: "amb",
      severity: "high",
      title: `Unusual decline in average monthly balances across ${i.amb_decline.count} SME cases`,
      detail: "AMB -28% to -46% over 3 months",
      caseIds: i.amb_decline.caseIds,
    },
    {
      id: "salary",
      severity: "high",
      title: `Salary continuity concerns in ${i.salary_continuity.count} retail applications`,
      detail: `Delayed or missed expected credit · ${i.salary_continuity.caseIds[0] ?? ""}${more(i.salary_continuity.caseIds, 1)}`,
      caseIds: i.salary_continuity.caseIds,
    },
    {
      id: "emi",
      severity: "medium",
      title: `Recurring EMI obligations increased materially in ${i.emi_increase.count} profiles`,
      detail: "New ACH mandates in last 60 days",
      caseIds: i.emi_increase.caseIds,
    },
    {
      id: "concentration",
      severity: "medium",
      title: `High inflow concentration in ${i.inflow_concentration.count} corporate accounts`,
      detail: "Top-3 counterparties > 70% of external inflows",
      caseIds: i.inflow_concentration.caseIds,
    },
  ];
}

const LIQUIDITY_OPTIONS: readonly LiquidityQuery[] = [
  { group: "retail", currency: "INR" },
  { group: "corporate_all", currency: "INR" },
];

export function createMockDashboardService(runtime: MockRuntime): DashboardService {
  return {
    async getOverview(filters) {
      await runtime.delay();
      runtime.maybeFail("dashboard overview");
      const p = getPortfolio();
      const k = dashboardKpis(p, filters);
      const analysts = [
        ...new Set(p.cases.map((c) => c.analyst).filter((a): a is string => a !== null)),
      ].sort();
      return DashboardOverviewSchema.parse({
        kpis: KpiIdSchema.options.map((id) => ({ id, ...k[id] })),
        pipeline: pipeline(p, filters),
        insights: insights(),
        health: {
          ...healthDistribution(p, filters),
          cutoffs: Object.values(HEALTH_BAND_CUTOFFS),
          modelNote: "model SCM-RTL v2.1 & SCM-CORP v1.3 (configurable)",
        },
        segments: segmentBreakdown(p),
        regions: regionalOverview(p),
        quality: processingQuality(p),
        analysts,
      });
    },
    async getLiquidity(query) {
      await runtime.delay();
      const p = getPortfolio();
      const l = retailLiquidity(p, query.group, query.currency);
      const m = (v: number, c: Currency) => money(Math.round(v * 100), c);
      return LiquiditySnapshotSchema.parse({
        ...query,
        customers: l.customers,
        avgInflow: m(l.avgInflow, query.currency),
        avgOutflow: m(l.avgOutflow, query.currency),
        avgNet: m(l.avgNet, query.currency),
        avgBalance: m(l.avgBalance, query.currency),
        negativeNetShare: l.negativeNetShare,
        irregularIncomeShare: l.irregularIncomeShare,
        foirAbove50Share: l.foirAbove50Share,
        options: LIQUIDITY_OPTIONS,
      });
    },
    async getWorkQueue(raw) {
      await runtime.delay();
      const q = WorkQueueQuerySchema.parse(raw);
      const p = getPortfolio();
      const all = openCases(p, q.filters).map(toSummary);
      const rows = all.filter(
        (c) =>
          (q.type === "all" || c.typeLabel === q.type) &&
          (q.queueRegion === "all" || c.region === q.queueRegion) &&
          (q.sector === "all" || c.sector === q.sector) &&
          (q.risk === "all" || (c.risk.status === "available" && c.risk.value === q.risk)) &&
          (q.stage === "all" || c.stage === q.stage),
      );
      // The eight named cases from the PDF lead the queue; the rest follow by recency.
      const named = new Set<string>(NAMED_QUEUE.map((n) => n.id));
      const ordered = [...rows.filter((r) => named.has(r.id)), ...rows.filter((r) => !named.has(r.id))];
      return WorkQueuePageSchema.parse({
        total: rows.length,
        rows: ordered.slice(0, q.limit),
        facets: {
          types: [...new Set(all.map((c) => c.typeLabel))].sort(),
          sectors: [...new Set(all.map((c) => c.sector).filter((s) => s !== "—"))].sort(),
        },
      });
    },
  };
}
