import { available, notAvailable } from "@/shared/lib/availability";
import { daysInMonth, eachDay, isoDate, monthIndex, dayOfMonth, type IsoDate } from "@/shared/lib/dates";
import { money } from "@/shared/lib/money";
import { createRng, type Rng } from "@/shared/lib/prng";
import {
  AccountSchema,
  CorporateCustomerSchema,
  type Account,
  type CorporateCustomer,
} from "../schemas/customer";
import { CaseIdSchema, CustomerIdSchema } from "../schemas/ids";
import { type Transaction } from "../schemas/transaction";
import { accountId, buildLedger, refDigits, type AccountLedgerConfig, type DraftTxn } from "./ledger-builder";
import { buildExternals } from "./meridian-externals";
import { smoothTiming } from "./meridian-timing";
import {
  cr,
  CR,
  EXTRACTION,
  JUNE_OD,
  MATCHED_PAIRS,
  MERIDIAN_SEED,
  MONTH_END,
  OD_LIMIT_CR,
  OPENING,
  OWN_TRANSFER_CREDITS,
  ROW_ANCHORS,
  SBI_APRIL_STEPS,
  LOW_CONFIDENCE_ROWS,
} from "./meridian-scenario";

/**
 * Meridian Precision Components — SME corporate, 3 INR accounts (incl. SBI OD), 9,318 transactions.
 *
 * 1. External flows are generated from the PDF's monthly counterparty/bucket totals (exact).
 * 2. A target bank-balance path (ICICI+HDFC) is chosen from month-end values and intra-month knots;
 *    the SBI OD drawn path follows as bank − net position. April SBI is driven by OD steps instead.
 * 3. Own-account transfers are the balancing items between those paths (sweeps, drawdowns, repayments),
 *    padded with round trips/splits to the PDF's 486 matched pairs and monthly gross totals.
 * 4. The April SBI statement is missing: no SBI rows exist for April; ICICI shows unmatched legs.
 */

const YEAR = 2026;
export const MERIDIAN_CUSTOMER_ID = CustomerIdSchema.parse("CUST-IN-000318");
export const MERIDIAN_CASE_ID = CaseIdSchema.parse("BSA-26-04421");
export const MERIDIAN_ICICI = accountId("ACC-ICICI-3307");
export const MERIDIAN_HDFC = accountId("ACC-HDFC-5582");
export const MERIDIAN_SBI = accountId("ACC-SBI-0914");
const ACCT = { icici: MERIDIAN_ICICI, hdfc: MERIDIAN_HDFC, sbi: MERIDIAN_SBI } as const;

const d = (m0: number, day: number): IsoDate => isoDate(YEAR, m0 + 1, day);
const PERIOD = { from: d(0, 1), to: d(5, 30) } as const;
export const SANCTION_LETTER_FILE = "SBI_OD_Sanction_Letter_0914.pdf";

export const MERIDIAN_ACCOUNTS: readonly Account[] = [
  AccountSchema.parse({
    id: MERIDIAN_ICICI,
    customerId: MERIDIAN_CUSTOMER_ID,
    bank: "ICICI",
    bankName: "ICICI Bank",
    last4: "3307",
    type: "current",
    role: "operating_primary",
    currency: "INR",
    odLimit: notAvailable("Current account — no OD facility"),
    label: "ICICI XX3307",
  }),
  AccountSchema.parse({
    id: MERIDIAN_HDFC,
    customerId: MERIDIAN_CUSTOMER_ID,
    bank: "HDFC",
    bankName: "HDFC Bank",
    last4: "5582",
    type: "current",
    role: "collections_secondary",
    currency: "INR",
    odLimit: notAvailable("Current account — no OD facility"),
    label: "HDFC XX5582",
  }),
  AccountSchema.parse({
    id: MERIDIAN_SBI,
    customerId: MERIDIAN_CUSTOMER_ID,
    bank: "SBI",
    bankName: "State Bank of India",
    last4: "0914",
    type: "od_cc",
    role: "od_cc",
    currency: "INR",
    odLimit: available({
      limit: money(cr(OD_LIMIT_CR)),
      source: "sanction_letter",
      validTo: d(11, 31),
      fileName: SANCTION_LETTER_FILE,
    }),
    label: "SBI OD XX0914",
  }),
];

export const MERIDIAN_CUSTOMER: CorporateCustomer = CorporateCustomerSchema.parse({
  id: MERIDIAN_CUSTOMER_ID,
  caseId: MERIDIAN_CASE_ID,
  kind: "corporate",
  name: "Meridian Precision Components Pvt. Ltd.",
  initials: "MP",
  segment: "sme",
  segmentLabel: "SME Corporate",
  sector: "Manufacturing",
  region: "IN",
  country: "India",
  reportingCurrency: "INR",
  accountIds: [MERIDIAN_ICICI, MERIDIAN_HDFC, MERIDIAN_SBI],
  period: { from: PERIOD.from, to: PERIOD.to, label: "Jan – Jun 2026" },
  analysedOn: d(10, 5),
  synthetic: true,
  declaredTurnover: { amount: money(cr(327.4)), fiscalYear: "FY25" },
  linkedFsaCase: "FSA-25-01842",
  template: {
    id: "BSA-TPL-SME-IN",
    name: "SME Financial Profile v2.4",
    note: "corporate analytics on, retail metrics off",
  },
});

/* ------------------------------------------------------------------ */

type DayMap = Map<IsoDate, number>;

function dailyExternal(drafts: readonly DraftTxn[], account: string): DayMap {
  const out: DayMap = new Map();
  for (const t of drafts) {
    if (t.accountId !== account || (t.ledgerEffect && t.ledgerEffect.kind !== "posted")) continue;
    out.set(t.date, (out.get(t.date) ?? 0) + (t.direction === "credit" ? t.amountMinor : -t.amountMinor));
  }
  return out;
}

function sbiDebits(drafts: readonly DraftTxn[]): DayMap {
  const out: DayMap = new Map();
  for (const t of drafts) {
    if (
      t.accountId !== ACCT.sbi ||
      t.direction !== "debit" ||
      (t.ledgerEffect && t.ledgerEffect.kind !== "posted")
    )
      continue;
    out.set(t.date, (out.get(t.date) ?? 0) + t.amountMinor);
  }
  return out;
}

function positionPath(drafts: readonly DraftTxn[], days: readonly IsoDate[]): DayMap {
  const totals: DayMap = new Map();
  for (const t of drafts) {
    if (t.ledgerEffect && t.ledgerEffect.kind !== "posted") continue;
    totals.set(
      t.date,
      (totals.get(t.date) ?? 0) + (t.direction === "credit" ? t.amountMinor : -t.amountMinor),
    );
  }
  let pos = cr(OPENING.icici + OPENING.hdfc + OPENING.sbi);
  const out: DayMap = new Map();
  for (const day of days) {
    pos += totals.get(day) ?? 0;
    out.set(day, pos);
  }
  return out;
}

/**
 * June OD plan after the 08-Jun peak: the drawn amount is held flat over four segments (plus drift from
 * SBI debits) and stepped down on segment starts. Levels are searched so June has exactly
 * LOW_DAYS_TOTAL days below ₹0.50 cr and the ₹0.31 cr minimum on 07-Jun stays unique.
 */
const JUNE_SEGMENTS = [
  [9, 13],
  [14, 18],
  [19, 25],
  [26, 29],
] as const;
const LOW_THRESHOLD = 0.5;
const LOW_DAYS_TOTAL = 9;

function planJune(position: DayMap, sbiDr: DayMap): Map<number, number> {
  const pos = (day: number) => position.get(d(5, day)) ?? 0;
  const lowBefore = 2; // 07-Jun (₹0.31 cr) and 08-Jun (peak day) are below ₹0.50 cr by construction
  const options = JUNE_SEGMENTS.map(([from, to]) => {
    const drift = (day: number) => {
      let acc = 0;
      for (let t = from + 1; t <= day; t++) acc += sbiDr.get(d(5, t)) ?? 0;
      return acc;
    };
    const span = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    const lMin = Math.max(...span.map((t) => cr(0.315) - pos(t) - drift(t)));
    const lMax = Math.min(...span.map((t) => cr(JUNE_OD.peakDrawn) - cr(0.05) - drift(t)));
    const candidates = new Set<number>([lMin]);
    for (const t of span) {
      const l = cr(LOW_THRESHOLD) - pos(t) - drift(t) + 1_000_00; // just above → day t no longer low
      if (l >= lMin && l <= lMax) candidates.add(l);
    }
    return [...candidates]
      .filter((l) => l <= lMax)
      .map((l) => ({
        level: Math.round(l / 1_000_00) * 1_000_00,
        low: span.filter((t) => pos(t) + l + drift(t) < cr(LOW_THRESHOLD)).length,
      }));
  });
  const need = LOW_DAYS_TOTAL - lowBefore;
  // Choose the combination with the smallest gross OD movement (fewest/lightest treasury transfers).
  const startDrawn = cr(JUNE_OD.peakDrawn);
  const endDrawn = cr(MONTH_END.sbiDrawn[5] ?? 0);
  const segEndDrift = JUNE_SEGMENTS.map(([from, to]) => {
    let acc = 0;
    for (let t = from + 1; t <= to; t++) acc += sbiDr.get(d(5, t)) ?? 0;
    return acc;
  });
  const holder: { best: { levels: number[]; gross: number } | null } = { best: null };
  const search = (seg: number, remaining: number, chosen: number[]): void => {
    if (seg === options.length) {
      if (remaining !== 0) return;
      let prev = startDrawn;
      let gross = 0;
      chosen.forEach((level, i) => {
        const startDay = JUNE_SEGMENTS[i]?.[0] ?? 9;
        gross += Math.abs(level - (prev + (sbiDr.get(d(5, startDay)) ?? 0)));
        prev = level + (segEndDrift[i] ?? 0);
      });
      gross += Math.abs(endDrawn - (prev + (sbiDr.get(d(5, 30)) ?? 0)));
      if (!holder.best || gross < holder.best.gross) holder.best = { levels: chosen, gross };
      return;
    }
    for (const o of options[seg] ?? []) {
      if (o.low > remaining) continue;
      search(seg + 1, remaining - o.low, [...chosen, o.level]);
    }
  };
  search(0, need, []);
  const found = holder.best;
  if (found) return new Map(JUNE_SEGMENTS.map(([from], i) => [from, found.levels[i] ?? 0]));
  throw new Error(
    `June OD plan infeasible: options ${options.map((o) => o.map((x) => x.low).join("/")).join(" | ")}`,
  );
}

/** SBI treasury days (Mon & Thu) outside April/June. */
function isSbiTransferDay(m0: number, day: number): boolean {
  const dow = new Date(Date.UTC(YEAR, m0, day)).getUTCDay();
  return dow === 1 || dow === 4;
}

interface TransferLeg {
  date: IsoDate;
  from: "icici" | "hdfc" | "sbi";
  to: "icici" | "hdfc" | "sbi";
  amountMinor: number;
  matched: boolean;
  kind: "net" | "roundtrip" | "split";
}

interface Simulation {
  legs: TransferLeg[];
  bank: DayMap;
  drawn: DayMap;
}

/**
 * Day-by-day treasury simulation. `bump` lifts mid-month OD targets (calibrates the average bank balance).
 * SBI moves only on transfer days (or every day in June, the stress month); HDFC sweeps only when it
 * leaves its band. Month-ends are pinned, so bank month-ends follow from position + drawn.
 */
function simulate(drafts: readonly DraftTxn[], days: readonly IsoDate[], bump: number): Simulation {
  const position = positionPath(drafts, days);
  const sbiDr = sbiDebits(drafts);
  const extH = dailyExternal(drafts, ACCT.hdfc);
  const junePlan = planJune(position, sbiDr);
  const legs: TransferLeg[] = [];
  const bank: DayMap = new Map();
  const drawnMap: DayMap = new Map();
  let drawn = -cr(OPENING.sbi);
  let hdfc = cr(OPENING.hdfc);
  let anchorDay = 0;
  let anchorDrawn = drawn;
  for (const day of days) {
    const m0 = monthIndex(day);
    const dom = dayOfMonth(day);
    const last = daysInMonth(YEAR, m0 + 1);
    if (dom === 1) {
      anchorDay = 0;
      anchorDrawn = drawn;
    }
    const pos = position.get(day) ?? 0;
    const april = m0 === 3;
    const pre = drawn + (april ? 0 : (sbiDr.get(day) ?? 0));
    let target: number | null = null;
    if (dom === last && !april) target = cr(MONTH_END.sbiDrawn[m0] ?? 0);
    else if (april) {
      const step = SBI_APRIL_STEPS.find(([stepDay]) => stepDay === dom);
      if (step) target = cr(step[1]);
    } else if (m0 === 5) {
      if (dom === JUNE_OD.peakDay) target = cr(JUNE_OD.peakDrawn);
      else if (dom === JUNE_OD.payrollFundingDay) target = cr(0.31) - pos;
      else if (dom === JUNE_OD.payrollFundingDay - 1) {
        const fund = d(5, JUNE_OD.payrollFundingDay);
        const d7 = cr(0.31) - (position.get(fund) ?? 0);
        target = d7 - cr(JUNE_OD.payrollFunding) - (sbiDr.get(fund) ?? 0);
      } else target = junePlan.get(dom) ?? null;
    } else if (m0 === 2 && dom === 18 && pos + pre > cr(6.7)) {
      target = Math.max(0, cr(6.7) - pos); // keep 18-Mar below the 19-Mar maximum
    } else if (m0 === 2 && dom === 19) {
      target = Math.max(0, cr(6.84) - pos); // bank maximum on 19-Mar (term-loan proceeds)
      anchorDay = dom;
      anchorDrawn = target;
    } else if (isSbiTransferDay(m0, dom)) {
      const endDrawn = cr(MONTH_END.sbiDrawn[m0] ?? 0);
      const lin = anchorDrawn + ((endDrawn - anchorDrawn) * (dom - anchorDay)) / (last - anchorDay);
      const lift = anchorDay === 0 ? cr(bump) * Math.sin((Math.PI * dom) / last) : 0;
      target = Math.round((lin + lift) / 1_00_000) * 1_00_000;
    }
    if (target !== null && target !== pre) {
      const net = target - pre; // > 0: SBI → ICICI drawdown
      legs.push(
        net > 0
          ? { date: day, from: "sbi", to: "icici", amountMinor: net, matched: !april, kind: "net" }
          : { date: day, from: "icici", to: "sbi", amountMinor: -net, matched: !april, kind: "net" },
      );
      drawn = target;
    } else drawn = pre;
    const b = pos + drawn;
    bank.set(day, b);
    drawnMap.set(day, drawn);

    // HDFC policy: refill at a floor, rescue ICICI when it would run dry, true-up only at closing.
    const hPre = hdfc + (extH.get(day) ?? 0);
    let hdfcAfter = hPre;
    if (m0 === 5 && dom === last) hdfcAfter = cr(MONTH_END.hdfc[5] ?? 0);
    else if (hPre < 0) hdfcAfter = cr(0.05);
    else if (b - hPre < 0) hdfcAfter = Math.max(0, b - cr(0.02));
    const netH = hPre - hdfcAfter; // > 0: HDFC → ICICI
    if (netH > 0)
      legs.push({ date: day, from: "hdfc", to: "icici", amountMinor: netH, matched: true, kind: "net" });
    if (netH < 0)
      legs.push({ date: day, from: "icici", to: "hdfc", amountMinor: -netH, matched: true, kind: "net" });
    hdfc = hdfcAfter;
  }
  return { legs, bank, drawn: drawnMap };
}

function averageBank(sim: Simulation): number {
  let total = 0;
  for (const v of sim.bank.values()) total += v;
  return total / sim.bank.size;
}

/** Solve the mid-month OD bump so the average ICICI+HDFC balance is ₹3.25 cr (affine in bump). */
function calibratedSimulation(drafts: readonly DraftTxn[], days: readonly IsoDate[]): Simulation {
  const a0 = averageBank(simulate(drafts, days, 0));
  const a1 = averageBank(simulate(drafts, days, 1));
  const bump = (cr(3.25) - a0) / (a1 - a0);
  const sim = simulate(drafts, days, bump);
  return sim;
}

const creditAccountOf = (l: TransferLeg) => l.to;

function monthlyGross(legs: readonly TransferLeg[]): number[] {
  const g = [0, 0, 0, 0, 0, 0];
  for (const l of legs) {
    // April SBI-side legs are not observable; only ICICI credits count.
    if (!l.matched && creditAccountOf(l) === "sbi") continue;
    const m = monthIndex(l.date);
    g[m] = (g[m] ?? 0) + l.amountMinor;
  }
  return g;
}

/** Add round trips (gross) and splits (count/anchor control) to reach the PDF's pair counts. */
function padTransfers(
  netLegs: TransferLeg[],
  externalRowsBefore: { icici: number; hdfc: number },
): TransferLeg[] {
  const legs = [...netLegs];
  const nH = legs.filter((l) => l.matched && (l.from === "hdfc" || l.to === "hdfc")).length;
  const nS = legs.filter((l) => l.matched && (l.from === "sbi" || l.to === "sbi")).length;
  // Round trips ICICI ⇄ HDFC per month carry the gross own-transfer total. The H1 total is kept exact;
  // if a month's required treasury movement exceeds its PDF share (June stress), the excess is absorbed
  // by months with slack, pro rata.
  const gross = monthlyGross(legs);
  const mandatory = [0, 0, 0, 0, 0, cr(1.5) * 2]; // PDF row: 02-Jun ICICI → HDFC ₹1.50 cr (and back)
  const budget = OWN_TRANSFER_CREDITS.map((v) => cr(v));
  const excess = budget.map((b, m) => (gross[m] ?? 0) + (mandatory[m] ?? 0) - b);
  const over = excess.reduce((a, e) => a + Math.max(0, e), 0);
  const slack = excess.reduce((a, e) => a + Math.max(0, -e), 0);
  if (over > slack)
    throw new Error(`Own-transfer gross exceeds the H1 total by ${((over - slack) / CR).toFixed(2)} cr`);
  const adjusted = budget.map((b, m) => {
    const e = excess[m] ?? 0;
    if (e > 0) return b + e;
    return b - Math.round((over * -e) / Math.max(1, slack));
  });
  const drift = budget.reduce((a, b) => a + b, 0) - adjusted.reduce((a, b) => a + b, 0);
  adjusted[0] = (adjusted[0] ?? 0) + drift;
  for (let m0 = 0; m0 < 6; m0++) {
    const extra = (adjusted[m0] ?? 0) - (gross[m0] ?? 0) - (mandatory[m0] ?? 0);
    const half = Math.max(0, Math.round(extra / 2));
    const firstDay = m0 === 5 ? d(5, 2) : d(m0, 12);
    const a = m0 === 5 ? cr(1.5) : Math.round(half * 0.55);
    const b = m0 === 5 ? Math.max(1_000_00, half) : half - a;
    // Two round trips (4 pairs) per month: ICICI→HDFC a, HDFC→ICICI a, ICICI→HDFC b, HDFC→ICICI b.
    legs.push({
      date: firstDay,
      from: "icici",
      to: "hdfc",
      amountMinor: a,
      matched: true,
      kind: "roundtrip",
    });
    legs.push({
      date: firstDay,
      from: "hdfc",
      to: "icici",
      amountMinor: a,
      matched: true,
      kind: "roundtrip",
    });
    const secondDay = m0 === 5 ? d(5, 16) : d(m0, 22);
    legs.push({
      date: secondDay,
      from: "icici",
      to: "hdfc",
      amountMinor: b,
      matched: true,
      kind: "roundtrip",
    });
    legs.push({
      date: secondDay,
      from: "hdfc",
      to: "icici",
      amountMinor: b,
      matched: true,
      kind: "roundtrip",
    });
  }
  const freeH = MATCHED_PAIRS.icHd - nH - 24;
  const freeS = MATCHED_PAIRS.icSbi - nS;
  if (freeH < 0 || freeS < 0) throw new Error(`Not enough free pairs (H ${freeH}, S ${freeS})`);

  // Rows before the anchors contributed by legs so far.
  const ksOut = d(4, 28);
  const ksIn = d(5, 10);
  const iciciLegBefore = (l: TransferLeg) =>
    (l.date < ksOut || (l.date === ksOut && l.to === "icici")) && (l.from === "icici" || l.to === "icici");
  const hdfcLegBefore = (l: TransferLeg) =>
    (l.date < ksIn || (l.date === ksIn && l.to === "hdfc")) && (l.from === "hdfc" || l.to === "hdfc");
  const iciciBefore = externalRowsBefore.icici + legs.filter(iciciLegBefore).length;
  const hdfcBefore = externalRowsBefore.hdfc + legs.filter(hdfcLegBefore).length;
  const needI = ROW_ANCHORS.iciciKsOut - 1 - iciciBefore;
  const needH = ROW_ANCHORS.hdfcKsIn - 1 - hdfcBefore;
  const a = Math.max(0, Math.min(needI, needH, freeH));
  const b = needH - a;
  const e = needI - a;
  const c = freeH - a - b;
  const f = freeS - e;
  if (b < 0 || c < 0 || e < 0 || f < 0) {
    throw new Error(`Row anchors infeasible: needI=${needI} needH=${needH} freeH=${freeH} freeS=${freeS}`);
  }
  const pickNet = (pred: (l: TransferLeg) => boolean, count: number) => {
    const pool = netLegs.filter(pred);
    if (count > 0 && pool.length === 0) throw new Error("No net legs available to split");
    for (let i = 0; i < count; i++) {
      const base = pool[(i * 7) % pool.length];
      if (!base) continue;
      // Split: carve 40% off the base leg into an extra pair on the same day.
      const part = Math.round(base.amountMinor * 0.4);
      base.amountMinor -= part;
      legs.push({ ...base, amountMinor: part, kind: "split" });
    }
  };
  const isH = (l: TransferLeg) => l.matched && (l.from === "hdfc" || l.to === "hdfc");
  const isS = (l: TransferLeg) => l.matched && (l.from === "sbi" || l.to === "sbi");
  pickNet((l) => isH(l) && l.date < ksOut, a);
  pickNet((l) => isH(l) && l.date > ksOut && l.date < ksIn, b);
  pickNet((l) => isH(l) && l.date > ksIn, c);
  pickNet((l) => isS(l) && l.date < ksOut, e);
  pickNet((l) => isS(l) && l.date > ksIn, f);
  return legs;
}

const LABEL = { icici: "ICICI XX3307", hdfc: "HDFC XX5582", sbi: "SBI OD XX0914" } as const;

function legDrafts(rng: Rng, legs: readonly TransferLeg[]): DraftTxn[] {
  const out: DraftTxn[] = [];
  legs.forEach((l, i) => {
    const pair = `MP-XFER-${String(i + 1).padStart(4, "0")}`;
    const channel = l.from === "sbi" || l.to === "sbi" ? "TRF" : "IMPS";
    const ref = `${channel === "TRF" ? "TRF " : "IMPS "}${refDigits(() => rng.next(), channel === "TRF" ? 8 : 12)}`;
    const isOd = l.from === "sbi" || l.to === "sbi";
    const debitCategory =
      l.from === "sbi" ? "od_drawdown" : l.to === "sbi" ? "od_repayment" : "own_account_transfer";
    const creditCategory = debitCategory;
    const visible = (acc: TransferLeg["from"]) => !(acc === "sbi" && monthIndex(l.date) === 3);
    if (visible(l.from)) {
      out.push({
        accountId: ACCT[l.from],
        date: l.date,
        seq: 80,
        direction: "debit",
        amountMinor: l.amountMinor,
        narration: isOd
          ? l.from === "sbi"
            ? `TRF TO ICICI CA XX3307 FUNDING`
            : `TRF TO SBI OD A/C XX0914 REPAY`
          : `IMPS/P2A/OWN A/C ${l.to === "hdfc" ? "HDFC XX5582" : "ICICI XX3307"}`,
        normalised: `Own account transfer → ${LABEL[l.to]}`,
        reference: ref,
        channel,
        counterparty: {
          key: `SELF-${l.to.toUpperCase()}`,
          name: `Self · ${LABEL[l.to]}`,
          kind: "own_account",
        },
        category: debitCategory,
        categoryConfidence: 0.99,
        counterpartyConfidence: 0.975,
        transferPairId: l.matched ? pair : null,
      });
    }
    if (visible(l.to)) {
      out.push({
        accountId: ACCT[l.to],
        date: l.date,
        seq: 5,
        direction: "credit",
        amountMinor: l.amountMinor,
        narration: isOd
          ? l.from === "sbi"
            ? `TRF FROM SBI OD A/C XX0914 FUNDING`
            : `TRF FROM ICICI CA XX3307 REPAYMENT`
          : `IMPS CR/MERIDIAN PRECISION/${l.from === "hdfc" ? "HDFC XX5582" : "ICICI XX3307"}`,
        normalised: `Own account transfer ← ${LABEL[l.from]}`,
        reference: ref,
        channel,
        counterparty: {
          key: `SELF-${l.from.toUpperCase()}`,
          name: `Self · ${LABEL[l.from]}`,
          kind: "own_account",
        },
        category: creditCategory,
        categoryConfidence: 0.99,
        counterpartyConfidence: 0.975,
        transferPairId: l.matched ? pair : null,
      });
    }
  });
  return out;
}

/* ---------- classification confidence & OCR ---------- */

function applyLowConfidence(rng: Rng, drafts: DraftTxn[]): void {
  const already = drafts.filter((t) => t.categoryConfidence < 0.85).length;
  const candidates = drafts
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => {
      const eligibleRecurring = !t.recurringId || t.recurringId.startsWith("coll-CUST-");
      return (
        t.categoryConfidence >= 0.85 &&
        (t.category === "customer_collection" || t.category === "other_opex" || t.category === "logistics") &&
        eligibleRecurring &&
        !t.fx
      );
    });
  const chosen = rng.shuffle(candidates).slice(0, LOW_CONFIDENCE_ROWS - already);
  for (const { t, i } of chosen) {
    const unclassified = rng.next() < 0.35;
    drafts[i] = {
      ...t,
      categoryConfidence: 0.55 + rng.next() * 0.29,
      category: unclassified ? "unclassified" : t.category,
      alternatives: [
        {
          label: t.direction === "credit" ? "Related-party receipt" : "Personal / non-business",
          probability: 0.12 + rng.next() * 0.1,
        },
        { label: "Other", probability: 0.05 + rng.next() * 0.05 },
      ],
    };
  }
}

/** Assign recurring ids to other-customer collections and some customer name aliases. */
function applyAliases(drafts: DraftTxn[]): void {
  for (let i = 0; i < drafts.length; i++) {
    const t = drafts[i];
    if (!t) continue;
    const match = /^CUST-(\d+)$/.exec(t.counterparty.key);
    if (!match) continue;
    const idx = Number(match[1]);
    if (idx >= 27 || i % 2 === 0) continue;
    // Alternate a short-name variant for 27 customers ("SAI FASTENERS" vs "SAI FASTENERS PVT LTD").
    const short = t.counterparty.name
      .replace(/ (Pvt Ltd|Industries|Enterprises|LLP|& Co|Traders)$/i, "")
      .toUpperCase();
    drafts[i] = { ...t, narration: t.narration.replace(/-[^-]+$/, `-${short}`) };
  }
}

/* ---------- June stress calibration ---------- */

/**
 * Pins the net position so that (a) the bank closes 07-Jun at its ₹0.31 cr minimum with the OD at
 * position-implied drawn, and (b) 08-Jun's net flow puts the OD at exactly 71% of the limit.
 * (a) shifts the Shakti June instalments between 06-Jun and 22-Jun; (b) shifts the Precision Castings
 * instalments between 08-Jun and 27-Jun. Monthly totals are unchanged.
 */
function calibrateJune(
  drafts: DraftTxn[],
  days: readonly IsoDate[],
  shakti: { early: number; late: number },
  precision: { peak: number; late: number },
): void {
  const payrollDay = d(5, JUNE_OD.payrollFundingDay);
  const peakDay = d(5, JUNE_OD.peakDay);
  const pos7 = positionPath(drafts, days).get(payrollDay) ?? 0;
  const delta = pos7 - cr(JUNE_OD.positionOnPayrollDay);
  const early = drafts[shakti.early];
  const late = drafts[shakti.late];
  if (!early || !late) throw new Error("Shakti calibration rows missing");
  if (early.amountMinor + delta <= cr(0.2) || late.amountMinor - delta <= cr(0.2)) {
    throw new Error(`Shakti calibration out of range (delta ${(delta / CR).toFixed(2)} cr)`);
  }
  drafts[shakti.early] = { ...early, amountMinor: early.amountMinor + delta };
  drafts[shakti.late] = { ...late, amountMinor: late.amountMinor - delta };

  const flow8 = drafts
    .filter((t) => t.date === peakDay && (!t.ledgerEffect || t.ledgerEffect.kind === "posted"))
    .reduce((a, t) => a + (t.direction === "credit" ? t.amountMinor : -t.amountMinor), 0);
  const need = flow8 - cr(JUNE_OD.flowOnPeakDay); // extra debit required on 08-Jun
  const pk = drafts[precision.peak];
  const pl = drafts[precision.late];
  if (!pk || !pl) throw new Error("Precision calibration rows missing");
  if (pk.amountMinor + need <= cr(0.05) || pl.amountMinor - need <= cr(0.05)) {
    throw new Error(`June peak calibration out of range (${(need / CR).toFixed(2)} cr)`);
  }
  drafts[precision.peak] = { ...pk, amountMinor: pk.amountMinor + need };
  drafts[precision.late] = { ...pl, amountMinor: pl.amountMinor - need };
}

/* ---------- assembly ---------- */

export interface MeridianDataset {
  customer: CorporateCustomer;
  accounts: readonly Account[];
  transactions: readonly Transaction[];
  /** Days for which SBI balances are not observable. */
  sbiMissingMonth: number;
}

let cache: MeridianDataset | null = null;

export function getMeridianDataset(): MeridianDataset {
  if (cache) return cache;
  const rng = createRng(MERIDIAN_SEED);
  const ext = buildExternals(rng, ACCT);
  const drafts = ext.drafts;
  const days = eachDay(PERIOD.from, PERIOD.to);
  smoothTiming(drafts, ACCT, cr(OPENING.icici + OPENING.hdfc + OPENING.sbi));

  calibrateJune(drafts, days, ext.shaktiJuneCalibration, ext.precisionJuneCalibration);
  applyAliases(drafts);
  applyLowConfidence(rng, drafts);

  const sim = calibratedSimulation(drafts, days);
  const net = sim.legs;
  const ksOut = d(4, 28);
  const ksIn = d(5, 10);
  const externalRowsBefore = {
    icici: drafts.filter(
      (t) => t.accountId === ACCT.icici && (t.date < ksOut || (t.date === ksOut && (t.seq ?? 50) < 60)),
    ).length,
    hdfc: drafts.filter(
      (t) => t.accountId === ACCT.hdfc && (t.date < ksIn || (t.date === ksIn && (t.seq ?? 50) < 60)),
    ).length,
  };
  const legs = padTransfers(net, externalRowsBefore);
  const all = [...drafts, ...legDrafts(rng, legs)];
  for (const t of all) {
    if (t.narration === "NEFT DR-K S TRADING CO-ADV") t.expectRow = ROW_ANCHORS.iciciKsOut;
    if (t.narration === "CHQ DEP-K S TRADING CO") t.expectRow = ROW_ANCHORS.hdfcKsIn;
  }

  const transactions = buildLedger(all, ledgerConfigs(all), "MP").map((t) => withOcr(t));
  cache = { customer: MERIDIAN_CUSTOMER, accounts: MERIDIAN_ACCOUNTS, transactions, sbiMissingMonth: 3 };
  return cache;
}

const SBI_FILES = [
  { m0: 0, name: "SBI_OD_0914_Jan26.pdf", pages: 9 },
  { m0: 1, name: "SBI_OD_0914_Feb26.pdf", pages: 8 },
  { m0: 2, name: "SBI_OD_0914_Mar26.pdf", pages: 11 },
  { m0: 4, name: "SBI_OD_0914_May26_scan.jpg", pages: 4 },
  { m0: 5, name: "SBI_OD_0914_Jun26.pdf", pages: 10 },
] as const;

function ledgerConfigs(all: readonly DraftTxn[]): AccountLedgerConfig[] {
  const sbiRows = (m0: number) =>
    all.filter((t) => t.accountId === ACCT.sbi && monthIndex(t.date) === m0).length;
  const sbiTotal = all.filter((t) => t.accountId === ACCT.sbi).length;
  const mayRows = sbiRows(4);
  const regular = 0.955;
  const mayExtraction = (EXTRACTION.sbi * sbiTotal - regular * (sbiTotal - mayRows)) / Math.max(1, mayRows);
  return [
    {
      accountId: ACCT.icici,
      currency: "INR",
      openingMinor: cr(OPENING.icici),
      files: [
        {
          fileId: "SF-MP-ICICI-3307",
          fileName: "ICICI_CA_3307_Jan-Jun26.pdf",
          from: d(0, 1),
          to: d(5, 30),
          rowsPerPage: 21.6,
          extractionConfidence: EXTRACTION.icici,
        },
      ],
    },
    {
      accountId: ACCT.hdfc,
      currency: "INR",
      openingMinor: cr(OPENING.hdfc),
      files: [
        {
          fileId: "SF-MP-HDFC-5582",
          fileName: "HDFC_CA_5582_H1-2026.xlsx",
          from: d(0, 1),
          to: d(5, 30),
          rowsPerPage: null,
          extractionConfidence: EXTRACTION.hdfc,
        },
      ],
    },
    {
      accountId: ACCT.sbi,
      currency: "INR",
      openingMinor: cr(OPENING.sbi),
      files: SBI_FILES.map((f) => ({
        fileId: `SF-MP-SBI-${String(f.m0 + 1).padStart(2, "0")}`,
        fileName: f.name,
        from: d(f.m0, 1),
        to: d(f.m0, daysInMonth(YEAR, f.m0 + 1)),
        rowsPerPage: Math.ceil(sbiRows(f.m0) / f.pages),
        extractionConfidence: f.m0 === 4 ? Math.round(mayExtraction * 10000) / 10000 : regular,
        // The bank's May statement opens at the true balance after the unobserved April movements.
        ...(f.m0 === 4 ? { openingMinor: -cr(MONTH_END.sbiDrawn[3] ?? 0) } : {}),
      })),
    },
  ];
}

/** OCR confidence for the scanned SBI May statement: p.3 is weak (38 rows below 90%). */
function withOcr(t: Transaction): Transaction {
  if (t.accountId !== ACCT.sbi || monthIndex(t.date) !== 4) return t;
  const page = t.source.page ?? 1;
  const seed = (t.source.row * 2654435761) % 1000;
  if (page === 3) {
    const weak = seed % 100 < 66;
    return { ...t, ocrConfidence: weak ? 0.8 + (seed % 90) / 1000 : 0.9 + (seed % 30) / 1000 };
  }
  return { ...t, ocrConfidence: 0.988 + (seed % 12) / 1000 };
}

export const MERIDIAN_PERIOD = PERIOD;
