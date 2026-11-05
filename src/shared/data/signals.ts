import { formatCroreValue, formatMoney, formatPercent } from "@/shared/lib/format";
import { money } from "@/shared/lib/money";
import { arjunAnalytics, meridianAnalytics } from "./demo-profiles";
import { meridianInput } from "./meridian-input";
import { cashFlow, detectRoundTrips, roundAmountTransfers } from "./selectors/corporate";
import { type z } from "zod";
import { RiskSignalSchema, SEVERITY_RANK, type RiskSignal } from "./schemas/signal";

type SignalInput = z.input<typeof RiskSignalSchema>;
import { ROUND_TRIP_SIGNAL_ID } from "./signal-ids";

/**
 * Risk-signal catalogue produced by the detection rules (computed from the same metrics the
 * profile screens show). Initial statuses/owners reflect the underwriter's existing triage.
 */
const cr = (minor: number) => `₹${formatCroreValue(money(minor))} cr`;

export function meridianSignals(): RiskSignal[] {
  const { metrics: m } = meridianAnalytics();
  const input = meridianInput();
  const trip = detectRoundTrips(input)[0];
  const round = roundAmountTransfers(input, [3, 4, 5]);
  const cf = cashFlow(input);
  const od = m.od.status === "available" ? m.od : null;
  const util = (i: number) => {
    const u = od?.monthEnd[i];
    return u && u.status === "available" ? u.value : 0;
  };
  const sbiRows = input.transactions.filter((t) => t.accountId.includes("SBI")).length;
  const dupRows = input.transactions.filter((t) => t.duplicateGroup !== null);
  const opRows = input.transactions.filter((t) => ["04", "06"].includes(t.date.slice(5, 7))).length;
  const collectionsRows = input.transactions.filter(
    (t) =>
      t.direction === "credit" && t.category === "customer_collection" && Number(t.date.slice(5, 7)) >= 4,
  ).length;
  const signals: SignalInput[] = [
    {
      id: ROUND_TRIP_SIGNAL_ID,
      caseId: "BSA-26-04421",
      severity: "critical",
      title: "Potential circular fund movement",
      reportingCategory: "Corporate",
      lane: "fund_flow",
      periodLabel: trip
        ? `${trip.out.date.slice(8)}-${month(trip.out.date)} → ${trip.back.date.slice(8)}-${month(trip.back.date)}`
        : "—",
      evidenceCount: { status: "available", value: trip ? 2 : 0 },
      impact: trip
        ? `${cr(trip.out.amount.amountMinor)} out · ${cr(trip.back.amount.amountMinor)} back`
        : "—",
      impactMinor: trip?.out.amount.amountMinor ?? 0,
      aiConfidence: 0.84,
      detection: "Rule RT-02 + graph cycle",
      status: "investigate",
      owner: "P. Raman",
      explainability: trip
        ? [
            {
              title: "Observation",
              provenance: "AI",
              text: `Funds sent to ${trip.counterpartyName} returned to a different own account within ${trip.days} days.`,
            },
            {
              title: "Detection logic",
              provenance: "DERIVED",
              text: "RT-02: outflow to counterparty X, inflow from X within 30 days, ≥ 90% of value, X not a recurring trade party.",
            },
            {
              title: "Calculation",
              provenance: "DERIVED",
              text: `${cr(trip.back.amount.amountMinor)} ÷ ${cr(trip.out.amount.amountMinor)} = ${formatPercent(trip.returnedShare)} returned · Δt = ${trip.days} days`,
            },
            {
              title: "Transactions",
              provenance: "FACT",
              text: `ICICI ${trip.out.date.slice(8)}-${month(trip.out.date)} NEFT DR (${formatCroreValue(trip.out.amount)}) · HDFC ${trip.back.date.slice(8)}-${month(trip.back.date)} CHQ DEP ${formatCroreValue(trip.back.amount)}`,
            },
            {
              title: "Source",
              provenance: "FACT",
              text: `${trip.out.source.fileName} p.${trip.out.source.page ?? "—"} row ${trip.out.source.row.toLocaleString("en-IN")} · ${trip.back.source.fileName} row ${trip.back.source.row.toLocaleString("en-IN")}`,
            },
            {
              title: "Suggested investigation",
              provenance: "INVESTIGATE",
              text: "Agreement / invoices for the advance; KYC link to directors; related-party disclosure",
            },
          ]
        : [],
      linkedTransactionIds: trip ? [trip.out.id, trip.back.id] : [],
      timeline: [
        { month: 4, severity: "medium" },
        { month: 5, severity: "critical" },
      ],
    },
    {
      id: "RS-C-01",
      caseId: "BSA-26-04421",
      severity: "high",
      title: "Rising OD utilisation",
      reportingCategory: "Liquidity",
      lane: "liquidity",
      periodLabel: "Mar → Jun",
      evidenceCount: { status: "available", value: sbiRows },
      impact: `${formatPercent(util(2))} → ${formatPercent(util(5))} month-end · peak ${formatPercent(od?.peak.utilisation ?? 0, 0)}`,
      impactMinor: od ? od.peak.drawnMinor : 0,
      aiConfidence: 1,
      detection: "Threshold RI-LIQ-04",
      status: "open",
      owner: null,
      explainability: [],
      linkedTransactionIds: [],
      timeline: [
        { month: 2, severity: "low" },
        { month: 4, severity: "medium" },
        { month: 5, severity: "high" },
      ],
    },
    {
      id: "RS-C-02",
      caseId: "BSA-26-04421",
      severity: "high",
      title: "Negative operating cash-flow pattern",
      reportingCategory: "Corporate",
      lane: "cash_flow",
      periodLabel: cf.netOp
        .map((v, i) => (v < 0 ? month(`2026-${String(i + 1).padStart(2, "0")}-01`) : null))
        .filter(Boolean)
        .join(", "),
      evidenceCount: { status: "available", value: opRows },
      impact: `Q2 net operating ${formatMoney(money(cf.totals.q2NetOp), { scale: "crore" })}`,
      impactMinor: Math.abs(cf.totals.q2NetOp),
      aiConfidence: 1,
      detection: "Threshold RI-CF-02",
      status: "acknowledged",
      owner: "P. Raman",
      explainability: [],
      linkedTransactionIds: [],
      timeline: [
        { month: 3, severity: "high" },
        { month: 5, severity: "high" },
      ],
    },
    {
      id: "RS-C-03",
      caseId: "BSA-26-04421",
      severity: "high",
      title: "High customer concentration",
      reportingCategory: "Corporate",
      lane: "concentration",
      periodLabel: "H1",
      evidenceCount: { status: "available", value: m.quality.counterparties },
      impact: `Top-3 ${formatPercent(m.concentration.top3Share)} of inflows`,
      impactMinor: Math.round(m.concentration.totalMinor * m.concentration.top3Share),
      aiConfidence: 1,
      detection: "Threshold RI-CORP-07",
      status: "acknowledged",
      owner: null,
      explainability: [],
      linkedTransactionIds: [],
      timeline: [
        { month: 0, severity: "medium" },
        { month: 1, severity: "high" },
        { month: 3, severity: "high" },
        { month: 5, severity: "high" },
      ],
    },
    {
      id: "RS-C-05",
      caseId: "BSA-26-04421",
      severity: "medium",
      title: "Material decline in collections",
      reportingCategory: "Income",
      lane: "collections",
      periodLabel: "Q2 vs Q1",
      evidenceCount: { status: "available", value: collectionsRows },
      impact:
        `${cr(cf.totals.q1Collections)} → ${cr(cf.totals.q2Collections)} (${formatPercent(m.collectionsQoQ)})`.replace(
          / cr → ₹/,
          " → ₹",
        ),
      impactMinor: cf.totals.q1Collections - cf.totals.q2Collections,
      aiConfidence: 1,
      detection: "Trend RI-INC-03",
      status: "open",
      owner: null,
      explainability: [],
      linkedTransactionIds: [],
      timeline: [
        { month: 3, severity: "medium" },
        { month: 5, severity: "medium" },
      ],
    },
    {
      id: "RS-C-06",
      caseId: "BSA-26-04421",
      severity: "medium",
      title: "Suspected duplicate debits",
      reportingCategory: "Integrity",
      lane: "integrity",
      periodLabel: dupRows[0] ? `${dupRows[0].date.slice(8)}-${month(dupRows[0].date)}` : "—",
      evidenceCount: { status: "available", value: dupRows.length },
      impact: `${cr(dupRows.reduce((a, t) => a + t.amount.amountMinor, 0))} · same UTR, SBI OD`,
      impactMinor: dupRows.reduce((a, t) => a + t.amount.amountMinor, 0),
      aiConfidence: 0.93,
      detection: "Rule TI-DUP-01",
      status: "resolved",
      owner: "S. Menon",
      explainability: [],
      linkedTransactionIds: dupRows.map((t) => t.id),
      timeline: [{ month: 2, severity: "medium" }],
    },
    {
      id: "RS-C-07",
      caseId: "BSA-26-04421",
      severity: "medium",
      title: "Missing statement period",
      reportingCategory: "Integrity",
      lane: "integrity",
      periodLabel: "Apr 26",
      evidenceCount: { status: "not_available", reason: "No rows — statement not uploaded" },
      impact: "SBI OD · OD metrics N/A for April",
      impactMinor: 0,
      aiConfidence: 1,
      detection: "Coverage TI-COV-01",
      status: "investigate",
      owner: "P. Raman",
      explainability: [],
      linkedTransactionIds: [],
      timeline: [{ month: 3, severity: "medium" }],
    },
    {
      id: "RS-C-08",
      caseId: "BSA-26-04421",
      severity: "low",
      title: "Unusual round-amount transfers",
      reportingCategory: "Corporate",
      lane: "fund_flow",
      periodLabel: "Q2",
      evidenceCount: { status: "available", value: round.length },
      impact: `${cr(round.reduce((a, t) => a + t.amount.amountMinor, 0))} total to non-trade parties`,
      impactMinor: round.reduce((a, t) => a + t.amount.amountMinor, 0),
      aiConfidence: 0.71,
      detection: "Model AD-RND v1.1",
      status: "false_positive",
      owner: "S. Menon",
      explainability: [],
      linkedTransactionIds: round.map((t) => t.id),
      timeline: [],
    },
  ];
  return rank(signals);
}

export function arjunSignals(): RiskSignal[] {
  const { metrics: m } = arjunAnalytics();
  const s = m.obligations.servicing;
  const oneOff = m.cash.oneOffs[0];
  const signals: SignalInput[] = [
    {
      id: "RS-R-01",
      caseId: "BSA-26-04417",
      severity: "high",
      title: "Salary account depleted before EMI dates",
      reportingCategory: "Liquidity",
      lane: "liquidity",
      periodLabel: "May, Jun",
      evidenceCount: { status: "available", value: m.liquidity.lowBalanceDays },
      impact: `Low ${formatMoney(money(m.liquidity.primaryLow.balanceMinor))} on ${m.liquidity.primaryLow.date.slice(8)}-${month(m.liquidity.primaryLow.date)}`,
      impactMinor: m.obligations.numeratorMinor,
      aiConfidence: 0.92,
      detection: "Threshold RI-RLQ-02",
      status: "open",
      owner: null,
      explainability: [],
      linkedTransactionIds: [],
      timeline: [
        { month: 4, severity: "high" },
        { month: 5, severity: "high" },
      ],
    },
    {
      id: "RS-R-02",
      caseId: "BSA-26-04417",
      severity: "medium",
      title: "Returned auto-debit (ACH)",
      reportingCategory: "Debt",
      lane: "debt",
      periodLabel: s.failedAutoDebits[0]
        ? `${s.failedAutoDebits[0].date.slice(8)}-${month(s.failedAutoDebits[0].date)}`
        : "—",
      evidenceCount: { status: "available", value: s.failedAutoDebits.length + s.penaltyCharges.length },
      impact: `EMI ${formatMoney(s.failedAutoDebits[0]?.amount ?? money(0))} returned · cleared on re-presentment`,
      impactMinor: s.failedAutoDebits[0]?.amount.amountMinor ?? 0,
      aiConfidence: 1,
      detection: "Rule RD-ACH-01",
      status: "open",
      owner: null,
      explainability: [],
      linkedTransactionIds: s.failedAutoDebits.map((t) => t.id),
      timeline: [{ month: 4, severity: "medium" }],
    },
    {
      id: "RS-R-03",
      caseId: "BSA-26-04417",
      severity: "medium",
      title: "New unsecured loan followed by large outflow",
      reportingCategory: "Debt",
      lane: "debt",
      periodLabel: "18-Apr → 20-Apr",
      evidenceCount: { status: "available", value: 2 },
      impact: `${formatMoney(money(m.income.loanDisbursementMinor), { scale: "lakh" })} in · ${oneOff ? formatMoney(oneOff.amount, { scale: "lakh" }) : "—"} out`,
      impactMinor: m.income.loanDisbursementMinor,
      aiConfidence: 0.88,
      detection: "Rule RD-LN-03",
      status: "open",
      owner: null,
      explainability: [],
      linkedTransactionIds: oneOff ? [oneOff.id] : [],
      timeline: [{ month: 3, severity: "medium" }],
    },
    {
      id: "RS-R-04",
      caseId: "BSA-26-04417",
      severity: "medium",
      title: "Expense-to-income approaching 100%",
      reportingCategory: "Income",
      lane: "cash_flow",
      periodLabel: "Jan → Jun",
      evidenceCount: { status: "available", value: 6 },
      impact: `${formatPercent(m.cash.expenseRatios[0] ?? 0)} → ${formatPercent(m.cash.expenseRatios[5] ?? 0)}`,
      impactMinor: Math.abs(m.cash.netByMonth[5] ?? 0),
      aiConfidence: 1,
      detection: "Trend RI-EXP-01",
      status: "open",
      owner: null,
      explainability: [],
      linkedTransactionIds: [],
      timeline: [
        { month: 2, severity: "low" },
        { month: 4, severity: "medium" },
        { month: 5, severity: "medium" },
      ],
    },
  ];
  return rank(signals);
}

function rank(signals: SignalInput[]): RiskSignal[] {
  // Severity first; within a severity the detection catalogue order (signal id) is kept, as on screen 11.
  return signals
    .map((s) => RiskSignalSchema.parse(s))
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.id.localeCompare(b.id));
}

function month(date: string): string {
  return (
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
      Number(date.slice(5, 7)) - 1
    ] ?? ""
  );
}

export function signalsForCase(caseId: string): RiskSignal[] {
  if (caseId === "BSA-26-04421") return meridianSignals();
  if (caseId === "BSA-26-04417") return arjunSignals();
  return [];
}
