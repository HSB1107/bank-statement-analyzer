import { available, notAvailable } from "@/shared/lib/availability";
import { createRng, splitInteger, type Rng } from "@/shared/lib/prng";
import { type Currency } from "@/shared/lib/money";
import { CaseIdSchema, CustomerIdSchema, type CaseId, type CustomerId } from "../schemas/ids";
import { healthBandFor, type CaseStage, type HealthBand, type RiskLevel } from "../schemas/case";
import { type Region, type Segment } from "../schemas/customer";

/**
 * Seeded portfolio behind the Executive Dashboard: 1,184 customers, 2,736 accounts and
 * 2,947 cases. Counts by segment, band, region and stage are pinned to the PDF and every
 * dashboard figure is aggregated from these records by selectors.
 */
export const PORTFOLIO_SEED = 20261105;

export const SEGMENT_TARGETS = {
  salaried: { customers: 612, accounts: 1104, cases: 1368 },
  self_employed: { customers: 238, accounts: 461, cases: 579 },
  sme: { customers: 251, accounts: 812, cases: 694 },
  corporate: { customers: 83, accounts: 359, cases: 306 },
} as const;

export const BAND_TARGETS: Readonly<Record<HealthBand, number>> = {
  critical: 61,
  weak: 168,
  watchlist: 362,
  healthy: 431,
  strong: 162,
};
export const REGION_CASE_TARGETS: Readonly<Record<Region, number>> = { IN: 2214, ME: 418, ANZ: 315 };
export const STAGE_TARGETS: Readonly<Record<CaseStage, number>> = {
  new: 46,
  docs_uploaded: 61,
  ai_processing: 29,
  txn_validation: 52,
  financial_profiling: 18,
  underwriter_review: 87,
  completed: 2318,
};
/** Cases archived without a profile (withdrawn / duplicate / expired) — outside the 30-day pipeline. */
export const ARCHIVED_CASES = 2947 - Object.values(STAGE_TARGETS).reduce((a, b) => a + b, 0);

/** New entities in the last 30 days, pinned to the KPI deltas. */
export const RECENT_TARGETS = { customers: 82, accounts: 228, cases: 233, profiles: 214 } as const;

export type PortfolioSegment = keyof typeof SEGMENT_TARGETS;

export interface PortfolioCustomer {
  id: CustomerId;
  name: string;
  segment: PortfolioSegment;
  region: Region;
  currency: Currency;
  accounts: number;
  createdDaysAgo: number;
  health: { score: number; band: HealthBand };
  /** Monthly figures in major units of `currency` (retail liquidity panel). */
  avgInflow: number;
  avgOutflow: number;
  avgBalance: number;
  irregularIncome: boolean;
  foirAbove50: boolean;
}

export interface PortfolioCase {
  id: CaseId;
  customerId: CustomerId | null;
  customerName: string;
  segment: Segment;
  typeLabel: string;
  sector: string;
  region: Region;
  currency: Currency;
  accounts: number;
  periodLabel: string;
  analyst: string | null;
  stage: CaseStage | "archived";
  createdDaysAgo: number;
  completedDaysAgo: number | null;
  updatedMinutesAgo: number;
  health: ReturnType<typeof available<{ score: number; band: HealthBand }>> | ReturnType<typeof notAvailable>;
  risk: ReturnType<typeof available<RiskLevel>> | ReturnType<typeof notAvailable>;
  demo: boolean;
  quality: {
    extraction: number;
    autoClassified: number;
    ownTransferShare: number;
    statements: number;
    statementsWithGaps: number;
    reclassified: number;
    reconFailure: boolean;
  } | null;
  processingMinutes: number | null;
  insightFlags: readonly InsightFlag[];
}

export type InsightFlag =
  "circular_flow" | "amb_decline" | "salary_continuity" | "emi_increase" | "inflow_concentration";

export const INSIGHT_TARGETS: Readonly<Record<InsightFlag, number>> = {
  circular_flow: 2,
  amb_decline: 8,
  salary_continuity: 5,
  emi_increase: 6,
  inflow_concentration: 3,
};

/** Snapshot KPIs without an entity history (daily values pinned at t-30 and t0). */
export const SNAPSHOT_TARGETS = {
  statementsQueued: { now: 214, before: 163 },
  awaitingReview: { now: 87, before: 77 },
  criticalSignals: { now: 42, before: 33 },
  avgProcessingMinutes: { now: 6.8, before: 8.7 },
} as const;

/** Retail · INR liquidity panel targets (monthly, ₹). */
export const RETAIL_INR = {
  customers: 500,
  avgInflow: 1_38_300,
  avgOutflow: 1_29_200,
  avgBalance: 2_06_000,
  negativeNet: 117,
  irregular: 89,
  foirAbove50: 56,
} as const;

/** Processing-quality targets over completed cases in the last 30 days. */
export const QUALITY_TARGETS = {
  extraction: 0.976,
  autoClassified: 0.931,
  ownTransferShare: 0.114,
  statementsWithGaps: 0.062,
  reclassified: 0.028,
  reconFailures: 0.009,
} as const;

const ANALYSTS = [
  "P. Raman",
  "S. Menon",
  "A. Haddad",
  "J. Whitfield",
  "R. Kulkarni",
  "M. Fernandes",
] as const;
const FIRST = [
  "Aarav",
  "Diya",
  "Ishaan",
  "Kavya",
  "Rohan",
  "Sneha",
  "Vikram",
  "Ananya",
  "Karan",
  "Meera",
  "Nikhil",
  "Pooja",
  "Rahul",
  "Tanvi",
  "Aditya",
  "Neha",
];
const LAST = [
  "Sharma",
  "Iyer",
  "Patel",
  "Reddy",
  "Nair",
  "Gupta",
  "Menon",
  "Joshi",
  "Kapoor",
  "Shah",
  "Rao",
  "Bose",
  "Desai",
  "Pillai",
];
const ME_NAMES = [
  "Al Noor",
  "GulfStar",
  "Desert Rose",
  "Falcon",
  "Oasis",
  "Emirates Crest",
  "Al Waha",
  "Pearl Bay",
];
const ANZ_NAMES = ["Southern Cross", "Harbour Line", "Kiwi Ridge", "Tasman", "Coral Coast", "Outback"];
const COMPANY_TAIL = [
  "Logistics",
  "Engineering",
  "Foods",
  "Medical Centres",
  "Industrial Trading LLC",
  "Textiles",
  "Auto Parts",
  "Packaging",
];
const SECTORS = ["Manufacturing", "Trading", "Services", "Healthcare", "Logistics", "Retail"];

const SEGMENT_LABEL: Readonly<Record<PortfolioSegment, string>> = {
  salaried: "Salaried",
  self_employed: "Self-employed",
  sme: "SME Corporate",
  corporate: "Corporate",
};

/** The eight queue rows shown on screen 2 (two are the Pass-1 demo cases). */
export const NAMED_QUEUE = [
  {
    id: "BSA-26-04417",
    name: "Arjun Mehta",
    customerId: "CUST-IN-R-210457",
    segment: "salaried",
    typeLabel: "Salaried",
    region: "IN",
    currency: "INR",
    accounts: 2,
    period: "Jan-Jun 26",
    analyst: "P. Raman",
    stage: "underwriter_review",
    minutes: 6,
    demo: true,
    health: null,
    risk: "moderate",
  },
  {
    id: "BSA-26-04421",
    name: "Meridian Precision Components",
    customerId: "CUST-IN-000318",
    segment: "sme",
    typeLabel: "SME Corporate",
    region: "IN",
    currency: "INR",
    accounts: 3,
    period: "Jan-Jun 26",
    analyst: "P. Raman",
    stage: "txn_validation",
    minutes: 14,
    demo: true,
    health: null,
    risk: "elevated",
  },
  {
    id: "BSA-26-04409",
    name: "Neha Kapoor",
    customerId: null,
    segment: "self_employed",
    typeLabel: "Self-employed",
    region: "IN",
    currency: "INR",
    accounts: 1,
    period: "Jan-Jun 26",
    analyst: "S. Menon",
    stage: "completed",
    minutes: 38,
    demo: false,
    health: 64,
    risk: "elevated",
  },
  {
    id: "BSA-26-04425",
    name: "GulfStar Industrial Trading LLC",
    customerId: null,
    segment: "corporate",
    typeLabel: "Corporate",
    region: "ME",
    currency: "AED",
    accounts: 2,
    period: "Jan-Jun 26",
    analyst: "A. Haddad",
    stage: "ai_processing",
    minutes: 41,
    demo: false,
    health: null,
    risk: null,
  },
  {
    id: "BSA-26-04398",
    name: "Southern Cross Logistics",
    customerId: null,
    segment: "corporate",
    typeLabel: "Corporate",
    region: "ANZ",
    currency: "AUD",
    accounts: 1,
    period: "Jan-Jun 26",
    analyst: "J. Whitfield",
    stage: "completed",
    minutes: 60,
    demo: false,
    health: 74,
    risk: "low",
  },
  {
    id: "BSA-26-04402",
    name: "Al Noor Medical Centres",
    customerId: null,
    segment: "sme",
    typeLabel: "SME Corporate",
    region: "ME",
    currency: "AED",
    accounts: 2,
    period: "Dec-May 26",
    analyst: "A. Haddad",
    stage: "underwriter_review",
    minutes: 120,
    demo: false,
    health: 52,
    risk: "high",
  },
  {
    id: "BSA-26-04430",
    name: "Rohan Iyer",
    customerId: null,
    segment: "salaried",
    typeLabel: "Salaried",
    region: "IN",
    currency: "INR",
    accounts: 1,
    period: "Apr-Sep 26",
    analyst: "S. Menon",
    stage: "docs_uploaded",
    minutes: 120,
    demo: false,
    health: null,
    risk: null,
  },
  {
    id: "BSA-26-04433",
    name: "Tanvi Shah",
    customerId: null,
    segment: "gig",
    typeLabel: "Gig worker",
    region: "IN",
    currency: "INR",
    accounts: 3,
    period: "Mar-Aug 26",
    analyst: null,
    stage: "new",
    minutes: 180,
    demo: false,
    health: null,
    risk: null,
  },
] as const;

function regionCurrency(rng: Rng, region: Region): Currency {
  if (region === "IN") return "INR";
  if (region === "ANZ") return rng.next() < 0.78 ? "AUD" : "NZD";
  return rng.pick(["AED", "AED", "AED", "SAR", "QAR", "KWD", "BHD", "OMR"] as const);
}

function bandScore(rng: Rng, band: HealthBand): number {
  const ranges: Readonly<Record<HealthBand, [number, number]>> = {
    critical: [22, 39],
    weak: [40, 54],
    watchlist: [55, 69],
    healthy: [70, 84],
    strong: [85, 96],
  };
  const [lo, hi] = ranges[band];
  return rng.int(lo, hi);
}

/** Scale a list of positive values so its mean is exactly `target` (integers). */
function calibrateMean(values: number[], target: number): number[] {
  const total = Math.round(target * values.length);
  return splitByShape(values, total);
}

function splitByShape(shape: readonly number[], total: number): number[] {
  const sum = shape.reduce((a, b) => a + b, 0);
  const raw = shape.map((v) => (v * total) / sum);
  const out = raw.map((v) => Math.floor(v));
  let rem = total - out.reduce((a, b) => a + b, 0);
  for (let i = 0; rem > 0; i = (i + 1) % out.length, rem--) out[i] = (out[i] ?? 0) + 1;
  return out;
}

function assignExact<T extends string>(
  rng: Rng,
  n: number,
  targets: Readonly<Record<T, number>>,
  keys: readonly T[],
): T[] {
  const out: T[] = [];
  for (const key of keys) for (let i = 0; i < targets[key]; i++) out.push(key);
  if (out.length !== n) throw new Error(`assignExact: ${out.length} !== ${n}`);
  return rng.shuffle(out);
}

export interface Portfolio {
  customers: PortfolioCustomer[];
  cases: PortfolioCase[];
  snapshots: Record<keyof typeof SNAPSHOT_TARGETS, number[]>;
}

let cache: Portfolio | null = null;

export function getPortfolio(): Portfolio {
  if (cache) return cache;
  const rng = createRng(PORTFOLIO_SEED);
  const customers: PortfolioCustomer[] = [];
  const segments: readonly PortfolioSegment[] = ["salaried", "self_employed", "sme", "corporate"];

  // Customers per segment with exact account totals; bands exact overall.
  const bands = assignExact(rng, 1184, BAND_TARGETS, ["critical", "weak", "watchlist", "healthy", "strong"]);
  let bandCursor = 0;
  let serial = 100000;
  const retailIndianIdx: number[] = [];
  for (const seg of segments) {
    const t = SEGMENT_TARGETS[seg];
    const extraAccounts = splitInteger(rng, t.accounts - t.customers, t.customers, 1.9);
    for (let i = 0; i < t.customers; i++) {
      const retail = seg === "salaried" || seg === "self_employed";
      const name = retail
        ? `${rng.pick(FIRST)} ${rng.pick(LAST)}`
        : `${rng.pick([...FIRST.slice(0, 4), ...LAST])} ${rng.pick(COMPANY_TAIL)}`;
      const band = bands[bandCursor++] ?? "watchlist";
      customers.push({
        id: CustomerIdSchema.parse(`CUST-IN-${retail ? "R-" : ""}${serial++}`),
        name,
        segment: seg,
        region: "IN",
        currency: "INR",
        accounts: 1 + (extraAccounts[i] ?? 0),
        createdDaysAgo: 0,
        health: { score: 0, band },
        avgInflow: 0,
        avgOutflow: 0,
        avgBalance: 0,
        irregularIncome: false,
        foirAbove50: false,
      });
      if (retail) retailIndianIdx.push(customers.length - 1);
    }
  }
  for (const c of customers) c.health.score = bandScore(rng, c.health.band);
  // Recent customers (KPI delta): 82 customers created in the last 30 days holding exactly 228 accounts.
  pickRecentCustomers(rng, customers);
  // Cases: exact per segment; customers get ≥ 1 case each.
  const cases: PortfolioCase[] = [];
  const namedStage = (stage: CaseStage) => NAMED_QUEUE.filter((q) => q.stage === stage).length;
  const stageTargets: Record<CaseStage | "archived", number> = {
    new: STAGE_TARGETS.new - namedStage("new"),
    docs_uploaded: STAGE_TARGETS.docs_uploaded - namedStage("docs_uploaded"),
    ai_processing: STAGE_TARGETS.ai_processing - namedStage("ai_processing"),
    txn_validation: STAGE_TARGETS.txn_validation - namedStage("txn_validation"),
    financial_profiling: STAGE_TARGETS.financial_profiling - namedStage("financial_profiling"),
    underwriter_review: STAGE_TARGETS.underwriter_review - namedStage("underwriter_review"),
    completed: STAGE_TARGETS.completed - namedStage("completed"),
    archived: ARCHIVED_CASES,
  };
  const stagePool = assignExact(rng, 2947 - NAMED_QUEUE.length, stageTargets, [
    "new",
    "docs_uploaded",
    "ai_processing",
    "txn_validation",
    "financial_profiling",
    "underwriter_review",
    "completed",
    "archived",
  ]);
  const regionPool = assignExact(
    rng,
    2947 - NAMED_QUEUE.length,
    {
      IN: REGION_CASE_TARGETS.IN - NAMED_QUEUE.filter((q) => q.region === "IN").length,
      ME: REGION_CASE_TARGETS.ME - NAMED_QUEUE.filter((q) => q.region === "ME").length,
      ANZ: REGION_CASE_TARGETS.ANZ - NAMED_QUEUE.filter((q) => q.region === "ANZ").length,
    },
    ["IN", "ME", "ANZ"],
  );
  let poolCursor = 0;
  let caseSerial = 2000;
  for (const seg of segments) {
    const segCustomers = customers.filter((c) => c.segment === seg);
    const namedInSeg = NAMED_QUEUE.filter(
      (q) => (q.segment === "gig" ? "self_employed" : q.segment) === seg,
    ).length;
    const extra = splitInteger(
      rng,
      SEGMENT_TARGETS[seg].cases - segCustomers.length - namedInSeg,
      segCustomers.length,
      1.6,
    );
    segCustomers.forEach((cust, i) => {
      const n = 1 + (extra[i] ?? 0);
      for (let k = 0; k < n; k++) {
        const stage = stagePool[poolCursor] ?? "completed";
        const region = regionPool[poolCursor] ?? "IN";
        poolCursor++;
        const caseId = CaseIdSchema.parse(
          `BSA-${caseSerial < 4398 ? 25 : 26}-${String(caseSerial++).padStart(5, "0")}`,
        );
        if (k === 0) {
          cust.region = region;
          cust.currency = regionCurrency(rng, region);
        }
        cases.push(buildCase(rng, caseId, cust, stage, k === 0 ? cust.region : region));
      }
    });
  }
  // Named queue cases.
  for (const q of NAMED_QUEUE) {
    cases.push({
      id: CaseIdSchema.parse(q.id),
      customerId: q.customerId ? CustomerIdSchema.parse(q.customerId) : null,
      customerName: q.name,
      segment: q.segment,
      typeLabel: q.typeLabel,
      sector:
        q.segment === "sme" || q.segment === "corporate"
          ? q.name.includes("Medical")
            ? "Healthcare"
            : q.name.includes("Logistics")
              ? "Logistics"
              : q.name.includes("Trading")
                ? "Trading"
                : "Manufacturing"
          : "—",
      region: q.region,
      currency: q.currency,
      accounts: q.accounts,
      periodLabel: q.period,
      analyst: q.analyst,
      stage: q.stage,
      createdDaysAgo: rng.int(1, 25),
      completedDaysAgo: q.stage === "completed" ? 0 : null,
      updatedMinutesAgo: q.minutes,
      health:
        q.health === null
          ? notAvailable(q.demo ? "computed" : "Not scored yet")
          : available({ score: q.health, band: healthBandFor(q.health) }),
      risk: q.risk === null ? notAvailable("Not scored yet") : available(q.risk),
      demo: q.demo,
      quality: null,
      processingMinutes: null,
      insightFlags: [],
    });
  }
  // Recent cases (KPI delta): 233 cases created in the last 30 days, open cases first.
  const named = new Set<string>(NAMED_QUEUE.map((q) => q.id));
  const generated = cases.filter((c) => !named.has(c.id));
  const ordered = [
    ...rng.shuffle(generated.filter((c) => c.stage !== "completed" && c.stage !== "archived")),
    ...rng.shuffle(generated.filter((c) => c.stage === "completed" || c.stage === "archived")),
  ];
  ordered.forEach((c, k) => {
    c.createdDaysAgo = k < RECENT_TARGETS.cases - NAMED_QUEUE.length ? rng.int(0, 29) : rng.int(30, 420);
  });
  const completed = cases.filter((c) => c.stage === "completed");
  rng.shuffle(completed).forEach((c, k) => {
    c.completedDaysAgo = k < RECENT_TARGETS.profiles ? rng.int(0, 29) : rng.int(30, 600);
  });
  for (const c of cases)
    if (c.stage === "archived") c.updatedMinutesAgo = rng.int(60 * 24 * 31, 60 * 24 * 400);

  applyQuality(rng, cases);
  applyInsights(rng, cases);
  applyRetailLiquidity(rng, customers, retailIndianIdx);

  cache = { customers, cases, snapshots: snapshotSeries(rng) };
  return cache;
}

function pickRecentCustomers(rng: Rng, customers: PortfolioCustomer[]): void {
  // Feasibility-aware greedy pick: 82 customers whose accounts sum to exactly 228.
  let slots: number = RECENT_TARGETS.customers;
  let remaining: number = RECENT_TARGETS.accounts;
  const recent = new Set<number>();
  for (const i of rng.shuffle(customers.map((_, k) => k))) {
    if (slots === 0) break;
    const a = customers[i]?.accounts ?? 0;
    // Track the running average needed; the last pick must close the gap exactly.
    const ok =
      slots === 1 ? a === remaining : Math.abs(a - remaining / slots) <= 1.5 && remaining - a >= slots - 1;
    if (ok) {
      recent.add(i);
      slots--;
      remaining -= a;
    }
  }
  if (slots !== 0 || remaining !== 0)
    throw new Error("Could not select recent customers matching the account target");
  customers.forEach((c, i) => {
    c.createdDaysAgo = recent.has(i) ? rng.int(0, 29) : rng.int(30, 720);
  });
}

function buildCase(
  rng: Rng,
  id: CaseId,
  cust: PortfolioCustomer,
  stage: CaseStage | "archived",
  region: Region,
): PortfolioCase {
  const scored =
    stage === "completed" ||
    stage === "underwriter_review" ||
    stage === "txn_validation" ||
    stage === "financial_profiling";
  const score = cust.health.score;
  const risk: RiskLevel = score >= 75 ? "low" : score >= 65 ? "moderate" : score >= 50 ? "elevated" : "high";
  const regionName = region === "ME" ? rng.pick(ME_NAMES) : region === "ANZ" ? rng.pick(ANZ_NAMES) : null;
  const retail = cust.segment === "salaried" || cust.segment === "self_employed";
  return {
    id,
    customerId: cust.id,
    customerName: regionName && !retail ? `${regionName} ${rng.pick(COMPANY_TAIL)}` : cust.name,
    segment: cust.segment,
    typeLabel: SEGMENT_LABEL[cust.segment],
    sector: retail ? "—" : rng.pick(SECTORS),
    region,
    currency: region === cust.region ? cust.currency : regionCurrency(rng, region),
    accounts: Math.max(1, Math.min(cust.accounts, 4)),
    periodLabel: rng.pick(["Jan-Jun 26", "Feb-Jul 26", "Dec-May 26", "Mar-Aug 26"]),
    analyst: stage === "new" ? null : rng.pick(ANALYSTS),
    stage,
    createdDaysAgo: rng.int(0, 400),
    completedDaysAgo: null,
    updatedMinutesAgo: stage === "completed" ? rng.int(60, 60 * 24 * 29) : rng.int(5, 60 * 24 * 6),
    health: scored ? available({ score, band: healthBandFor(score) }) : notAvailable("Not scored yet"),
    risk: scored ? available(risk) : notAvailable("Not scored yet"),
    demo: false,
    quality: null,
    processingMinutes: null,
    insightFlags: [],
  };
}

function applyQuality(rng: Rng, cases: PortfolioCase[]): void {
  const recent = cases.filter(
    (c) => c.stage === "completed" && c.completedDaysAgo !== null && c.completedDaysAgo < 30,
  );
  const n = recent.length;
  const calibrated = (target: number, spread: number) =>
    calibrateMean(
      recent.map(() => Math.max(0.0001, 1 + (rng.next() - 0.5) * spread)),
      target * 1e6,
    ).map((v) => v / 1e6);
  const extraction = calibrated(QUALITY_TARGETS.extraction, 0.04);
  const auto = calibrated(QUALITY_TARGETS.autoClassified, 0.1);
  const own = calibrated(QUALITY_TARGETS.ownTransferShare, 0.8);
  const reclass = calibrated(QUALITY_TARGETS.reclassified, 1.2);
  // Statements = one per account-month; gaps are counted per statement.
  const statements = recent.map((c) => c.accounts * 6);
  const statementSlots = statements.flatMap((count, i) => Array.from({ length: count }, () => i));
  const gapCounts = new Map<number, number>();
  for (const i of rng
    .shuffle(statementSlots)
    .slice(0, Math.round(QUALITY_TARGETS.statementsWithGaps * statementSlots.length)))
    gapCounts.set(i, (gapCounts.get(i) ?? 0) + 1);
  const recon = new Set(
    rng.shuffle(recent.map((_, i) => i)).slice(0, Math.round(QUALITY_TARGETS.reconFailures * n)),
  );
  const minutes = calibrateMean(
    recent.map(() => 0.4 + rng.next() * 1.4),
    SNAPSHOT_TARGETS.avgProcessingMinutes.now * 100,
  );
  recent.forEach((c, i) => {
    c.quality = {
      extraction: extraction[i] ?? QUALITY_TARGETS.extraction,
      autoClassified: auto[i] ?? QUALITY_TARGETS.autoClassified,
      ownTransferShare: own[i] ?? QUALITY_TARGETS.ownTransferShare,
      statements: statements[i] ?? 6,
      statementsWithGaps: gapCounts.get(i) ?? 0,
      reclassified: reclass[i] ?? QUALITY_TARGETS.reclassified,
      reconFailure: recon.has(i),
    };
    c.processingMinutes = (minutes[i] ?? 680) / 100;
  });
}

function applyInsights(rng: Rng, cases: PortfolioCase[]): void {
  const pick = (
    pred: (c: PortfolioCase) => boolean,
    n: number,
    flag: InsightFlag,
    include: readonly string[] = [],
  ) => {
    const pinned = cases.filter((c) => include.includes(c.id));
    const rest = rng
      .shuffle(cases.filter((c) => pred(c) && !include.includes(c.id)))
      .slice(0, n - pinned.length);
    for (const c of [...pinned, ...rest]) c.insightFlags = [...c.insightFlags, flag];
  };
  const corp = (c: PortfolioCase) =>
    (c.segment === "sme" || c.segment === "corporate") && c.stage !== "archived";
  const retail = (c: PortfolioCase) =>
    (c.segment === "salaried" || c.segment === "self_employed") && c.stage !== "archived";
  pick(corp, INSIGHT_TARGETS.circular_flow, "circular_flow", ["BSA-26-04421"]);
  pick((c) => c.segment === "sme" && c.stage !== "archived", INSIGHT_TARGETS.amb_decline, "amb_decline");
  pick(retail, INSIGHT_TARGETS.salary_continuity, "salary_continuity", ["BSA-26-04417"]);
  pick(retail, INSIGHT_TARGETS.emi_increase, "emi_increase", ["BSA-26-04417"]);
  pick(corp, INSIGHT_TARGETS.inflow_concentration, "inflow_concentration", ["BSA-26-04421"]);
}

function applyRetailLiquidity(rng: Rng, customers: PortfolioCustomer[], retailIdx: readonly number[]): void {
  // Retail customers in India (first RETAIL_INR.customers by region) carry the INR liquidity panel.
  const indian = retailIdx
    .map((i) => customers[i])
    .filter((c): c is PortfolioCustomer => c !== undefined && c.region === "IN");
  const panel = indian.slice(0, RETAIL_INR.customers);
  const n = panel.length;
  const inflows = calibrateMean(
    panel.map(() => Math.exp(rng.normal(0, 0.35))),
    RETAIL_INR.avgInflow,
  );
  const balances = calibrateMean(
    panel.map(() => Math.exp(rng.normal(0, 0.6))),
    RETAIL_INR.avgBalance,
  );
  // Outflow = inflow × ratio; exactly RETAIL_INR.negativeNet customers spend more than they earn.
  const negatives = new Set(
    rng
      .shuffle(panel.map((_, i) => i))
      .slice(0, Math.round((RETAIL_INR.negativeNet / RETAIL_INR.customers) * n)),
  );
  const ratioShape = panel.map((_, i) =>
    negatives.has(i) ? 1.04 + rng.next() * 0.08 : 0.82 + rng.next() * 0.13,
  );
  const rawOut = panel.map((_, i) => (inflows[i] ?? 0) * (ratioShape[i] ?? 0.9));
  const outflows = calibrateMean(rawOut, RETAIL_INR.avgOutflow);
  const irregular = new Set(
    rng
      .shuffle(panel.map((_, i) => i))
      .slice(0, Math.round((RETAIL_INR.irregular / RETAIL_INR.customers) * n)),
  );
  const foir = new Set(
    rng
      .shuffle(panel.map((_, i) => i))
      .slice(0, Math.round((RETAIL_INR.foirAbove50 / RETAIL_INR.customers) * n)),
  );
  panel.forEach((c, i) => {
    c.avgInflow = inflows[i] ?? 0;
    c.avgOutflow = outflows[i] ?? 0;
    c.avgBalance = balances[i] ?? 0;
    c.irregularIncome = irregular.has(i);
    c.foirAbove50 = foir.has(i);
  });
  // Ensure negative-net count is exact after calibration (outflow scaling can flip marginal cases).
  panel.forEach((c, i) => {
    const shouldBeNegative = negatives.has(i);
    const isNegative = c.avgOutflow > c.avgInflow;
    if (shouldBeNegative !== isNegative) {
      const swap = c.avgOutflow;
      c.avgOutflow = c.avgInflow;
      c.avgInflow = swap;
    }
  });
}

/** Daily snapshot series (31 points: t-30 … t0) pinned at both ends; seeded walk in between. */
function snapshotSeries(rng: Rng): Record<keyof typeof SNAPSHOT_TARGETS, number[]> {
  const make = (before: number, now: number, decimals: number) => {
    const out: number[] = [];
    for (let i = 0; i <= 30; i++) {
      const base = before + ((now - before) * i) / 30;
      const noise = i === 0 || i === 30 ? 0 : (rng.next() - 0.5) * Math.abs(now - before) * 0.5;
      out.push(Number((base + noise).toFixed(decimals)));
    }
    return out;
  };
  return {
    statementsQueued: make(
      SNAPSHOT_TARGETS.statementsQueued.before,
      SNAPSHOT_TARGETS.statementsQueued.now,
      0,
    ),
    awaitingReview: make(SNAPSHOT_TARGETS.awaitingReview.before, SNAPSHOT_TARGETS.awaitingReview.now, 0),
    criticalSignals: make(SNAPSHOT_TARGETS.criticalSignals.before, SNAPSHOT_TARGETS.criticalSignals.now, 0),
    avgProcessingMinutes: make(
      SNAPSHOT_TARGETS.avgProcessingMinutes.before,
      SNAPSHOT_TARGETS.avgProcessingMinutes.now,
      1,
    ),
  };
}
