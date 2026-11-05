import { daysInMonth, isoDate, monthIndex, dayOfMonth } from "@/shared/lib/dates";
import { type DraftTxn } from "./ledger-builder";
import { cr, JUNE_OD, BANK_KNOTS, MONTH_END } from "./meridian-scenario";
import { workingDays } from "./meridian-externals";

/**
 * Re-dates flexible rows (other customers, other suppliers, opex) within their allowed windows so the
 * cumulative net position follows a target path. Without this, random timing produces ₹7 cr intra-month
 * swings that would force unrealistic daily treasury transfers.
 *
 * Target path per month: linear from 0 to the month's net, plus fixed lumps (term-loan proceeds, capex,
 * related-party and round-sum transfers) at their dates. June follows the PDF's stress shape: position falls
 * to the level implied by a 71% OD peak on 08-Jun, then recovers to the month-end.
 */

const YEAR = 2026;
const LUMP_KEYS = new Set(["HDFC-TL", "MAZAK", "RENISHAW", "KSTRADING", "ORION", "NAVKAR", "STERLING"]);

function isFlexible(t: DraftTxn): boolean {
  if (t.duplicateGroup !== null && t.duplicateGroup !== undefined) return false;
  const k = t.counterparty.key;
  return k.startsWith("CUST-") || k.startsWith("SUP-") || k.startsWith("OPX-");
}

function signed(t: DraftTxn): number {
  if (t.ledgerEffect && t.ledgerEffect.kind !== "posted") return 0;
  return t.direction === "credit" ? t.amountMinor : -t.amountMinor;
}

function windowFor(t: DraftTxn, m0: number, icici: string, hdfc: string, sbi: string): [number, number] {
  const last = daysInMonth(YEAR, m0 + 1);
  const day = dayOfMonth(t.date);
  if (t.accountId === icici && m0 === 4) return [1, 27];
  if (t.accountId === hdfc && m0 === 5) return day <= 10 ? [1, 10] : [11, last];
  // June: OD-funded supplier payments go out in the first week (the stress build-up).
  if (t.accountId === sbi && m0 === 5) return [1, 8];
  return [1, last];
}

export function smoothTiming(
  drafts: DraftTxn[],
  accounts: { icici: string; hdfc: string; sbi: string },
  openingPosition: number,
): void {
  let monthStart = openingPosition;
  for (let m0 = 0; m0 < 6; m0++) {
    const n = daysInMonth(YEAR, m0 + 1);
    const idx = drafts.map((t, i) => ({ t, i })).filter(({ t }) => monthIndex(t.date) === m0);
    const monthNet = idx.reduce((a, { t }) => a + signed(t), 0);
    const fixed = new Array<number>(n + 1).fill(0);
    const lumps = new Array<number>(n + 1).fill(0);
    const flex: { i: number; amount: number; window: [number, number] }[] = [];
    for (const { t, i } of idx) {
      if (isFlexible(t))
        flex.push({
          i,
          amount: signed(t),
          window: windowFor(t, m0, accounts.icici, accounts.hdfc, accounts.sbi),
        });
      else {
        const day = dayOfMonth(t.date);
        fixed[day] = (fixed[day] ?? 0) + signed(t);
        if (LUMP_KEYS.has(t.counterparty.key)) lumps[day] = (lumps[day] ?? 0) + signed(t);
      }
    }
    // Target path (month-relative cumulative net at end of day t).
    const lumpTotal = lumps.reduce((a, b) => a + b, 0);
    const target = new Array<number>(n + 1).fill(0);
    if (m0 === 5) {
      const peakPos = cr(
        (BANK_KNOTS[5]?.find(([day]) => day === JUNE_OD.peakDay)?.[1] ?? 0.42) - JUNE_OD.peakDrawn,
      );
      const endPos = cr((MONTH_END.icici[5] ?? 0) + (MONTH_END.hdfc[5] ?? 0) - (MONTH_END.sbiDrawn[5] ?? 0));
      const drop = peakPos - monthStart;
      const rise = endPos - monthStart;
      // Trough on the OD peak day; the payroll day sits just above it so the OD peaks on the 8th.
      const pk = JUNE_OD.peakDay;
      for (let t = 1; t <= n; t++) {
        if (t <= pk - 2) target[t] = (drop * 0.72 * t) / (pk - 2);
        else if (t === pk - 1) target[t] = drop + cr(0.1);
        else if (t === pk) target[t] = drop;
        else target[t] = drop + ((rise - drop) * (t - pk)) / (n - pk);
      }
    } else {
      let lumpCum = 0;
      for (let t = 1; t <= n; t++) {
        lumpCum += lumps[t] ?? 0;
        target[t] = ((monthNet - lumpTotal) * t) / n + lumpCum;
      }
    }
    // Greedy placement, largest amounts first, minimising squared deviation from target.
    const net = [...fixed];
    flex.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    const err = new Array<number>(n + 2).fill(0);
    const suffix = new Array<number>(n + 2).fill(0);
    const allowedDays = new Map<string, number[]>();
    for (const row of flex) {
      // Recompute error and suffix sums.
      let cum = 0;
      for (let t = 1; t <= n; t++) {
        cum += net[t] ?? 0;
        err[t] = cum - (target[t] ?? 0);
      }
      suffix[n + 1] = 0;
      for (let t = n; t >= 1; t--) suffix[t] = (suffix[t + 1] ?? 0) + (err[t] ?? 0);
      const key = `${row.window[0]}-${row.window[1]}`;
      let days = allowedDays.get(key);
      if (!days) {
        days = workingDays(m0, row.window[0], row.window[1]);
        allowedDays.set(key, days);
      }
      let bestDay = days[0] ?? 1;
      let bestCost = Number.POSITIVE_INFINITY;
      for (const day of days) {
        const cost = 2 * row.amount * (suffix[day] ?? 0) + row.amount * row.amount * (n - day + 1);
        if (cost < bestCost) {
          bestCost = cost;
          bestDay = day;
        }
      }
      net[bestDay] = (net[bestDay] ?? 0) + row.amount;
      const t = drafts[row.i];
      if (t) drafts[row.i] = { ...t, date: isoDate(YEAR, m0 + 1, bestDay) };
    }
    monthStart += monthNet;
  }
}
