import { daysInMonth, isoDate, type IsoDate } from "@/shared/lib/dates";
import { money } from "@/shared/lib/money";
import { splitByWeights, splitInteger, type Rng } from "@/shared/lib/prng";
import { type AccountId } from "../schemas/ids";
import { type DraftTxn } from "./ledger-builder";
import { refDigits } from "./ledger-builder";
import {
  CAPEX,
  COLLECTIONS,
  cr,
  DEBT_SERVICE,
  KESTREL_FX,
  OTHER_COLLECTIONS,
  OTHER_OPEX,
  PAYROLL,
  RELATED_PARTY,
  ROUND_TRANSFERS,
  STATUTORY,
  SUPPLIERS,
  TERM_LOAN_IN,
} from "./meridian-scenario";

/** External (non-transfer) transactions for Meridian. Amounts are exact bucket splits in paise. */

export interface MeridianAccounts {
  icici: AccountId;
  hdfc: AccountId;
  sbi: AccountId;
}

const YEAR = 2026;
const RUPEE = 100;
const d = (m0: number, day: number): IsoDate => isoDate(YEAR, m0 + 1, day);
const MONTH_TAG = ["JAN26", "FEB26", "MAR26", "APR26", "MAY26", "JUN26"] as const;

/** Working days (Mon–Sat) of a month, optionally restricted to [fromDay, toDay]. */
export function workingDays(m0: number, fromDay = 1, toDay = 31): number[] {
  const out: number[] = [];
  const last = Math.min(toDay, daysInMonth(YEAR, m0 + 1));
  for (let day = fromDay; day <= last; day++) {
    if (new Date(Date.UTC(YEAR, m0, day)).getUTCDay() !== 0) out.push(day);
  }
  return out;
}

/** Split a ₹-crore bucket into `rows` rupee-rounded amounts (paise). */
function splitCr(rng: Rng, crore: number, rows: number, spread = 1.2): number[] {
  if (rows <= 0) return [];
  return splitInteger(rng, Math.round(cr(crore) / RUPEE), rows, spread).map((r) => r * RUPEE);
}

/* ---------- name pools (seeded) ---------- */
const PREFIX = [
  "Sai",
  "Om",
  "Shree",
  "Vardhman",
  "Mahalaxmi",
  "Kaveri",
  "Sahyadri",
  "Deccan",
  "Pune",
  "Chakan",
  "Bharat",
  "Unity",
  "Apex",
  "Globe",
  "Nova",
  "Sigma",
  "Vertex",
  "Prime",
  "Trident",
  "Orbit",
];
const NOUN = [
  "Fasteners",
  "Packaging",
  "Logistics",
  "Tooling",
  "Hydraulics",
  "Electricals",
  "Coatings",
  "Forgings",
  "Polymers",
  "Abrasives",
  "Gaskets",
  "Bearings",
  "Springs",
  "Engineering",
  "Pneumatics",
  "Lubricants",
  "Instruments",
  "Castings",
  "Fabricators",
  "Services",
];
const SUFFIX = ["Pvt Ltd", "Industries", "Enterprises", "LLP", "& Co", "Traders"];

export function namePool(rng: Rng, count: number, exclude: ReadonlySet<string>): string[] {
  const names = new Set<string>();
  let guard = 0;
  while (names.size < count && guard++ < count * 50) {
    const n = `${rng.pick(PREFIX)} ${rng.pick(NOUN)} ${rng.pick(SUFFIX)}`;
    if (!exclude.has(n)) names.add(n);
  }
  return [...names];
}

const upper = (s: string) => s.toUpperCase().replace(/[^A-Z0-9 &]/g, "");

interface RowPlan {
  account: keyof MeridianAccounts;
  m0: number;
  /** Count before / after the late-window boundary (day inclusive start). */
  rows: number;
  lateRows?: number;
  lateFromDay?: number;
  earlyToDay?: number;
}

function pickDays(rng: Rng, m0: number, plan: RowPlan): number[] {
  const late = plan.lateRows ?? 0;
  const early = plan.rows - late;
  const earlyDays = workingDays(m0, 1, plan.earlyToDay ?? 31);
  const lateDays = plan.lateFromDay ? workingDays(m0, plan.lateFromDay) : [];
  const out: number[] = [];
  for (let i = 0; i < early; i++) out.push(rng.pick(earlyDays));
  for (let i = 0; i < late; i++) out.push(rng.pick(lateDays));
  return out;
}

export interface ExternalBuild {
  drafts: DraftTxn[];
  /** Shakti June rows whose split is calibrated to place the OD peak (index into drafts). */
  shaktiJuneCalibration: { early: number; late: number };
  /** Precision June rows (08-Jun, 27-Jun) used to set the 08-Jun net flow. */
  precisionJuneCalibration: { peak: number; late: number };
  supplierNames: string[];
  opexNames: string[];
  otherCustomerNames: string[];
}

/**
 * Row budgets per account/month for flexible buckets. Late-window counts implement the
 * statement-row anchors (ICICI after 28-May, HDFC after 10-Jun).
 */
const FLEX = {
  otherCollections: {
    icici: [109, 107, 113, 105, 121, 51],
    hdfc: [340, 330, 352, 344, 345, 500],
    hdfcLate: { lateFromDay: 11, late: 410 },
  },
  suppliers: {
    icici: [255, 250, 265, 300, 260, 70],
    hdfc: [92, 88, 96, 120, 94, 110],
    sbi: [196, 188, 200, 0, 188, 188],
    hdfcLate: 95,
  },
  opex: {
    icici: [295, 292, 305, 322, 330, 75],
    hdfc: [117, 108, 116, 130, 112, 178],
    hdfcLate: 143,
  },
} as const;

export function buildExternals(rng: Rng, acct: MeridianAccounts): ExternalBuild {
  const drafts: DraftTxn[] = [];
  const ref = (prefix: string, len: number) => `${prefix}${refDigits(() => rng.next(), len)}`;
  const reserved = new Set<string>([
    ...COLLECTIONS.map((c) => c.name),
    SUPPLIERS.shakti.name,
    SUPPLIERS.precision.name,
  ]);
  const otherCustomerNames = namePool(rng, 35, reserved);
  otherCustomerNames.forEach((n) => reserved.add(n));
  const supplierNames = namePool(rng, 54, reserved);
  supplierNames.forEach((n) => reserved.add(n));
  const opexNames = namePool(rng, 304, reserved);
  let opexCursor = 0;
  let supplierCursor = 0;

  const collectionConfidence = () => 0.95 + rng.next() * 0.049;

  /* ---- Named customer collections ---- */
  for (const c of COLLECTIONS) {
    let aliasCursor = 0;
    for (let m0 = 0; m0 < 6; m0++) {
      const total = c.monthly[m0] ?? 0;
      if (total === 0) continue;
      let amounts = splitCr(rng, total, c.rowsPerMonth, 0.5);
      // Named customers pay on a roughly weekly invoice cycle.
      const cycle = c.rowsPerMonth === 1 ? [16] : c.rowsPerMonth === 3 ? [6, 15, 24] : [4, 11, 18, 25];
      let days = cycle.map((x) => Math.min(x + rng.int(-1, 1), m0 === 4 ? 27 : daysInMonth(YEAR, m0 + 1)));
      // March: receipts avoid the term-loan days so the 19-Mar bank maximum stays at ₹6.84 cr.
      if (m0 === 2) days = days.map((x) => (x >= 17 && x <= 20 ? 23 : x));
      // June: anchor rows from the PDF (Apex 2.40 on 02-Jun, Ridgeline 1.95 on 18-Jun).
      if (m0 === 5 && c.key === "APEX") {
        amounts = [cr(2.4), ...splitCr(rng, total - 2.4, c.rowsPerMonth - 1, 0.5)];
        days = [2, 12, 22, 26];
      }
      if (m0 === 5 && c.key === "RIDGELINE") {
        amounts = [cr(1.95), ...splitCr(rng, total - 1.95, c.rowsPerMonth - 1, 0.5)];
        days = [18, 5, 11, 25];
      }
      if (m0 === 5 && c.key === "VOLTA") days = [3, 8, 16, 24];
      if (m0 === 5 && c.key === "INDUS") days = [4, 9, 19];
      amounts.forEach((amt, i) => {
        const alias = c.aliases[aliasCursor++ % c.aliases.length] ?? c.aliases[0];
        const fxRate = c.key === "KESTREL" ? KESTREL_FX[m0 === 0 ? 0 : m0 === 2 ? 2 : 4] : null;
        const day = days[i] ?? 15;
        drafts.push({
          accountId: c.account === "ICICI" ? acct.icici : acct.hdfc,
          date: d(m0, day),
          seq: 20,
          direction: "credit",
          amountMinor: amt,
          narration:
            c.channel === "SWIFT"
              ? `SWIFT CR-${alias}-EUR INV`
              : `${c.channel} CR-${alias}-INV ${26}/${1000 + rng.int(0, 999)}`,
          normalised: `${c.name} · customer receipt`,
          reference:
            c.channel === "RTGS"
              ? ref("ICICR5202606", 8)
              : c.channel === "SWIFT"
                ? ref("SWF", 10)
                : ref("N", 12),
          channel: c.channel,
          counterparty: { key: c.key, name: c.name, kind: "customer" },
          category: "customer_collection",
          categoryConfidence: collectionConfidence(),
          counterpartyConfidence: 0.97 + rng.next() * 0.03,
          recurringId: `coll-${c.key}`,
          fx: fxRate
            ? {
                original: money(Math.round(amt / fxRate), "EUR"),
                rate: fxRate,
                rateDate: d(m0, day),
                rateSource: "RBI reference rate",
              }
            : null,
        });
      });
    }
  }

  /* ---- Other customers (36): 33 recurring, 2 one-off, 1 cash deposit ---- */
  for (let m0 = 0; m0 < 6; m0++) {
    const total = OTHER_COLLECTIONS[m0] ?? 0;
    const nI = FLEX.otherCollections.icici[m0] ?? 0;
    const nH = FLEX.otherCollections.hdfc[m0] ?? 0;
    const cashRow = m0 === 5 ? 1 : 0;
    const amounts = splitCr(rng, total - (cashRow ? 0.2 : 0), nI + nH - cashRow, 1.4);
    if (cashRow) {
      drafts.push({
        accountId: acct.icici,
        date: d(5, 15),
        seq: 20,
        direction: "credit",
        amountMinor: cr(0.2),
        narration: "CASH DEP BR 0412 CHAKAN",
        normalised: "Cash deposit · branch 0412",
        reference: `UPI 4166 1882 0912`,
        channel: "CASH",
        counterparty: { key: "CASH", name: "Cash deposit", kind: "unknown" },
        category: "unclassified",
        categoryConfidence: 0.62,
        counterpartyConfidence: 0.5,
        alternatives: [
          { label: "Customer collection", probability: 0.21 },
          { label: "Capital infusion", probability: 0.09 },
        ],
      });
    }
    const late = FLEX.otherCollections;
    const iciciDays = pickDays(rng, m0, {
      account: "icici",
      m0,
      rows: nI - cashRow,
      earlyToDay: m0 === 4 ? 27 : 31,
    });
    const hdfcDays = pickDays(rng, m0, {
      account: "hdfc",
      m0,
      rows: nH,
      ...(m0 === 5
        ? { lateRows: late.hdfcLate.late, lateFromDay: late.hdfcLate.lateFromDay, earlyToDay: 10 }
        : {}),
    });
    const days = [...iciciDays, ...hdfcDays];
    amounts.forEach((amt, i) => {
      const toIcici = i < nI - cashRow;
      const oneOff = m0 === 2 && i === 3 ? 33 : m0 === 4 && i === 7 ? 34 : null;
      const idx = oneOff ?? (i * 7 + m0) % 33;
      const name = otherCustomerNames[idx] ?? "Customer";
      const key = `CUST-${idx}`;
      const channel = rng.next() < 0.7 ? "NEFT" : rng.next() < 0.5 ? "IMPS" : "CHQ";
      drafts.push({
        accountId: toIcici ? acct.icici : acct.hdfc,
        date: d(m0, days[i] ?? 15),
        seq: 25,
        direction: "credit",
        amountMinor: amt,
        narration: `${channel === "CHQ" ? "CHQ DEP" : `${channel} CR`}-${upper(name)}`,
        normalised: `${name} · customer receipt`,
        reference: channel === "CHQ" ? ref("CHQ ", 6) : ref(channel === "IMPS" ? "IMPS " : "N", 12),
        channel,
        counterparty: { key, name, kind: "customer" },
        category: "customer_collection",
        categoryConfidence: collectionConfidence(),
        counterpartyConfidence: 0.93 + rng.next() * 0.07,
        recurringId: oneOff === null ? `coll-${key}` : null,
      });
    });
  }

  /* ---- Suppliers ---- */
  let shaktiEarly = -1;
  let shaktiLate = -1;
  let precisionPeak = -1;
  let precisionLate = -1;
  for (let m0 = 0; m0 < 6; m0++) {
    // Shakti: 3× per month from HDFC. June: 1.18 on 03-Jun (PDF row) + calibrated pair on 06 / 22.
    const shakti = SUPPLIERS.shakti.monthly[m0] ?? 0;
    const shaktiAmounts =
      m0 === 5 ? [cr(1.18), cr(2.6), cr(shakti - 1.18 - 2.6)] : splitCr(rng, shakti, 3, 0.5);
    const shaktiDays =
      m0 === 5 ? [3, 6, 22] : [4, 13, 24].map((x) => Math.min(x + rng.int(-1, 1), daysInMonth(YEAR, m0 + 1)));
    shaktiAmounts.forEach((amt, i) => {
      if (m0 === 5 && i === 1) shaktiEarly = drafts.length;
      if (m0 === 5 && i === 2) shaktiLate = drafts.length;
      const alias = SUPPLIERS.shakti.aliases[(m0 + i) % 3] ?? "SHAKTI STEEL";
      drafts.push({
        // Shakti is paid from HDFC, except the mid-month instalment from ICICI (June: only the first from HDFC).
        accountId: i === 1 || (m0 === 5 && i === 2) ? acct.icici : acct.hdfc,
        date: d(m0, shaktiDays[i] ?? 13),
        seq: 40,
        direction: "debit",
        amountMinor: amt,
        narration: `NEFT DR-${alias}-PO ${4400 + rng.int(0, 99)}`,
        normalised: `${SUPPLIERS.shakti.name} · supplier payment`,
        reference: ref("N1542606", 5),
        channel: "NEFT",
        counterparty: { key: SUPPLIERS.shakti.key, name: SUPPLIERS.shakti.name, kind: "supplier" },
        category: "supplier_payment",
        categoryConfidence: 0.98,
        counterpartyConfidence: 0.98,
        recurringId: "sup-SHAKTI",
      });
    });
    // Precision Castings: weekly from SBI (April from HDFC — SBI April statement missing).
    const precision = SUPPLIERS.precision.monthly[m0] ?? 0;
    const weeks = m0 === 0 || m0 === 2 ? 5 : 4;
    const pAmounts =
      m0 === 5 ? [cr(0.62), ...splitCr(rng, precision - 0.62, 3, 0.4)] : splitCr(rng, precision, weeks, 0.4);
    const pDays =
      m0 === 5
        ? [14, 8, 21, 27]
        : Array.from({ length: weeks }, (_, w) => Math.min(3 + w * 7, daysInMonth(YEAR, m0 + 1)));
    pAmounts.forEach((amt, i) => {
      if (m0 === 5 && i === 1) precisionPeak = drafts.length;
      if (m0 === 5 && i === 3) precisionLate = drafts.length;
      const alias = SUPPLIERS.precision.aliases[i % 3] ?? "PRECISION CASTINGS HUB";
      drafts.push({
        accountId: m0 === 3 ? acct.hdfc : acct.sbi,
        date: d(m0, pDays[i] ?? 14),
        seq: 40,
        direction: "debit",
        amountMinor: amt,
        narration: `NEFT DR-${alias}`,
        normalised: `${SUPPLIERS.precision.name} · supplier payment`,
        reference: ref("N1652606", 6),
        channel: "NEFT",
        counterparty: { key: SUPPLIERS.precision.key, name: SUPPLIERS.precision.name, kind: "supplier" },
        category: "supplier_payment",
        categoryConfidence: 0.97,
        counterpartyConfidence: 0.97,
        recurringId: "sup-PRECISION",
      });
    });
    // 54 other suppliers across accounts.
    const others = SUPPLIERS.others[m0] ?? 0;
    const shares =
      m0 === 3
        ? { icici: 0.58, hdfc: 0.42, sbi: 0 }
        : m0 === 5
          ? { icici: 0.3, hdfc: 0.25, sbi: 0.45 }
          : { icici: 0.55, hdfc: 0.33, sbi: 0.12 };
    const iciciAmt = Math.round(others * shares.icici * 100) / 100;
    const hdfcAmt = Math.round(others * shares.hdfc * 100) / 100;
    const sbiAmt = Math.round((others - iciciAmt - hdfcAmt) * 100) / 100;
    for (const [account, amount] of [
      ["icici", iciciAmt],
      ["hdfc", hdfcAmt],
      ["sbi", sbiAmt],
    ] as const) {
      const rows = FLEX.suppliers[account][m0] ?? 0;
      if (rows === 0 || amount <= 0) continue;
      const plan: RowPlan =
        account === "icici" && m0 === 5
          ? { account, m0, rows, lateRows: rows, lateFromDay: 1 }
          : account === "icici" && m0 === 4
            ? { account, m0, rows, earlyToDay: 27 }
            : account === "hdfc" && m0 === 5
              ? { account, m0, rows, lateRows: FLEX.suppliers.hdfcLate, lateFromDay: 11, earlyToDay: 10 }
              : { account, m0, rows };
      const days = pickDays(rng, m0, plan);
      const amounts = splitCr(rng, amount, rows, 1.5);
      const isDupMonth = account === "sbi" && m0 === 2;
      if (isDupMonth && amounts.length > 1) {
        // 14-Mar SBI payment of ₹0.14 cr printed three times on the statement (same UTR).
        // Keep the bucket exact: the difference is deducted pro rata (whole rupees) from the other rows.
        const need = cr(0.14) - (amounts[0] ?? 0);
        const rest = amounts.slice(1);
        const cuts = splitByWeights(Math.round(need / RUPEE), rest);
        rest.forEach((v, k) => {
          amounts[k + 1] = v - (cuts[k] ?? 0) * RUPEE;
        });
        amounts[0] = cr(0.14);
      }
      amounts.forEach((amt, i) => {
        const idx = (supplierCursor++ * 5) % 54; // stride 5 is coprime with 54 → every supplier appears
        const name = supplierNames[idx] ?? "Supplier";
        const dup = isDupMonth && i === 0;
        const base: DraftTxn = {
          accountId: acct[account],
          date: dup ? d(2, 14) : d(m0, days[i] ?? 15),
          seq: 45,
          direction: "debit",
          amountMinor: amt,
          narration: `NEFT DR-${upper(name)}`,
          normalised: `${name} · supplier payment`,
          reference: dup ? "UTR SBIN226073008812" : ref("N", 12),
          channel: "NEFT",
          counterparty: { key: `SUP-${idx}`, name, kind: "supplier" },
          category: "supplier_payment",
          categoryConfidence: 0.9 + rng.next() * 0.09,
          counterpartyConfidence: 0.94 + rng.next() * 0.06,
          duplicateGroup: dup ? "DUP-SBI-0314" : null,
        };
        drafts.push(base);
        if (dup) {
          for (let k = 0; k < 2; k++) {
            drafts.push({
              ...base,
              seq: 46 + k,
              ledgerEffect: {
                kind: "excluded",
                reason: "suspected_duplicate",
                note: "Same UTR, amount and date as the preceding row; balance column unchanged",
              },
            });
          }
        }
      });
    }
  }

  /* ---- Payroll, statutory, debt service ---- */
  for (let m0 = 0; m0 < 6; m0++) {
    const tag = MONTH_TAG[m0] ?? "";
    drafts.push({
      accountId: acct.icici,
      date: d(m0, 7),
      seq: 30,
      direction: "debit",
      amountMinor: cr(PAYROLL[m0] ?? 0),
      narration: `BULK NEFT SALARY ${tag.slice(0, 3)}${tag.slice(3)} 412 RECORDS`,
      normalised: "Payroll · 412 employees",
      reference: ref("N15826060", 4),
      channel: "BULK_NEFT",
      counterparty: { key: "PAYROLL", name: "Payroll (412 employees)", kind: "payroll" },
      category: "payroll",
      categoryConfidence: 0.99,
      counterpartyConfidence: 0.99,
      recurringId: "payroll",
    });
    const stat = STATUTORY[m0] ?? 0;
    const gst = m0 === 5 ? 0.98 : Math.round(stat * 0.5 * 100) / 100;
    const tds = Math.round(stat * 0.29 * 100) / 100;
    const epf = Math.round((stat - gst - tds) * 100) / 100;
    const statRows = [
      {
        day: m0 === 5 ? 12 : 20,
        amount: gst,
        narration: `GST CHALLAN 27AAACM4412R1Z5 ${MONTH_TAG[(m0 + 5) % 6]?.slice(0, 3) ?? ""}26`,
        name: "GSTN",
        category: "gst",
        account: acct.hdfc,
        key: "GSTN",
      },
      {
        day: 7,
        amount: tds,
        narration: "CBDT TDS CHALLAN 281",
        name: "CBDT",
        category: "tds",
        account: acct.icici,
        key: "CBDT",
      },
      {
        day: 15,
        amount: epf,
        narration: "EPFO ECR CHALLAN",
        name: "EPFO",
        category: "epf_esic",
        account: acct.icici,
        key: "EPFO",
      },
    ] as const;
    for (const r of statRows) {
      drafts.push({
        accountId: r.account,
        date: d(m0, r.day),
        seq: 35,
        direction: "debit",
        amountMinor: cr(r.amount),
        narration: r.narration,
        normalised: `${r.name} · statutory`,
        reference: ref("CBDT 0510", 3),
        channel: "CHALLAN",
        counterparty: { key: r.key, name: r.name, kind: "statutory" },
        category: r.category,
        categoryConfidence: 0.99,
        counterpartyConfidence: 0.99,
        recurringId: `stat-${r.key}`,
      });
    }
    for (const [loan, amount] of [
      ["7781", DEBT_SERVICE.tl7781],
      ["7795", DEBT_SERVICE.tl7795[m0] ?? 0],
    ] as const) {
      drafts.push({
        accountId: acct.icici,
        date: d(m0, 5),
        seq: 32,
        direction: "debit",
        amountMinor: cr(amount),
        narration: `ACH D-HDFC BANK TL ${loan} EMI`,
        normalised: `HDFC Bank · Term loan ${loan} EMI`,
        reference: ref("ACH 2606050", 4),
        channel: "ACH",
        counterparty: { key: "HDFC-TL", name: "HDFC Bank · Term Loan", kind: "lender" },
        category: "term_loan_emi",
        categoryConfidence: 0.98,
        counterpartyConfidence: 0.99,
        recurringId: `tl-${loan}`,
      });
    }
  }

  /* ---- Other opex (incl. round-sum transfers) ---- */
  for (let m0 = 0; m0 < 6; m0++) {
    const round = ROUND_TRANSFERS.find((r) => r.month === m0);
    const total = (OTHER_OPEX[m0] ?? 0) - (round?.amount ?? 0);
    if (round) {
      drafts.push({
        accountId: acct.icici,
        date: d(m0, round.day),
        seq: 50,
        direction: "debit",
        amountMinor: cr(round.amount),
        narration: `RTGS DR-${upper(round.name)}`,
        normalised: `${round.name} · transfer`,
        reference: ref("ICICR52026", 10),
        channel: "RTGS",
        counterparty: { key: round.key, name: round.name, kind: "unknown" },
        category: "other_opex",
        categoryConfidence: 0.81,
        counterpartyConfidence: 0.9,
      });
    }
    const iciciAmt = Math.round(total * 0.6 * 100) / 100;
    const hdfcAmt = Math.round((total - iciciAmt) * 100) / 100;
    for (const [account, amount] of [
      ["icici", iciciAmt],
      ["hdfc", hdfcAmt],
    ] as const) {
      const rows = FLEX.opex[account][m0] ?? 0;
      const plan: RowPlan =
        account === "icici" && m0 === 5
          ? { account, m0, rows, lateRows: rows, lateFromDay: 1 }
          : account === "icici" && m0 === 4
            ? { account, m0, rows, earlyToDay: 27 }
            : account === "hdfc" && m0 === 5
              ? { account, m0, rows, lateRows: FLEX.opex.hdfcLate, lateFromDay: 11, earlyToDay: 10 }
              : { account, m0, rows };
      const days = pickDays(rng, m0, plan);
      splitCr(rng, amount, rows, 1.6).forEach((amt, i) => {
        const idx = (opexCursor++ * 7) % opexNames.length; // stride 7 is coprime with 304 → every vendor appears
        const name = opexNames[idx] ?? "Vendor";
        const channel = rng.next() < 0.6 ? "NEFT" : rng.next() < 0.5 ? "IMPS" : "UPI";
        drafts.push({
          accountId: acct[account],
          date: d(m0, days[i] ?? 15),
          seq: 55,
          direction: "debit",
          amountMinor: amt,
          narration: `${channel} DR-${upper(name)}`,
          normalised: `${name} · operating expense`,
          reference: ref(channel === "UPI" ? "UPI " : "N", 12),
          channel,
          counterparty: { key: `OPX-${idx}`, name, kind: "supplier" },
          category: rng.pick([
            "logistics",
            "utilities_business",
            "professional_services",
            "other_opex",
            "marketing",
            "rent_commercial",
          ] as const),
          categoryConfidence: 0.88 + rng.next() * 0.11,
          counterpartyConfidence: 0.9 + rng.next() * 0.1,
        });
      });
    }
  }

  /* ---- Financing, capex, related party ---- */
  drafts.push({
    accountId: acct.hdfc,
    date: d(TERM_LOAN_IN.month, TERM_LOAN_IN.day),
    seq: 5,
    direction: "credit",
    amountMinor: cr(TERM_LOAN_IN.amount),
    narration: "LOAN DISB TL 7795 TRANCHE-2 HDFC BANK",
    normalised: "HDFC Bank · Term loan disbursement",
    reference: ref("LN", 10),
    channel: "TRF",
    counterparty: { key: "HDFC-TL", name: "HDFC Bank · Term Loan", kind: "lender" },
    category: "loan_disbursement",
    categoryConfidence: 0.99,
    counterpartyConfidence: 0.99,
  });
  for (const c of CAPEX) {
    drafts.push({
      accountId: acct.hdfc,
      date: d(c.month, c.day),
      seq: 50,
      direction: "debit",
      amountMinor: cr(c.amount),
      narration: `RTGS DR-${upper(c.name)}-PO CAPEX`,
      normalised: `${c.name} · capital equipment`,
      reference: ref("HDFCR52026", 10),
      channel: "RTGS",
      counterparty: { key: c.key, name: c.name, kind: "supplier" },
      category: "capex",
      categoryConfidence: 0.96,
      counterpartyConfidence: 0.98,
    });
  }
  drafts.push({
    accountId: acct.icici,
    date: d(RELATED_PARTY.out.month, RELATED_PARTY.out.day),
    seq: 60,
    direction: "debit",
    amountMinor: cr(RELATED_PARTY.out.amount),
    narration: "NEFT DR-K S TRADING CO-ADV",
    normalised: "Advance · K S Trading Co",
    reference: ref("N14826052", 5),
    channel: "NEFT",
    counterparty: { key: "KSTRADING", name: "K S Trading Co", kind: "related_party" },
    category: "related_party_payment",
    categoryConfidence: 0.74,
    counterpartyConfidence: 0.93,
    alternatives: [
      { label: "Supplier advance", probability: 0.19 },
      { label: "Loan / capital", probability: 0.07 },
    ],
    signalIds: [],
  });
  drafts.push({
    accountId: acct.hdfc,
    date: d(RELATED_PARTY.in.month, RELATED_PARTY.in.day),
    seq: 60,
    direction: "credit",
    amountMinor: cr(RELATED_PARTY.in.amount),
    narration: "CHQ DEP-K S TRADING CO",
    normalised: "Cheque deposit · K S Trading Co",
    reference: "CHQ 004417",
    channel: "CHQ",
    counterparty: { key: "KSTRADING", name: "K S Trading Co", kind: "related_party" },
    category: "related_party_receipt",
    categoryConfidence: 0.71,
    counterpartyConfidence: 0.93,
    alternatives: [
      { label: "Related-party receipt", probability: 0.18 },
      { label: "Loan / capital", probability: 0.07 },
      { label: "Other", probability: 0.04 },
    ],
  });

  return {
    drafts,
    shaktiJuneCalibration: { early: shaktiEarly, late: shaktiLate },
    precisionJuneCalibration: { peak: precisionPeak, late: precisionLate },
    supplierNames,
    opexNames,
    otherCustomerNames,
  };
}
