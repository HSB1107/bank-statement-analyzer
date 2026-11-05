import { available, notAvailable, type Availability } from "@/shared/lib/availability";
import { daysBetween, eachDay, monthIndex, type IsoDate } from "@/shared/lib/dates";
import { type Account } from "../schemas/customer";
import { type AccountId } from "../schemas/ids";
import { categoryGroup, type CategoryId } from "../schemas/category";
import { type Transaction } from "../schemas/transaction";
import { isOwnTransfer, isPosted, mean, monthlySum, type EodPoint } from "./ledger";

/**
 * Pure selectors for corporate (SME) analytics. A month in which an account's statement is
 * missing yields NotAvailable for that account's balances — never zero, never interpolated.
 */

export const MONTHS = [0, 1, 2, 3, 4, 5] as const;

export interface CorporateInput {
  transactions: readonly Transaction[];
  accounts: readonly Account[];
  period: { from: IsoDate; to: IsoDate };
  /** Months (0-based) with no statement, per account. */
  missingMonths: Readonly<Partial<Record<AccountId, readonly number[]>>>;
  lowBalanceThresholdMinor: number;
}

const FINANCING_OUT: ReadonlySet<CategoryId> = new Set(["term_loan_emi", "od_interest"]);
const STATUTORY: ReadonlySet<CategoryId> = new Set(["gst", "tds", "epf_esic", "other_statutory"]);

const posted = (t: Transaction) => isPosted(t);
const external = (t: Transaction) => !isOwnTransfer(t);

export type CashBucket =
  | "operating_in"
  | "operating_out"
  | "financing_in"
  | "financing_out"
  | "investing"
  | "related_in"
  | "related_out"
  | "transfer";

/** Bank-derived cash-flow bucket (not an accounting cash-flow statement). */
export function cashBucket(t: Transaction): CashBucket {
  if (isOwnTransfer(t)) return "transfer";
  if (t.direction === "credit") {
    if (t.category === "loan_disbursement" || t.category === "capital_infusion") return "financing_in";
    if (t.category === "related_party_receipt") return "related_in";
    return "operating_in";
  }
  if (FINANCING_OUT.has(t.category)) return "financing_out";
  if (t.category === "capex") return "investing";
  if (t.category === "related_party_payment") return "related_out";
  return "operating_out";
}

/* ---------------- Revenue proxy & cash flow ---------------- */

export function cashFlow(input: CorporateInput) {
  const t = input.transactions.filter(posted);
  const by = (bucket: CashBucket) => monthlySum(t, MONTHS, (x) => cashBucket(x) === bucket);
  const opIn = by("operating_in");
  const opOut = by("operating_out");
  const finIn = by("financing_in");
  const finOut = by("financing_out");
  const inv = by("investing");
  const relIn = by("related_in");
  const relOut = by("related_out");
  const netOp = MONTHS.map((m) => (opIn[m] ?? 0) - (opOut[m] ?? 0));
  const financing = MONTHS.map((m) => (finIn[m] ?? 0) - (finOut[m] ?? 0));
  const related = MONTHS.map((m) => (relIn[m] ?? 0) - (relOut[m] ?? 0));
  const netCash = MONTHS.map(
    (m) => (netOp[m] ?? 0) + (financing[m] ?? 0) - (inv[m] ?? 0) + (related[m] ?? 0),
  );
  const total = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
  const grossCredits = t
    .filter((x) => x.direction === "credit")
    .reduce((a, x) => a + x.amount.amountMinor, 0);
  const ownTransfers = t
    .filter((x) => x.direction === "credit" && isOwnTransfer(x))
    .reduce((a, x) => a + x.amount.amountMinor, 0);
  const reversals = t
    .filter((x) => x.direction === "credit" && x.category === "refund_other")
    .reduce((a, x) => a + x.amount.amountMinor, 0);
  const grossByMonth = monthlySum(t, MONTHS, (x) => x.direction === "credit");
  const ownByMonth = monthlySum(t, MONTHS, (x) => x.direction === "credit" && isOwnTransfer(x));
  return {
    opIn,
    opOut,
    netOp,
    financing,
    investing: inv,
    related,
    netCash,
    finIn,
    finOut,
    relIn,
    relOut,
    grossByMonth,
    ownByMonth,
    totals: {
      grossCredits,
      ownTransfers,
      loanProceeds: total(finIn),
      relatedPartyReceipt: total(relIn),
      reversals,
      receiptsProxy: grossCredits - ownTransfers - total(finIn) - total(relIn) - reversals,
      opIn: total(opIn),
      opOut: total(opOut),
      netOp: total(netOp),
      financing: total(financing),
      investing: total(inv),
      related: total(related),
      netCash: total(netCash),
      debtService: total(finOut),
      q1Collections: total(opIn.slice(0, 3)),
      q2Collections: total(opIn.slice(3, 6)),
      q1NetOp: total(netOp.slice(0, 3)),
      q2NetOp: total(netOp.slice(3, 6)),
    },
    debtServiceProxy: total(finOut) ? total(netOp) / total(finOut) : 0,
    ownTransferPairs: new Set(t.filter((x) => x.transferPairId !== null).map((x) => x.transferPairId)).size,
    unmatchedTransferLegs: t.filter((x) => isOwnTransfer(x) && x.transferPairId === null).length,
  };
}

/** Waterfall categories (₹ minor, H1). */
export function waterfall(input: CorporateInput) {
  const t = input.transactions.filter(posted).filter(external);
  const sum = (pred: (x: Transaction) => boolean) =>
    t.filter(pred).reduce((a, x) => a + x.amount.amountMinor, 0);
  const suppliers = sum((x) => cashBucket(x) === "operating_out" && x.category === "supplier_payment");
  const payroll = sum((x) => x.category === "payroll");
  const statutory = sum((x) => STATUTORY.has(x.category));
  const opOut = sum((x) => cashBucket(x) === "operating_out");
  return {
    collections: sum((x) => cashBucket(x) === "operating_in"),
    suppliers,
    payroll,
    statutory,
    otherOpex: opOut - suppliers - payroll - statutory,
    termLoanIn: sum((x) => cashBucket(x) === "financing_in"),
    relatedIn: sum((x) => cashBucket(x) === "related_in"),
    debtService: sum((x) => cashBucket(x) === "financing_out"),
    capex: sum((x) => cashBucket(x) === "investing"),
    relatedOut: sum((x) => cashBucket(x) === "related_out"),
  };
}

/* ---------------- Counterparties ---------------- */

export interface CounterpartyShare {
  id: string;
  name: string;
  totalMinor: number;
  share: number;
  monthly: number[];
  channel: string;
  rows: number;
}

export function inflowConcentration(input: CorporateInput, topN = 5) {
  const t = input.transactions.filter(posted).filter((x) => cashBucket(x) === "operating_in");
  const total = t.reduce((a, x) => a + x.amount.amountMinor, 0);
  const map = new Map<string, CounterpartyShare>();
  for (const x of t) {
    const cur = map.get(x.counterparty.id) ?? {
      id: x.counterparty.id,
      name: x.counterparty.name,
      totalMinor: 0,
      share: 0,
      monthly: [0, 0, 0, 0, 0, 0],
      channel: x.fx ? `${x.channel} · ${x.fx.original.currency}` : x.channel,
      rows: 0,
    };
    cur.totalMinor += x.amount.amountMinor;
    cur.rows += 1;
    const m = monthIndex(x.date);
    cur.monthly[m] = (cur.monthly[m] ?? 0) + x.amount.amountMinor;
    map.set(x.counterparty.id, cur);
  }
  const ranked = [...map.values()]
    .map((c) => ({ ...c, share: total ? c.totalMinor / total : 0 }))
    .sort((a, b) => b.totalMinor - a.totalMinor);
  const top = ranked.slice(0, topN);
  const rest = ranked.slice(topN);
  const restMonthly = MONTHS.map((m) => rest.reduce((a, c) => a + (c.monthly[m] ?? 0), 0));
  const monthlyTotals = MONTHS.map((m) => ranked.reduce((a, c) => a + (c.monthly[m] ?? 0), 0));
  const top3Monthly = MONTHS.map((m) => ranked.slice(0, 3).reduce((a, c) => a + (c.monthly[m] ?? 0), 0));
  const recurring = ranked.filter((c) => c.monthly.filter((v) => v > 0).length >= 3);
  return {
    totalMinor: total,
    ranked,
    top,
    rest: {
      count: rest.length,
      totalMinor: rest.reduce((a, c) => a + c.totalMinor, 0),
      monthly: restMonthly,
      share: total ? rest.reduce((a, c) => a + c.totalMinor, 0) / total : 0,
    },
    top3Share: total ? ranked.slice(0, 3).reduce((a, c) => a + c.totalMinor, 0) / total : 0,
    top5Share: total ? top.reduce((a, c) => a + c.totalMinor, 0) / total : 0,
    hhi: ranked.reduce((a, c) => a + c.share * c.share, 0),
    payers: ranked.length,
    recurringPayers: recurring.length,
    oneOffPayers: ranked.length - recurring.length,
    monthlyTotals,
    top3ShareByMonth: MONTHS.map((m) =>
      (monthlyTotals[m] ?? 0) ? (top3Monthly[m] ?? 0) / (monthlyTotals[m] ?? 1) : 0,
    ),
    leaderShareByMonth: MONTHS.map((m) =>
      (monthlyTotals[m] ?? 0) ? (ranked[0]?.monthly[m] ?? 0) / (monthlyTotals[m] ?? 1) : 0,
    ),
  };
}

export function supplierConcentration(input: CorporateInput) {
  const t = input.transactions
    .filter(posted)
    .filter((x) => x.direction === "debit" && x.category === "supplier_payment");
  const total = t.reduce((a, x) => a + x.amount.amountMinor, 0);
  const map = new Map<string, { id: string; name: string; totalMinor: number; rows: number }>();
  for (const x of t) {
    const cur = map.get(x.counterparty.id) ?? {
      id: x.counterparty.id,
      name: x.counterparty.name,
      totalMinor: 0,
      rows: 0,
    };
    cur.totalMinor += x.amount.amountMinor;
    cur.rows += 1;
    map.set(x.counterparty.id, cur);
  }
  const ranked = [...map.values()]
    .sort((a, b) => b.totalMinor - a.totalMinor)
    .map((c) => ({ ...c, share: total ? c.totalMinor / total : 0 }));
  return {
    totalMinor: total,
    ranked,
    supplierCount: ranked.length,
    top1Share: ranked[0]?.share ?? 0,
    top2Share: (ranked[0]?.share ?? 0) + (ranked[1]?.share ?? 0),
  };
}

/** Top outgoing counterparties (excl. own accounts), with grouped payroll/statutory/lender nodes. */
export function topOutgoing(input: CorporateInput, n = 5) {
  const t = input.transactions.filter(posted).filter((x) => x.direction === "debit" && external(x));
  const groupKey = (x: Transaction) => (STATUTORY.has(x.category) ? "GROUP-STATUTORY" : x.counterparty.id);
  const map = new Map<
    string,
    { id: string; name: string; totalMinor: number; rows: number; kind: string; days: Set<number> }
  >();
  for (const x of t) {
    const key = groupKey(x);
    const name = key === "GROUP-STATUTORY" ? "GSTN / CBDT / EPFO" : x.counterparty.name;
    const cur = map.get(key) ?? {
      id: key,
      name,
      totalMinor: 0,
      rows: 0,
      kind: x.counterparty.kind,
      days: new Set<number>(),
    };
    cur.totalMinor += x.amount.amountMinor;
    cur.rows += 1;
    cur.days.add(Number(x.date.slice(8, 10)));
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.totalMinor - a.totalMinor).slice(0, n);
}

/* ---------------- Balances & OD ---------------- */

function eodWithGaps(
  input: CorporateInput,
  accountId: AccountId,
): { date: IsoDate; balance: Availability<number> }[] {
  const rows = input.transactions.filter((t) => t.accountId === accountId);
  const lastByDate = new Map<string, number>();
  for (const t of rows) lastByDate.set(t.date, t.balance.amountMinor);
  const first = rows[0];
  let current = first
    ? first.balance.amountMinor -
      (isPosted(first)
        ? first.direction === "credit"
          ? first.amount.amountMinor
          : -first.amount.amountMinor
        : 0)
    : 0;
  const missing = new Set(input.missingMonths[accountId] ?? []);
  return eachDay(input.period.from, input.period.to).map((date) => {
    const v = lastByDate.get(date);
    if (missing.has(monthIndex(date)))
      return { date, balance: notAvailable("Statement not uploaded for this month") };
    if (v !== undefined) current = v;
    else if (rows.length && firstRowOfMonthAfterGap(rows, date, missing))
      current = openingOfMonth(rows, date) ?? current;
    return { date, balance: available(current) };
  });
}

function firstRowOfMonthAfterGap(
  rows: readonly Transaction[],
  date: IsoDate,
  missing: ReadonlySet<number>,
): boolean {
  const m = monthIndex(date);
  return missing.has(m - 1) && Number(date.slice(8, 10)) === 1 && rows.some((r) => monthIndex(r.date) === m);
}

function openingOfMonth(rows: readonly Transaction[], date: IsoDate): number | undefined {
  const r = rows.find((x) => monthIndex(x.date) === monthIndex(date));
  if (!r) return undefined;
  return (
    r.balance.amountMinor -
    (isPosted(r) ? (r.direction === "credit" ? r.amount.amountMinor : -r.amount.amountMinor) : 0)
  );
}

export function bankBalances(input: CorporateInput) {
  const currents = input.accounts.filter((a) => a.type !== "od_cc");
  const series = currents.map((a) => eodWithGaps(input, a.id));
  const days = eachDay(input.period.from, input.period.to);
  const combined: EodPoint[] = days.map((date, i) => ({
    date,
    balanceMinor: series.reduce((acc, s) => {
      const p = s[i]?.balance;
      return acc + (p && p.status === "available" ? p.value : 0);
    }, 0),
  }));
  const first = combined[0];
  if (!first) throw new Error("Empty period");
  const min = combined.reduce((a, p) => (p.balanceMinor < a.balanceMinor ? p : a), first);
  const max = combined.reduce((a, p) => (p.balanceMinor > a.balanceMinor ? p : a), first);
  const lowDays = combined.filter((p) => p.balanceMinor < input.lowBalanceThresholdMinor);
  const monthEnd = MONTHS.map((m) => {
    const pts = combined.filter((p) => monthIndex(p.date) === m);
    return pts[pts.length - 1]?.balanceMinor ?? 0;
  });
  const negative = input.transactions.filter(
    (t) => currents.some((a) => a.id === t.accountId) && t.balance.amountMinor < 0,
  ).length;
  return {
    combined,
    perAccount: currents.map((a, i) => ({ account: a, series: series[i] ?? [] })),
    averageMinor: mean(combined.map((p) => p.balanceMinor)),
    min,
    max,
    closingMinor: combined[combined.length - 1]?.balanceMinor ?? 0,
    lowBalanceDays: lowDays.length,
    lowBalanceDates: lowDays.map((p) => p.date),
    negativeInstances: negative,
    monthEnd,
  };
}

export function odUtilisation(input: CorporateInput) {
  const od = input.accounts.find((a) => a.type === "od_cc");
  if (!od) return { status: "no_facility" as const };
  if (od.odLimit.status !== "available") {
    // Never infer a limit from balances.
    return { status: "limit_unknown" as const, account: od, reason: od.odLimit.reason };
  }
  const limit = od.odLimit.value.limit.amountMinor;
  const series = eodWithGaps(input, od.id).map((p) => ({
    date: p.date,
    drawn: p.balance.status === "available" ? available(Math.max(0, -p.balance.value)) : p.balance,
    utilisation:
      p.balance.status === "available" ? available(Math.max(0, -p.balance.value) / limit) : p.balance,
  }));
  const avail = series.filter(
    (
      p,
    ): p is {
      date: IsoDate;
      drawn: { status: "available"; value: number };
      utilisation: { status: "available"; value: number };
    } => p.utilisation.status === "available" && p.drawn.status === "available",
  );
  const firstPeak = avail[0];
  if (!firstPeak) throw new Error("No OD data");
  const peak = avail.reduce((a, p) => (p.utilisation.value > a.utilisation.value ? p : a), firstPeak);
  const monthEnd: Availability<number>[] = MONTHS.map((m) => {
    const pts = series.filter((p) => monthIndex(p.date) === m);
    const last = pts[pts.length - 1];
    return last ? last.utilisation : notAvailable("No data");
  });
  const monthEndDrawn: Availability<number>[] = MONTHS.map((m) => {
    const pts = series.filter((p) => monthIndex(p.date) === m);
    const last = pts[pts.length - 1];
    return last ? last.drawn : notAvailable("No data");
  });
  return {
    status: "available" as const,
    account: od,
    limitMinor: limit,
    limitSource: od.odLimit.value.fileName,
    series,
    peak: { date: peak.date, utilisation: peak.utilisation.value, drawnMinor: peak.drawn.value },
    monthEnd,
    monthEndDrawn,
  };
}

/** Behavioural cash runway (BSA-MET-CR-02). */
export function cashRunway(input: CorporateInput) {
  const cf = cashFlow(input);
  const bank = bankBalances(input);
  const od = odUtilisation(input);
  const lastDrawn = od.status === "available" ? od.monthEndDrawn[5] : undefined;
  const undrawn =
    od.status === "available" && lastDrawn?.status === "available" ? od.limitMinor - lastDrawn.value : 0;
  const available = bank.closingMinor + undrawn;
  const avgOpOut = cf.totals.opOut / 6;
  const q2Burn = -cf.totals.q2NetOp / 3;
  return {
    availableLiquidityMinor: available,
    cashMinor: bank.closingMinor,
    undrawnOdMinor: undrawn,
    avgOperatingOutflowMinor: avgOpOut,
    netOperatingBurnMinor: q2Burn,
    netBurnRunwayMonths: q2Burn > 0 ? available / q2Burn : Number.POSITIVE_INFINITY,
    grossCoverDays: avgOpOut ? (available / avgOpOut) * 30 : 0,
  };
}

/* ---------------- Fund flow & data quality ---------------- */

export interface RoundTrip {
  counterpartyId: string;
  counterpartyName: string;
  out: Transaction;
  back: Transaction;
  days: number;
  returnedShare: number;
}

/** RT-02: outflow to X, inflow from X within 30 days, ≥ 90% of value, X not a recurring trade party. */
export function detectRoundTrips(input: CorporateInput, windowDays = 30, minShare = 0.9): RoundTrip[] {
  const t = input.transactions.filter(posted).filter(external);
  const recurring = new Set(t.filter((x) => x.recurringId !== null).map((x) => x.counterparty.id));
  const out: RoundTrip[] = [];
  for (const o of t) {
    if (o.direction !== "debit" || recurring.has(o.counterparty.id) || o.amount.amountMinor < 1_00_00_000_00)
      continue;
    const back = t.find(
      (b) =>
        b.direction === "credit" &&
        b.counterparty.id === o.counterparty.id &&
        b.date > o.date &&
        daysBetween(o.date, b.date) <= windowDays &&
        b.amount.amountMinor >= o.amount.amountMinor * minShare,
    );
    if (back)
      out.push({
        counterpartyId: o.counterparty.id,
        counterpartyName: o.counterparty.name,
        out: o,
        back,
        days: daysBetween(o.date, back.date),
        returnedShare: back.amount.amountMinor / o.amount.amountMinor,
      });
  }
  return out;
}

/** Round-sum transfers ≥ ₹1 cr to non-trade counterparties within the given months. */
export function roundAmountTransfers(input: CorporateInput, months: readonly number[]) {
  return input.transactions
    .filter(posted)
    .filter(external)
    .filter((x) => x.direction === "debit" && months.includes(monthIndex(x.date)))
    .filter((x) => x.amount.amountMinor >= 1_00_00_000_00 && x.amount.amountMinor % 5_00_000_00 === 0)
    .filter((x) => x.counterparty.kind === "unknown" || x.counterparty.kind === "related_party");
}

export function dataQuality(input: CorporateInput, lowConfidence = 0.85) {
  const t = input.transactions;
  const total = t.length;
  const low = t.filter((x) => x.categoryConfidence < lowConfidence);
  const dupGroups = new Set(t.filter((x) => x.duplicateGroup !== null).map((x) => x.duplicateGroup));
  const dupRows = t.filter((x) => x.duplicateGroup !== null);
  const counterparties = new Set(
    t.filter((x) => x.counterparty.kind !== "own_account").map((x) => x.counterparty.id),
  );
  const ocrRows = t.filter((x) => x.ocrConfidence !== null);
  // Alias count: distinct raw payee strings per counterparty, minus one.
  const variants = new Map<string, Set<string>>();
  for (const x of t) {
    // Only customer/supplier narrations carry a free-text payee name that can vary.
    if (x.counterparty.kind !== "customer" && x.counterparty.kind !== "supplier") continue;
    const payee =
      x.narration.replace(/^[A-Z ]+?(CR|DR|DEP)-/, "").split(/-(INV|PO|EUR|ADV)\b/)[0] ?? x.narration;
    const set = variants.get(x.counterparty.id) ?? new Set<string>();
    set.add(payee.trim());
    variants.set(x.counterparty.id, set);
  }
  const aliases = [...variants.values()].reduce((a, s) => a + Math.max(0, s.size - 1), 0);
  return {
    total,
    credits: t.filter((x) => x.direction === "credit").length,
    debits: t.filter((x) => x.direction === "debit").length,
    categorised: total - low.length,
    lowConfidence: low.length,
    uncategorised: low.length,
    classificationConfidence: total ? (total - low.length) / total : 0,
    extractionConfidence: mean(t.map((x) => x.extractionConfidence)),
    counterpartyConfidence: mean(t.map((x) => x.counterpartyConfidence)),
    ocrConfidence: mean(ocrRows.map((x) => x.ocrConfidence ?? 0)),
    ocrRows: ocrRows.length,
    ocrBelow90: ocrRows.filter((x) => (x.ocrConfidence ?? 1) < 0.9).length,
    duplicateGroups: dupGroups.size,
    duplicateRows: dupRows.length,
    duplicateAmountMinor: dupRows.reduce((a, x) => a + x.amount.amountMinor, 0),
    counterparties: counterparties.size,
    aliases,
    categories: new Set(t.map((x) => x.category)).size,
    groups: new Set(t.map((x) => categoryGroup(x.category))).size,
    byAccount: input.accounts.map((a) => {
      const rows = t.filter((x) => x.accountId === a.id);
      return { account: a, rows: rows.length, extraction: mean(rows.map((x) => x.extractionConfidence)) };
    }),
  };
}

/** Account-month coverage grid. */
export function coverage(input: CorporateInput) {
  const grid = input.accounts.map((a) => ({
    account: a,
    months: MONTHS.map((m) =>
      (input.missingMonths[a.id] ?? []).includes(m) ? ("missing" as const) : ("covered" as const),
    ),
  }));
  const total = grid.length * MONTHS.length;
  const covered = grid.reduce((acc, g) => acc + g.months.filter((x) => x === "covered").length, 0);
  return { grid, covered, total, completeness: total ? covered / total : 0 };
}

/** Weeks (Mon-start) in the period that contain at least one customer collection. */
export function collectionWeeks(input: CorporateInput) {
  const t = input.transactions.filter(posted).filter((x) => cashBucket(x) === "operating_in");
  // 7-day blocks from the period start (181 days → 26 blocks).
  const weekOf = (date: IsoDate) => Math.floor(daysBetween(input.period.from, date) / 7);
  const weeks = new Set(t.map((x) => weekOf(x.date)));
  return { withCollections: weeks.size, totalWeeks: weekOf(input.period.to) + 1 };
}
