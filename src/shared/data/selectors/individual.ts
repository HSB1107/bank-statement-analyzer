import { dayOfMonth, monthIndex, type IsoDate } from "@/shared/lib/dates";
import { type Account } from "../schemas/customer";
import { type AccountId } from "../schemas/ids";
import { categoryGroup, type CategoryId } from "../schemas/category";
import { type Transaction } from "../schemas/transaction";
import {
  accountEod,
  averageMinor,
  closingBalanceMinor,
  coefficientOfVariation,
  consolidatedEod,
  isOwnTransfer,
  isPosted,
  mean,
  median,
  monthlySum,
  pointsByMonth,
  type EodPoint,
} from "./ledger";

/**
 * Pure selectors for individual (retail) analytics. Inputs are the statement transactions;
 * outputs are numbers in minor units / ratios. No formatting here.
 */

export const H1_MONTHS = [0, 1, 2, 3, 4, 5] as const;

export interface IndividualInput {
  transactions: readonly Transaction[];
  accounts: readonly Account[];
  period: { from: IsoDate; to: IsoDate };
  /** Account whose low balances matter (salary / EMI account). */
  primaryAccountId: AccountId;
  lowBalanceThresholdMinor: number;
  policyFoir: number;
}

const NON_INCOME_CREDITS: ReadonlySet<CategoryId> = new Set([
  "loan_disbursement",
  "tax_refund",
  "refund_other",
]);
const EMI_CATEGORIES: ReadonlySet<CategoryId> = new Set([
  "auto_loan_emi",
  "personal_loan_emi",
  "home_loan_emi",
]);
const INVESTMENT_CATEGORIES: ReadonlySet<CategoryId> = new Set([
  "sip_mutual_fund",
  "fixed_deposit",
  "equity",
  "ppf_nps",
]);

const external = (t: Transaction) => !isOwnTransfer(t);

/* ---------------- Income ---------------- */

export function incomeAnalysis(input: IndividualInput) {
  const t = input.transactions;
  const credits = t.filter((x) => x.direction === "credit" && isPosted(x));
  const salaryByMonth = monthlySum(t, H1_MONTHS, (x) => x.direction === "credit" && x.category === "salary");
  const interestByMonth = monthlySum(
    t,
    H1_MONTHS,
    (x) => x.direction === "credit" && x.category === "interest_income",
  );
  const nonIncomeByMonth = monthlySum(
    t,
    H1_MONTHS,
    (x) => x.direction === "credit" && NON_INCOME_CREDITS.has(x.category),
  );
  const totalInflowsByMonth = monthlySum(t, H1_MONTHS, (x) => x.direction === "credit" && external(x));
  const recurringByMonth = H1_MONTHS.map((m) => (salaryByMonth[m] ?? 0) + (interestByMonth[m] ?? 0));

  const salaryCredits = credits.filter((x) => x.category === "salary");
  const totalCredits = credits.filter(external).reduce((a, x) => a + x.amount.amountMinor, 0);
  const ownTransfersIn = credits.filter(isOwnTransfer).reduce((a, x) => a + x.amount.amountMinor, 0);
  const salaryTotal = salaryByMonth.reduce((a, b) => a + b, 0);
  const interestTotal = interestByMonth.reduce((a, b) => a + b, 0);
  const loanTotal = credits
    .filter((x) => x.category === "loan_disbursement")
    .reduce((a, x) => a + x.amount.amountMinor, 0);
  const taxRefundTotal = credits
    .filter((x) => x.category === "tax_refund")
    .reduce((a, x) => a + x.amount.amountMinor, 0);
  const nonRecurringTotal = loanTotal + taxRefundTotal;
  const nonRecurringEvents = credits.filter((x) => NON_INCOME_CREDITS.has(x.category)).length;

  const q1 = mean(salaryByMonth.slice(0, 3));
  const q2 = mean(salaryByMonth.slice(3, 6));
  const employers = new Set(salaryCredits.map((x) => x.counterparty.id));

  // Salary calendar: expected on the modal credit day; > 2 days later counts as delayed.
  const salaryDays = salaryCredits.map((x) => dayOfMonth(x.date));
  const expectedDay = Math.min(...salaryDays);
  const calendar = H1_MONTHS.map((m) => {
    const credit = salaryCredits.find((x) => monthIndex(x.date) === m);
    const day = credit ? dayOfMonth(credit.date) : null;
    const delayDays = day === null ? null : day - expectedDay;
    return {
      month: m,
      amountMinor: credit?.amount.amountMinor ?? 0,
      day,
      status:
        day === null
          ? ("missed" as const)
          : delayDays !== null && delayDays > 2
            ? ("delayed" as const)
            : ("on_time" as const),
      delayDays: delayDays ?? 0,
    };
  });
  const delayed = calendar.filter((c) => c.status === "delayed");
  const revisions = salaryByMonth.reduce((acc, v, i, arr) => (i > 0 && v !== arr[i - 1] ? acc + 1 : acc), 0);
  const revisionMonth = salaryByMonth.findIndex((v, i, arr) => i > 0 && v !== arr[i - 1]);

  return {
    salaryByMonth,
    interestByMonth,
    nonIncomeByMonth,
    totalInflowsByMonth,
    recurringByMonth,
    totalCreditsMinor: totalCredits,
    ownTransfersInMinor: ownTransfersIn,
    avgMonthlyIncomeMinor: mean(recurringByMonth),
    medianMonthlyIncomeMinor: median(recurringByMonth),
    salaryTotalMinor: salaryTotal,
    salaryCreditCount: salaryCredits.length,
    employerCount: employers.size,
    employerName: salaryCredits[0]?.counterparty.name ?? "—",
    interestTotalMinor: interestTotal,
    loanDisbursementMinor: loanTotal,
    taxRefundMinor: taxRefundTotal,
    nonRecurringTotalMinor: nonRecurringTotal,
    nonRecurringEvents,
    nonRecurringShareOfCredits: totalCredits ? nonRecurringTotal / totalCredits : 0,
    salaryGrowthQ1toQ2: q1 ? q2 / q1 - 1 : 0,
    salaryCv: coefficientOfVariation(salaryByMonth),
    averageSalaryMinor: mean(salaryByMonth),
    singleSourceDependence: salaryTotal + interestTotal ? salaryTotal / (salaryTotal + interestTotal) : 0,
    calendar,
    expectedDay,
    typicalDays: [...new Set(calendar.filter((c) => c.status === "on_time").map((c) => c.day))].sort(),
    delayedCount: delayed.length,
    delayedDetail: delayed[0] ?? null,
    missedCount: calendar.filter((c) => c.status === "missed").length,
    revisions,
    revisionMonth,
    revisionPct:
      revisionMonth > 0
        ? (salaryByMonth[revisionMonth] ?? 0) / (salaryByMonth[revisionMonth - 1] ?? 1) - 1
        : 0,
    distribution: [
      {
        id: "salary",
        amountMinor: salaryTotal,
        share: totalCredits ? salaryTotal / totalCredits : 0,
        nature: "recurring" as const,
      },
      {
        id: "interest",
        amountMinor: interestTotal,
        share: totalCredits ? interestTotal / totalCredits : 0,
        nature: "recurring" as const,
      },
      {
        id: "loan",
        amountMinor: loanTotal,
        share: totalCredits ? loanTotal / totalCredits : 0,
        nature: "not income" as const,
      },
      {
        id: "tax_refund",
        amountMinor: taxRefundTotal,
        share: totalCredits ? taxRefundTotal / totalCredits : 0,
        nature: "one-off" as const,
      },
    ],
  };
}

/* ---------------- Cash flow & expenses ---------------- */

/** One-off outflows: non-recurring debits larger than 50% of average monthly income. */
export function oneOffDebits(input: IndividualInput): Transaction[] {
  const avgIncome = incomeAnalysis(input).avgMonthlyIncomeMinor;
  return input.transactions.filter(
    (t) =>
      t.direction === "debit" &&
      isPosted(t) &&
      external(t) &&
      t.recurringId === null &&
      t.amount.amountMinor > avgIncome * 0.5,
  );
}

export function cashFlowAnalysis(input: IndividualInput) {
  const t = input.transactions;
  const income = incomeAnalysis(input);
  const inByMonth = monthlySum(t, H1_MONTHS, (x) => x.direction === "credit" && external(x));
  const outByMonth = monthlySum(t, H1_MONTHS, (x) => x.direction === "debit" && external(x));
  const netByMonth = H1_MONTHS.map((m) => (inByMonth[m] ?? 0) - (outByMonth[m] ?? 0));
  const oneOffs = new Set(oneOffDebits(input).map((x) => x.id));
  const investByMonth = monthlySum(
    t,
    H1_MONTHS,
    (x) => x.direction === "debit" && INVESTMENT_CATEGORIES.has(x.category),
  );
  const oneOffByMonth = monthlySum(t, H1_MONTHS, (x) => oneOffs.has(x.id));
  const expenseByMonth = H1_MONTHS.map(
    (m) => (outByMonth[m] ?? 0) - (investByMonth[m] ?? 0) - (oneOffByMonth[m] ?? 0),
  );
  const expenseRatios = H1_MONTHS.map((m) => (expenseByMonth[m] ?? 0) / (income.recurringByMonth[m] || 1));

  const eod = consolidatedEod(t, input.period.from, input.period.to);
  const months = pointsByMonth(eod);
  const monthEnd = H1_MONTHS.map((m) => {
    const pts = months.get(m) ?? [];
    return pts[pts.length - 1]?.balanceMinor ?? 0;
  });
  const totalIn = inByMonth.reduce((a, b) => a + b, 0);
  const totalOut = outByMonth.reduce((a, b) => a + b, 0);
  const net = totalIn - totalOut;
  const recurringIncomeTotal = income.recurringByMonth.reduce((a, b) => a + b, 0);

  return {
    inByMonth,
    outByMonth,
    netByMonth,
    monthEnd,
    expenseByMonth,
    expenseRatios,
    totalInMinor: totalIn,
    totalOutMinor: totalOut,
    netMinor: net,
    cashFlowMargin: totalIn ? net / totalIn : 0,
    cashRetention: recurringIncomeTotal ? net / recurringIncomeTotal : 0,
    negativeMonths: netByMonth.filter((n) => n < 0).length,
    positiveMonths: netByMonth.filter((n) => n > 0).length,
    latestMonthNegative: (netByMonth[netByMonth.length - 1] ?? 0) < 0,
    /** Mean of monthly expense-to-income ratios (excl. SIP and one-offs). */
    expenseToIncome: mean(expenseRatios),
    avgMonthlyOutflowMinor: mean(expenseByMonth),
    oneOffs: oneOffDebits(input),
  };
}

/* ---------------- Liquidity ---------------- */

function extreme(points: readonly EodPoint[], pick: "min" | "max"): EodPoint {
  const first = points[0];
  if (!first) throw new Error("Empty balance series");
  return points.reduce((best, p) => {
    if (pick === "min") return p.balanceMinor < best.balanceMinor ? p : best;
    return p.balanceMinor > best.balanceMinor ? p : best;
  }, first);
}

export function liquidityAnalysis(input: IndividualInput) {
  const { transactions: t, period } = input;
  const eod = consolidatedEod(t, period.from, period.to);
  const byMonth = pointsByMonth(eod);
  const monthlyAverages = H1_MONTHS.map((m) => averageMinor(byMonth.get(m) ?? []));
  const cash = cashFlowAnalysis(input);
  const primary = accountEod(t, input.primaryAccountId, period.from, period.to);
  const primaryLow = extreme(primary, "min");
  const primaryHigh = extreme(primary, "max");
  const lowDays = primary.filter((p) => p.balanceMinor < input.lowBalanceThresholdMinor);
  const perAccount = input.accounts.map((a) => ({
    account: a,
    series: accountEod(t, a.id, period.from, period.to),
    closingMinor: closingBalanceMinor(t, a.id),
  }));
  const negativeDays = perAccount.reduce(
    (acc, a) => acc + a.series.filter((p) => p.balanceMinor < 0).length,
    0,
  );
  const closing = eod[eod.length - 1]?.balanceMinor ?? 0;
  const odAccounts = input.accounts.filter((a) => a.odLimit.status === "available");
  const primarySeriesCv = coefficientOfVariation(primary.map((p) => p.balanceMinor));

  return {
    consolidated: eod,
    perAccount,
    avgDailyBalanceMinor: averageMinor(eod),
    avgMonthlyBalanceMinor: mean(monthlyAverages),
    avgMonthEndMinor: mean(cash.monthEnd),
    min: extreme(eod, "min"),
    max: extreme(eod, "max"),
    closingMinor: closing,
    lowBalanceDays: lowDays.length,
    lowBalanceDates: lowDays.map((p) => p.date),
    negativeBalanceDays: negativeDays,
    hasOdFacility: odAccounts.length > 0,
    liquidityBufferMonths: cash.avgMonthlyOutflowMinor ? closing / cash.avgMonthlyOutflowMinor : 0,
    primaryLow,
    primaryHigh,
    primarySeriesCv,
  };
}

/* ---------------- Obligations & FOIR ---------------- */

export interface RecurringObligation {
  recurringId: string;
  label: string;
  sublabel: string;
  counterparty: string;
  category: CategoryId;
  avgMonthlyMinor: number;
  frequency: string;
  lastPayment: IsoDate | null;
  occurrences: number;
  onDate: number;
  expected: number;
  firstMonth: number;
  foirTreatment: "FOIR" | "Fixed" | "Excluded";
}

export function obligationAnalysis(input: IndividualInput) {
  const t = input.transactions;
  const income = incomeAnalysis(input);
  const emiByMonth = monthlySum(
    t,
    H1_MONTHS,
    (x) => x.direction === "debit" && EMI_CATEGORIES.has(x.category),
  );
  const foirByMonth = H1_MONTHS.map((m) => (emiByMonth[m] ?? 0) / (income.recurringByMonth[m] || 1));
  const last = H1_MONTHS.length - 1;
  const numerator = emiByMonth[last] ?? 0;
  const denominator = income.recurringByMonth[last] ?? 0;
  const rentLatest =
    monthlySum(t, H1_MONTHS, (x) => x.direction === "debit" && x.category === "rent")[last] ?? 0;
  const autoLatest =
    monthlySum(t, H1_MONTHS, (x) => x.direction === "debit" && x.category === "auto_loan_emi")[last] ?? 0;
  const plLatest =
    monthlySum(t, H1_MONTHS, (x) => x.direction === "debit" && x.category === "personal_loan_emi")[last] ?? 0;
  const salaryLatest = income.salaryByMonth[last] ?? 0;
  const interestLatest = income.interestByMonth[last] ?? 0;
  const cardAvg = mean(
    monthlySum(t, H1_MONTHS, (x) => x.direction === "debit" && x.category === "credit_card_payment"),
  );
  const committedJune =
    monthlySum(
      t,
      H1_MONTHS,
      (x) =>
        x.direction === "debit" &&
        x.recurringId !== null &&
        ["rent", "auto-emi", "pl-emi", "card", "utilities", "sip"].includes(x.recurringId),
    )[last] ?? 0;

  return {
    emiByMonth,
    incomeByMonth: income.recurringByMonth,
    foirByMonth,
    foirLatest: denominator ? numerator / denominator : 0,
    numeratorMinor: numerator,
    denominatorMinor: denominator,
    autoEmiMinor: autoLatest,
    plEmiMinor: plLatest,
    salaryLatestMinor: salaryLatest,
    interestLatestMinor: interestLatest,
    headroomMinor: Math.round(input.policyFoir * denominator - numerator),
    committedInclRentMinor: numerator + rentLatest,
    fixedObligationRatio: denominator ? (numerator + rentLatest) / denominator : 0,
    cardSettlementAvgMinor: cardAvg,
    committedJuneMinor: committedJune,
    recurring: recurringObligations(t),
    servicing: debtServicing(t),
  };
}

const OBLIGATION_META: Readonly<
  Record<string, { label: string; sublabel: string; treatment: RecurringObligation["foirTreatment"] }>
> = {
  "auto-emi": { label: "Auto Loan EMI", sublabel: "ACH mandate · ICICI", treatment: "FOIR" },
  "pl-emi": { label: "Personal Loan EMI", sublabel: "ACH mandate · HDFC", treatment: "FOIR" },
  rent: { label: "Rent", sublabel: "UPI · ICICI", treatment: "Fixed" },
  card: { label: "Credit card settlement", sublabel: "Spend, not debt — see note", treatment: "Excluded" },
  utilities: { label: "Utilities", sublabel: "BBPS · ICICI", treatment: "Fixed" },
  sip: { label: "Investment SIP", sublabel: "Savings, discretionary", treatment: "Excluded" },
  insurance: { label: "Life insurance", sublabel: "", treatment: "Fixed" },
};

export function recurringObligations(t: readonly Transaction[]): RecurringObligation[] {
  const out: RecurringObligation[] = [];
  for (const [id, meta] of Object.entries(OBLIGATION_META)) {
    const rows = t.filter((x) => x.recurringId === id && x.direction === "debit" && isPosted(x));
    if (rows.length === 0) continue;
    const months = new Set(rows.map((x) => monthIndex(x.date)));
    const total = rows.reduce((a, x) => a + x.amount.amountMinor, 0);
    const days = rows.map((x) => dayOfMonth(x.date));
    const modalDay = mode(days);
    const annual = id === "insurance";
    const expected = id === "utilities" ? rows.length : annual ? 1 : 6 - Math.min(...months);
    out.push({
      recurringId: id,
      label: meta.label,
      sublabel: annual ? `${rows.length === 1 ? "" : ""}` : meta.sublabel,
      counterparty: rows[0]?.counterparty.name ?? "",
      category: rows[0]?.category ?? "unclassified",
      avgMonthlyMinor: annual ? Math.round(total / 12) : Math.round(total / months.size),
      frequency: annual
        ? `Annual (${monthShortOf(rows[0]?.date)})`
        : id === "utilities"
          ? "Monthly"
          : `Monthly · ${ordinal(modalDay)}`,
      lastPayment: rows[rows.length - 1]?.date ?? null,
      occurrences: rows.length,
      onDate: days.filter((d) => d === modalDay).length,
      expected,
      firstMonth: Math.min(...months),
      foirTreatment: meta.treatment,
    });
  }
  return out;
}

export function debtServicing(t: readonly Transaction[]) {
  const returned = t.filter(
    (x) => x.ledgerEffect.kind === "excluded" && x.ledgerEffect.reason === "returned_unpaid",
  );
  const penalties = t.filter((x) => x.category === "penalty_charges" && isPosted(x));
  const emis = t.filter((x) => EMI_CATEGORIES.has(x.category) && isPosted(x) && x.direction === "debit");
  const delayed = emis.filter((x) => dayOfMonth(x.date) > 5);
  const byLoan = new Map<string, Transaction[]>();
  for (const e of emis) byLoan.set(e.counterparty.id, [...(byLoan.get(e.counterparty.id) ?? []), e]);
  const newLoans = [...byLoan.values()].filter((rows) => rows[0] && monthIndex(rows[0].date) > 0);
  const amountChanges = [...byLoan.values()].filter(
    (rows) => new Set(rows.map((r) => r.amount.amountMinor)).size > 1,
  ).length;
  return {
    failedAutoDebits: returned,
    penaltyCharges: penalties,
    delayedEmis: delayed,
    newLoanDeductions: newLoans.map((rows) => rows[0]).filter((r): r is Transaction => r !== undefined),
    emiAmountChanges: amountChanges,
    unusualRepayments: 0,
    calendar: H1_MONTHS.map((m) => ({
      month: m,
      auto: calendarCell(t, m, "auto-emi"),
      pl: calendarCell(t, m, "pl-emi"),
      card: calendarCell(t, m, "card"),
    })),
  };
}

export type CalendarCell =
  | { kind: "none" }
  | { kind: "paid"; day: number; full: boolean }
  | { kind: "returned_then_paid"; returnedDay: number; paidDay: number };

function calendarCell(t: readonly Transaction[], month: number, recurringId: string): CalendarCell {
  const rows = t.filter((x) => x.recurringId === recurringId && monthIndex(x.date) === month);
  const returned = rows.find((x) => x.ledgerEffect.kind === "excluded");
  const paid = rows.find((x) => isPosted(x));
  if (!paid) return { kind: "none" };
  if (returned)
    return {
      kind: "returned_then_paid",
      returnedDay: dayOfMonth(returned.date),
      paidDay: dayOfMonth(paid.date),
    };
  return { kind: "paid", day: dayOfMonth(paid.date), full: true };
}

/* ---------------- Transaction quality & consistency ---------------- */

export function transactionQuality(t: readonly Transaction[], lowConfidence = 0.85) {
  const total = t.length;
  const classified = t.filter(
    (x) => categoryGroup(x.category) !== "uncategorised" && x.categoryConfidence >= lowConfidence,
  ).length;
  const misc = t.filter((x) => x.category === "miscellaneous" || x.category === "unclassified").length;
  const duplicates = t.filter((x) => x.duplicateGroup !== null).length;
  const excluded = t.filter((x) => x.ledgerEffect.kind === "excluded").length;
  const extraction = mean(t.map((x) => x.extractionConfidence));
  return {
    total,
    classifiedShare: total ? classified / total : 0,
    miscShare: total ? misc / total : 0,
    duplicates,
    excludedRows: excluded,
    extractionConfidence: extraction,
  };
}

export function cardSpendGrowth(t: readonly Transaction[]): number {
  const card = monthlySum(
    t,
    H1_MONTHS,
    (x) => x.direction === "debit" && x.category === "credit_card_payment",
  );
  const first = card[0] ?? 0;
  const lastV = card[card.length - 1] ?? 0;
  return first ? lastV / first - 1 : 0;
}

/* ---------------- helpers ---------------- */

function mode(values: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0] ?? 0;
  let bestCount = 0;
  for (const [v, c] of counts) if (c > bestCount || (c === bestCount && v < best)) [best, bestCount] = [v, c];
  return best;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0] ?? "th"}`;
}

function monthShortOf(date: IsoDate | undefined): string {
  if (!date) return "";
  return (
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIndex(date)] ??
    ""
  );
}
