import { getMeridianDataset } from "./generators/meridian";
import { meridianInput } from "./meridian-input";
import { coverage, dataQuality, detectRoundTrips } from "./selectors/corporate";
import { getArjunDataset } from "./generators/arjun";
import { categoryGroup } from "./schemas/category";

export interface CaseException {
  tag: string;
  text: string;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June"] as const;

/** Exceptions raised by processing and routed to Transaction Validation (computed from the data). */
export function caseExceptions(caseId: string): CaseException[] {
  if (caseId === "BSA-26-04421") {
    const input = meridianInput();
    const q = dataQuality(input);
    const cov = coverage(input);
    const ds = getMeridianDataset();
    const sbi = ds.accounts.find((a) => a.type === "od_cc");
    const sbiRows = ds.transactions.filter((t) => t.accountId === sbi?.id);
    const missing = cov.grid.flatMap((g) =>
      g.months.map((m, i) => ({ g, m, i })).filter((x) => x.m === "missing"),
    );
    const gapMonth = missing[0]?.i;
    const gapBefore =
      gapMonth !== undefined
        ? sbiRows.filter((t) => Number(t.date.slice(5, 7)) - 1 < gapMonth).at(-1)
        : undefined;
    const gapAfter =
      gapMonth !== undefined ? sbiRows.find((t) => Number(t.date.slice(5, 7)) - 1 > gapMonth) : undefined;
    const openAfter = gapAfter
      ? gapAfter.balance.amountMinor -
        (gapAfter.direction === "credit" ? gapAfter.amount.amountMinor : -gapAfter.amount.amountMinor)
      : 0;
    const cr = (m: number) => `₹(${(Math.abs(m) / 1e9).toFixed(2)}) cr`;
    const trips = detectRoundTrips(input);
    return [
      { tag: "OCR", text: `SBI May p.3 · ${q.ocrBelow90} rows below 90% OCR confidence` },
      {
        tag: "DUPLICATE",
        text: `${q.duplicateRows} suspected duplicate debits · SBI 14-Mar · ₹${(q.duplicateAmountMinor / 1e9).toFixed(2)} cr`,
      },
      ...missing.map((x) => ({
        tag: "COVERAGE",
        text: `SBI OD ${MONTH_NAMES[x.i]} 2026 missing · balances N/A for ${MONTH_NAMES[x.i]}`,
      })),
      ...(gapBefore && gapAfter
        ? [
            {
              tag: "RECON",
              text: `SBI ${MONTH_NAMES[Number(gapBefore.date.slice(5, 7)) - 1]?.slice(0, 3)} close ${cr(gapBefore.balance.amountMinor)} ≠ ${MONTH_NAMES[Number(gapAfter.date.slice(5, 7)) - 1]?.slice(0, 3)} open ${cr(openAfter)} — gap month`,
            },
          ]
        : []),
      { tag: "CLASSIFY", text: `${q.lowConfidence} low-confidence categories (< 85%)` },
      { tag: "CPTY", text: `${trips.length + 1} counterparties match director names → related-party check` },
      { tag: "REVERSAL", text: "HDFC · receipt from a previously paid party → reconciliation warning" },
    ];
  }
  const t = getArjunDataset().transactions;
  const low = t.filter(
    (x) => x.categoryConfidence < 0.85 || categoryGroup(x.category) === "uncategorised",
  ).length;
  return [
    { tag: "CLASSIFY", text: `${low} low-confidence categories (< 85%)` },
    { tag: "RECON", text: "ACH return 05-May · row excluded from balances" },
  ];
}
