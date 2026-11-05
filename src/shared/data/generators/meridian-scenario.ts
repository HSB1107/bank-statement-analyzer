/**
 * Meridian Precision Components — scenario targets transcribed from the PDF (₹ crore unless noted).
 * The generator turns these monthly buckets into individual transactions; every screen then
 * recomputes the figures from those transactions.
 */
export const MERIDIAN_SEED = 4421;

export const CR = 1_00_00_000_00; // ₹1 crore in paise
export const cr = (value: number): number => Math.round(value * CR);

/** Customer collections per counterparty per month (Jan..Jun). */
export const COLLECTIONS = [
  {
    key: "APEX",
    name: "Apex Motors Ltd",
    account: "ICICI",
    channel: "RTGS",
    rowsPerMonth: 4,
    monthly: [9.8, 10.4, 11.6, 9.1, 8.7, 8.2],
    aliases: ["APEX MOTORS LTD/RTGS", "APEX MOTORS LIMITED", "APEXMOTORS"],
  },
  {
    key: "RIDGELINE",
    name: "Ridgeline Two-Wheelers",
    account: "ICICI",
    channel: "RTGS",
    rowsPerMonth: 4,
    monthly: [6.2, 6.5, 6.9, 6.1, 5.8, 5.6],
    aliases: ["RIDGELINE TWO WHEELERS PVT L", "RIDGELINE 2W PVT LTD", "RIDGELINE TWOWHEELERS"],
  },
  {
    key: "VOLTA",
    name: "Volta Auto Systems",
    account: "HDFC",
    channel: "NEFT",
    rowsPerMonth: 4,
    monthly: [3.4, 3.1, 3.8, 3.3, 3.5, 3.2],
    aliases: ["VOLTA AUTO SYSTEMS", "VOLTA AUTO SYS PVT"],
  },
  {
    key: "KESTREL",
    name: "Kestrel Brakes GmbH",
    account: "HDFC",
    channel: "SWIFT",
    rowsPerMonth: 1,
    monthly: [2.1, 0, 2.6, 0, 2.4, 0],
    aliases: ["KESTREL BREMSEN GMBH", "KESTREL BRAKES GMBH"],
  },
  {
    key: "INDUS",
    name: "Indus Tractors",
    account: "HDFC",
    channel: "NEFT",
    rowsPerMonth: 3,
    monthly: [0.7, 0.6, 0.8, 0.6, 0.7, 0.5],
    aliases: ["INDUS TRACTORS LTD", "INDUS TRACTORS"],
  },
] as const;

/** "Other customers (36)" monthly totals; 33 recurring + 3 one-off payers (one is a cash deposit). */
export const OTHER_COLLECTIONS = [4.9, 5.3, 5.6, 5.1, 4.7, 4.6] as const;

/** EUR → INR reference rates on Kestrel value dates (RBI reference rate). */
export const KESTREL_FX = { 0: 90.4, 2: 91.2, 4: 91.4 } as const satisfies Readonly<Record<number, number>>;

export const SUPPLIERS = {
  shakti: {
    key: "SHAKTI",
    name: "Shakti Steel & Alloys",
    monthly: [7.1, 6.9, 7.6, 7.2, 7.4, 7.5],
    aliases: ["SHAKTI STEEL & ALLOYS", "SHAKTI STEEL AND ALLOYS", "SHAKTI STEELS"],
  },
  precision: {
    key: "PRECISION",
    name: "Precision Castings Hub",
    monthly: [3.2, 3.1, 3.6, 3.3, 3.4, 3.5],
    aliases: ["PRECISION CASTINGS HUB", "PRECISION CASTING HUB", "PREC CASTINGS HUB"],
  },
  /** 54 other suppliers. */
  others: [8.1, 7.8, 8.4, 7.6, 8.0, 8.1],
} as const;

export const PAYROLL = [2.05, 2.08, 2.1, 2.15, 2.22, 2.24] as const;
/** Statutory: GST (HDFC), TDS (ICICI, 7th), EPF (ICICI, 15th). */
export const STATUTORY = [1.9, 1.88, 1.96, 1.95, 1.98, 1.98] as const;
export const OTHER_OPEX = [2.8, 2.45, 3.09, 3.15, 2.57, 2.6] as const;
/** Round-sum transfers to non-trade counterparties inside other opex (Q2). */
export const ROUND_TRANSFERS = [
  { month: 3, day: 16, amount: 1.5, name: "Orion Facility Management", key: "ORION" },
  { month: 4, day: 14, amount: 1.4, name: "Navkar Logistics Services", key: "NAVKAR" },
  { month: 5, day: 24, amount: 1.25, name: "Sterling Advisory LLP", key: "STERLING" },
] as const;

/** HDFC term loans: TL 7781 fixed EMI + TL 7795 floating EMI (debit ICICI on the 5th). */
export const DEBT_SERVICE = { tl7781: 0.31, tl7795: [0.52, 0.53, 0.55, 0.57, 0.6, 0.62] } as const;
export const TERM_LOAN_IN = { month: 2, day: 18, amount: 4.0 } as const;
export const CAPEX = [
  { month: 2, day: 20, amount: 3.4, name: "Mazak Machine Tools India", key: "MAZAK" },
  { month: 3, day: 9, amount: 0.85, name: "Renishaw Metrology Systems", key: "RENISHAW" },
] as const;
export const RELATED_PARTY = {
  out: { month: 4, day: 28, amount: 1.25 },
  in: { month: 5, day: 10, amount: 1.2 },
} as const;

/** Own-transfer credit totals per month (gross, all accounts). */
export const OWN_TRANSFER_CREDITS = [9.4, 8.8, 11.2, 9.9, 10.6, 12.3] as const;
export const MATCHED_PAIRS = { icHd: 270, icSbi: 216 } as const;

/** Opening balances (₹ cr; SBI negative = drawn). */
export const OPENING = { icici: 2.4, hdfc: 1.1, sbi: -5.2 } as const;
export const OD_LIMIT_CR = 12;

/** Month-end targets. SBI April is not observable (statement missing); true value = May opening. */
export const MONTH_END = {
  icici: [2.3, 1.95, 3.1, 1.8, 1.45, 1.28],
  hdfc: [1.5, 1.32, 2.17, 1.12, 0.88, 0.64],
  sbiDrawn: [4.38, 3.0, 0.71, 1.24, 2.58, 5.72],
} as const;

/**
 * Bank (ICICI + HDFC) intra-month balance knots, [day, ₹ cr], excluding month-end (from MONTH_END).
 * Shapes the "lowest on 6–8 and 19–21" pattern, the 19-Mar maximum and the June stress days.
 * April is driven by the SBI OD path instead (see SBI_APRIL_STEPS).
 */
export const BANK_KNOTS: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  0: [
    [7, 2.75],
    [13, 4.1],
    [20, 2.95],
    [26, 4.05],
  ],
  1: [
    [7, 2.6],
    [13, 3.85],
    [20, 2.7],
    [25, 3.75],
  ],
  2: [
    [7, 2.75],
    [13, 4.0],
    [17, 3.55],
    [18, 6.55],
    [19, 6.84],
    [21, 4.7],
    [26, 5.45],
  ],
  4: [
    [7, 2.15],
    [13, 3.05],
    [20, 1.95],
    [26, 2.7],
  ],
  5: [
    [1, 2.25],
    [5, 1.05],
    [7, 0.31],
    [8, 0.42],
    [9, 0.47],
    [10, 1.6],
    [14, 2.2],
    [17, 1.1],
    [19, 0.48],
    [20, 0.44],
    [21, 0.46],
    [22, 0.49],
    [23, 0.62],
    [25, 0.95],
    [26, 0.47],
    [27, 0.45],
    [28, 0.85],
  ],
};

/** SBI drawn steps in April (ICICI-only legs; SBI side missing). [day, drawn after step]. */
export const SBI_APRIL_STEPS = [
  [3, 0.95],
  [8, 1.85],
  [14, 1.4],
  [17, 2.1],
  [23, 2.6],
  [28, 1.24],
] as const;

/** June OD peak: 71% of the ₹12.00 cr limit on 08-Jun; payroll funding transfer on 07-Jun. */
export const JUNE_OD = {
  peakDay: 8,
  peakDrawn: 8.52,
  payrollFundingDay: 7,
  payrollFunding: 1.2,
  positionOnPayrollDay: -8.0,
  flowOnPeakDay: -0.1,
} as const;

/** Statement-row anchors cited by the PDF. */
export const ROW_ANCHORS = { iciciKsOut: 3902, hdfcKsIn: 3211, iciciKsOutPage: 181 } as const;

/** Exact row counts. */
export const ROW_COUNTS = { icici: 4206, hdfc: 3912, sbi: 1200, credits: 3402, debits: 5916 } as const;

/** External row budgets: collections per account and debit rows per account. */
export const ROW_BUDGET = {
  collections: { icici: 654, hdfc: 2256 },
  /** April ICICI-only legs (4 drawdown credits, 2 repayment debits). */
  aprilUnmatched: { credits: 4, debits: 2 },
} as const;

/** Classification: rows below 85% confidence. */
export const LOW_CONFIDENCE_ROWS = 211;
export const ALIAS_TOTAL = 38;
export const COUNTERPARTY_TOTAL = 412;

/** Per-account extraction confidence (row-level parse). */
export const EXTRACTION = { icici: 0.996, hdfc: 0.999, sbi: 0.932 } as const;
