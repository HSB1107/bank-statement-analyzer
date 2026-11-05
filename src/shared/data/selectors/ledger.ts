import { eachDay, monthIndex, type IsoDate } from "@/shared/lib/dates";
import { type AccountId } from "../schemas/ids";
import { categoryGroup } from "../schemas/category";
import { type Transaction } from "../schemas/transaction";

/** Pure ledger selectors shared by individual and corporate analytics. */

export function isPosted(t: Transaction): boolean {
  return t.ledgerEffect.kind === "posted";
}

/** Signed amount in minor units; excluded rows contribute zero. */
export function signedMinor(t: Transaction): number {
  if (!isPosted(t)) return 0;
  return t.direction === "credit" ? t.amount.amountMinor : -t.amount.amountMinor;
}

export function isOwnTransfer(t: Transaction): boolean {
  return categoryGroup(t.category) === "transfer";
}

export function sumMinor(txns: readonly Transaction[]): number {
  return txns.reduce((a, t) => a + (isPosted(t) ? t.amount.amountMinor : 0), 0);
}

export function byAccount(txns: readonly Transaction[], accountId: AccountId): Transaction[] {
  return txns.filter((t) => t.accountId === accountId);
}

export function accountIds(txns: readonly Transaction[]): AccountId[] {
  return [...new Set(txns.map((t) => t.accountId))];
}

/** Opening balance derived from the first statement row (balance column is a FACT). */
export function openingBalanceMinor(txns: readonly Transaction[], accountId: AccountId): number {
  const first = txns.find((t) => t.accountId === accountId);
  if (!first) return 0;
  return first.balance.amountMinor - signedMinor(first);
}

export function closingBalanceMinor(txns: readonly Transaction[], accountId: AccountId): number {
  let last: Transaction | undefined;
  for (const t of txns) if (t.accountId === accountId) last = t;
  return last ? last.balance.amountMinor : 0;
}

export interface EodPoint {
  date: IsoDate;
  balanceMinor: number;
}

/**
 * End-of-day balance per day for one account. Assumes `txns` are in statement order per account
 * (the ledger builder guarantees this). Days before the first row carry the opening balance.
 */
export function accountEod(
  txns: readonly Transaction[],
  accountId: AccountId,
  from: IsoDate,
  to: IsoDate,
): EodPoint[] {
  const rows = txns.filter((t) => t.accountId === accountId);
  const lastByDate = new Map<string, number>();
  for (const t of rows) lastByDate.set(t.date, t.balance.amountMinor);
  let current = openingBalanceMinor(txns, accountId);
  return eachDay(from, to).map((date) => {
    const v = lastByDate.get(date);
    if (v !== undefined) current = v;
    return { date, balanceMinor: current };
  });
}

/** Consolidated EOD across the given accounts (same currency only). */
export function consolidatedEod(
  txns: readonly Transaction[],
  from: IsoDate,
  to: IsoDate,
  accounts?: readonly AccountId[],
): EodPoint[] {
  const ids = accounts ?? accountIds(txns);
  const series = ids.map((id) => accountEod(txns, id, from, to));
  return eachDay(from, to).map((date, i) => ({
    date,
    balanceMinor: series.reduce((a, s) => a + (s[i]?.balanceMinor ?? 0), 0),
  }));
}

export function averageMinor(points: readonly EodPoint[]): number {
  if (points.length === 0) return 0;
  return points.reduce((a, p) => a + p.balanceMinor, 0) / points.length;
}

/** Group points by 0-based month index. */
export function pointsByMonth(points: readonly EodPoint[]): Map<number, EodPoint[]> {
  const out = new Map<number, EodPoint[]>();
  for (const p of points) {
    const m = monthIndex(p.date);
    const list = out.get(m) ?? [];
    list.push(p);
    out.set(m, list);
  }
  return out;
}

/** Sum of posted amounts per 0-based month for transactions matching `predicate`. */
export function monthlySum(
  txns: readonly Transaction[],
  months: readonly number[],
  predicate: (t: Transaction) => boolean,
): number[] {
  const totals = new Map<number, number>(months.map((m) => [m, 0]));
  for (const t of txns) {
    if (!isPosted(t) || !predicate(t)) continue;
    const m = monthIndex(t.date);
    if (totals.has(m)) totals.set(m, (totals.get(m) ?? 0) + t.amount.amountMinor);
  }
  return months.map((m) => totals.get(m) ?? 0);
}

export function median(values: readonly number[]): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}

export function mean(values: readonly number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** Population standard deviation / mean. */
export function coefficientOfVariation(values: readonly number[]): number {
  const m = mean(values);
  if (m === 0) return 0;
  const variance = mean(values.map((v) => (v - m) ** 2));
  return Math.sqrt(variance) / m;
}
