import { available, notAvailable } from "@/shared/lib/availability";
import { monthShort } from "@/shared/lib/dates";
import { formatCroreValue, formatPercent } from "@/shared/lib/format";
import { money } from "@/shared/lib/money";
import { meridianAnalytics } from "@/shared/data/demo-profiles";
import { meridianInput } from "@/shared/data/meridian-input";
import {
  cashFlow,
  detectRoundTrips,
  roundAmountTransfers,
  topOutgoing,
  waterfall,
} from "@/shared/data/selectors/corporate";
import { isOwnTransfer, isPosted } from "@/shared/data/selectors/ledger";
import { meridianSignals } from "@/shared/data/signals";
import { CorporateLiquiditySchema, FundFlowSchema } from "../schemas/corporate";

const M = (i: number) => monthShort(i);
const cr = (minor: number) => `₹${formatCroreValue(money(minor))} cr`;
const dm = (d: string) => `${d.slice(8)}-${M(Number(d.slice(5, 7)) - 1)}`;

export function corporateLiquidityVm() {
  const { metrics: m } = meridianAnalytics();
  const input = meridianInput();
  const b = m.bank;
  const od = m.od.status === "available" ? m.od : null;
  const cf = m.cash;
  const w = waterfall(input);
  const r = m.runway;
  const opening = input.accounts.reduce((a, acct) => {
    const first = input.transactions.find((t) => t.accountId === acct.id);
    return (
      a +
      (first
        ? first.balance.amountMinor -
          (first.direction === "credit" ? first.amount.amountMinor : -first.amount.amountMinor)
        : 0)
    );
  }, 0);
  const lowMonths = new Set(b.lowBalanceDates.map((d) => d.slice(5, 7)));
  const juneUtil = od?.monthEnd[5];
  const juneDrawn = od?.monthEndDrawn[5];
  const march = od?.monthEnd[2];
  const payrollFunding = input.transactions.find(
    (t) => t.category === "od_drawdown" && t.direction === "credit" && t.date === "2026-06-07",
  );
  return CorporateLiquiditySchema.parse({
    kpis: {
      avgBank: money(b.averageMinor),
      min: money(b.min.balanceMinor),
      minDate: b.min.date,
      max: money(b.max.balanceMinor),
      maxDate: b.max.date,
      closing: money(b.closingMinor),
      lowDays: b.lowBalanceDays,
      lowThreshold: money(input.lowBalanceThresholdMinor),
      lowAllInMonth: lowMonths.size === 1 ? M(Number([...lowMonths][0]) - 1) : null,
      negatives: b.negativeInstances,
      odJune: juneUtil ?? notAvailable("No OD facility"),
      odJuneDrawn: juneDrawn
        ? juneDrawn.status === "available"
          ? available(money(juneDrawn.value))
          : juneDrawn
        : notAvailable("No OD facility"),
      odLimit: od ? available(money(od.limitMinor)) : notAvailable("Limit unknown"),
      netCash: money(cf.totals.netCash),
      negativeNetMonths: cf.netCash.filter((v) => v < 0).length,
    },
    od: {
      account: od ? od.account.label.replace("SBI OD ", "SBI ") : "—",
      limitSource: od?.limitSource ?? null,
      series: od ? od.series.map((p) => ({ date: p.date, utilisation: p.utilisation })) : [],
      peak: { date: od?.peak.date ?? "2026-06-30", utilisation: od?.peak.utilisation ?? 0 },
      stress: 0.75,
      missingNote: "SBI Apr statement missing",
    },
    runway: {
      months: r.netBurnRunwayMonths,
      coverDays: r.grossCoverDays,
      available: money(r.availableLiquidityMinor),
      cash: money(r.cashMinor),
      undrawn: money(r.undrawnOdMinor),
      avgOutflow: money(Math.round(r.avgOperatingOutflowMinor)),
      burn: money(Math.round(r.netOperatingBurnMinor)),
    },
    waterfall: [
      { label: "Opening position", amount: money(opening), kind: "total" },
      { label: "Customer collections", amount: money(w.collections), kind: "in" },
      { label: "Suppliers", amount: money(w.suppliers), kind: "out" },
      { label: "Payroll", amount: money(w.payroll), kind: "out" },
      { label: "Statutory", amount: money(w.statutory), kind: "out" },
      { label: "Other opex", amount: money(w.otherOpex), kind: "out" },
      { label: "Term loan in", amount: money(w.termLoanIn), kind: "in" },
      { label: "Related party in", amount: money(w.relatedIn), kind: "in" },
      { label: "Debt service", amount: money(w.debtService), kind: "out" },
      { label: "Capex", amount: money(w.capex), kind: "out" },
      { label: "Related party out", amount: money(w.relatedOut), kind: "out" },
      { label: "Closing position", amount: money(opening + cf.totals.netCash), kind: "total" },
    ],
    stress: [
      {
        label: "Frequent cash depletion",
        detail: `Current-account balance below ${cr(input.lowBalanceThresholdMinor)} on ${b.lowBalanceDays} days${lowMonths.size === 1 ? `, all in ${["January", "February", "March", "April", "May", "June"][Number([...lowMonths][0]) - 1]}` : ""}`,
        tone: "warning",
      },
      {
        label: "Declining bank balances",
        detail: `Month-end ${cr(b.monthEnd[2] ?? 0)} (Mar) → ${cr(b.monthEnd[5] ?? 0)} (Jun), ${formatPercent((b.monthEnd[5] ?? 0) / (b.monthEnd[2] || 1) - 1)}`,
        tone: "negative",
      },
      {
        label: "Increasing OD utilisation",
        detail: `Month-end ${march?.status === "available" ? formatPercent(march.value) : "N/A"} (Mar) → ${juneUtil?.status === "available" ? formatPercent(juneUtil.value) : "N/A"} (Jun); peak ${formatPercent(od?.peak.utilisation ?? 0, 0)}`,
        tone: "negative",
      },
      {
        label: "Dependence on short-term borrowing",
        detail: payrollFunding
          ? `OD funded payroll on ${Number(payrollFunding.date.slice(8))}-${M(5)} (${cr(payrollFunding.amount.amountMinor)} transfer)`
          : "—",
        tone: "warning",
      },
      {
        label: "Low liquidity before payroll / statutory",
        detail: "Balances lowest on 6–8 and 19–21 of each month",
        tone: "warning",
      },
      {
        label: "Negative cash-flow months",
        detail: `${cf.netCash
          .map((v, i) => (v < 0 ? M(i) : null))
          .filter(Boolean)
          .join(", ")} (net cash) · ${cf.netOp
          .map((v, i) => (v < 0 ? M(i) : null))
          .filter(Boolean)
          .join(", ")} (operating)`,
        tone: "negative",
      },
    ],
    cashflow: {
      months: [0, 1, 2, 3, 4, 5].map((k) => M(k).toUpperCase()),
      rows: [
        {
          label: "Operating inflows",
          values: cf.opIn.map((v) => money(v)),
          total: money(cf.totals.opIn),
          emphasis: false,
        },
        {
          label: "Operating outflows",
          values: cf.opOut.map((v) => money(-v)),
          total: money(-cf.totals.opOut),
          emphasis: false,
        },
        {
          label: "Net operating",
          values: cf.netOp.map((v) => money(v)),
          total: money(cf.totals.netOp),
          emphasis: true,
        },
        {
          label: "Financing (net)",
          values: cf.financing.map((v) => money(v)),
          total: money(cf.totals.financing),
          emphasis: false,
        },
        {
          label: "Investing (capex)",
          values: cf.investing.map((v) => money(-v)),
          total: money(-cf.totals.investing),
          emphasis: false,
        },
        {
          label: "Related party (net)",
          values: cf.related.map((v) => money(v)),
          total: money(cf.totals.related),
          emphasis: false,
        },
        {
          label: "Net cash movement",
          values: cf.netCash.map((v) => money(v)),
          total: money(cf.totals.netCash),
          emphasis: true,
        },
      ],
      odMonthEnd: od ? od.monthEnd : [0, 1, 2, 3, 4, 5].map(() => notAvailable("No OD")),
      note: "April OD utilisation is Not Available because the SBI statement is missing. April flows cover ICICI and HDFC only and are flagged incomplete; nothing is estimated for SBI.",
    },
  });
}

export function fundFlowVm() {
  const { metrics: m } = meridianAnalytics();
  const input = meridianInput();
  const cf = cashFlow(input);
  const t = input.transactions.filter(isPosted);
  const trip = detectRoundTrips(input)[0];
  const c = m.concentration;
  const sup = m.suppliers;
  const out = topOutgoing(input, 8);
  const node = (
    id: string,
    label: string,
    kind: "own" | "customer" | "supplier" | "payroll" | "statutory" | "lender" | "flagged",
    inflow: number,
    outflow: number,
    share: string,
    hub: string,
  ) => ({ id, label, kind, inflow: money(inflow), outflow: money(outflow), share, hub });
  const others = c.rest;
  const supplierOthers = sup.ranked.slice(2);
  const lender = out.find((o) => o.kind === "lender");
  const payroll = out.find((o) => o.kind === "payroll");
  const statutory = out.find((o) => o.id === "GROUP-STATUTORY");
  const nodes = [
    node("own-icici", "ICICI", "own", 0, 0, "CA 3307", "icici"),
    node("own-hdfc", "HDFC", "own", 0, 0, "CA 5582", "hdfc"),
    node("own-sbi", "SBI", "own", 0, 0, "OD 0914", "sbi"),
    ...c.top
      .slice(0, 4)
      .map((r) =>
        node(
          r.id,
          r.name,
          "customer",
          r.totalMinor,
          0,
          `${formatPercent(r.share)}${r.channel.includes("EUR") ? " · EUR" : ""}`,
          r.channel.includes("RTGS") ? "icici" : "hdfc",
        ),
      ),
    node(
      "customers-rest",
      `${others.count + (c.top.length - 4)} other customers`,
      "customer",
      others.totalMinor + (c.top[4]?.totalMinor ?? 0),
      0,
      formatPercent(others.share + (c.top[4]?.share ?? 0)),
      "hdfc",
    ),
    ...sup.ranked
      .slice(0, 2)
      .map((s) =>
        node(
          s.id,
          s.name,
          "supplier",
          0,
          s.totalMinor,
          `${formatPercent(s.share)}${s === sup.ranked[0] ? " of suppliers" : ""}`,
          "hdfc",
        ),
      ),
    node(
      "suppliers-rest",
      `${supplierOthers.length} other suppliers`,
      "supplier",
      0,
      supplierOthers.reduce((a, s) => a + s.totalMinor, 0),
      formatPercent(supplierOthers.reduce((a, s) => a + s.share, 0)),
      "hdfc",
    ),
    ...(payroll
      ? [node(payroll.id, "Payroll · 412 staff", "payroll", 0, payroll.totalMinor, "monthly 7th", "icici")]
      : []),
    ...(statutory
      ? [node(statutory.id, "GSTN · CBDT · EPFO", "statutory", 0, statutory.totalMinor, "statutory", "hdfc")]
      : []),
    ...(lender
      ? [
          node(
            lender.id,
            lender.name,
            "lender",
            cf.totals.loanProceeds,
            lender.totalMinor,
            `in ${cr(cf.totals.loanProceeds)} · out ${cr(lender.totalMinor)}`,
            "icici",
          ),
        ]
      : []),
    ...(trip
      ? [
          node(
            trip.counterpartyId,
            trip.counterpartyName,
            "flagged",
            trip.back.amount.amountMinor,
            trip.out.amount.amountMinor,
            `out ${cr(trip.out.amount.amountMinor)} · in ${cr(trip.back.amount.amountMinor)}`,
            "icici",
          ),
        ]
      : []),
  ];
  const txnRow = (x: (typeof t)[number]) => ({
    id: x.id,
    date: x.date,
    narration: x.narration,
    source: `${x.accountId.includes("ICICI") ? "ICICI 3307" : x.accountId.includes("HDFC") ? "HDFC 5582" : "SBI 0914"}${x.source.page ? ` · p.${x.source.page}` : ""} · row ${x.source.row.toLocaleString("en-IN")}`,
    direction: x.direction,
    amount: x.amount,
  });
  const details: Record<string, unknown> = {};
  for (const n of nodes) {
    const rows = t.filter(
      (x) =>
        !isOwnTransfer(x) &&
        (x.counterparty.id === n.id || (n.id === "GROUP-STATUTORY" && x.counterparty.kind === "statutory")),
    );
    const first = rows[0];
    const isTrip = trip && n.id === trip.counterpartyId;
    details[n.id] = {
      title: n.label,
      badge: isTrip ? "Potential related party" : null,
      subtitle: first
        ? `First seen ${dm(first.date)}-2026 · ${rows.length.toLocaleString("en-IN")} transactions · counterparty-ID confidence ${(rows.reduce((a, x) => a + x.counterpartyConfidence, 0) / rows.length).toFixed(2)}`
        : n.kind === "own"
          ? "Own account"
          : "Grouped node",
      paidOut: money(
        rows.filter((x) => x.direction === "debit").reduce((a, x) => a + x.amount.amountMinor, 0),
      ),
      received: money(
        rows.filter((x) => x.direction === "credit").reduce((a, x) => a + x.amount.amountMinor, 0),
      ),
      triggering: (isTrip
        ? [trip.out, trip.back]
        : [...rows].sort((a, b) => b.amount.amountMinor - a.amount.amountMinor).slice(0, 2)
      ).map(txnRow),
      evidence: isTrip
        ? [
            `Funds return to a different own account (HDFC) ${trip.days} days later`,
            `${formatPercent(trip.returnedShare)} of outflow returned; no goods/services narration`,
            "Registered address = director's KYC address",
            "No GST invoice match in purchase register (if provided)",
          ]
        : [],
      ai: isTrip
        ? "Pattern matches round-tripping indicator RT-02 (out → return within 30 days, ≥ 90% of value, related-address match). This is a potential risk indicator requiring investigation, not a finding of wrongdoing."
        : null,
    };
  }
  const round = roundAmountTransfers(input, [3, 4, 5]);
  const signals = meridianSignals();
  const rt = signals.find((s) => s.id === "RS-C-04");
  return FundFlowSchema.parse({
    nodes,
    ownTransfers: money(cf.totals.ownTransfers),
    counterparties: m.quality.counterparties,
    shown: nodes.length - 3,
    groupedBelow: money(3_00_00_000_00),
    details,
    defaultSelection: trip?.counterpartyId ?? nodes[3]?.id ?? "",
    signals: [
      ...(trip
        ? [
            {
              severity: "critical",
              title: "Potential circular fund flow",
              detail: `ICICI → ${trip.counterpartyName} ${cr(trip.out.amount.amountMinor)} (${dm(trip.out.date)}) → HDFC ${cr(trip.back.amount.amountMinor)} (${dm(trip.back.date)}) · ${trip.days} days · ${formatPercent(trip.returnedShare, 0)} of amount returned`,
              action: "Obtain invoices / agreement; check director & shareholder links",
              confidence: rt?.aiConfidence ?? 0.84,
            },
          ]
        : []),
      {
        severity: "high",
        title: "Potential related-party transactions",
        detail:
          "K S Trading Co registered address matches director's residential address (KYC match) · first seen May 2026",
        action: "Confirm relationship; disclose under related-party policy",
        confidence: 0.78,
      },
      {
        severity: "high",
        title: "High customer concentration",
        detail: `Top-3 customers ${formatPercent(c.top3Share)} of external inflows; ${c.top[0]?.name.split(" ")[0] ?? ""} ${formatPercent(c.top[0]?.share ?? 0)}`,
        action: "Ageing and contract tenure for top-3",
        confidence: 1,
      },
      {
        severity: "medium",
        title: "High supplier concentration",
        detail: `${sup.ranked[0]?.name.split(" &")[0] ?? ""} ${formatPercent(sup.top1Share)} of supplier payments; top-2 ${formatPercent(sup.top2Share)}`,
        action: "Supply alternates; price pass-through terms",
        confidence: 1,
      },
      {
        severity: "medium",
        title: "Unusual round-amount transfers",
        detail: `${round.length} round-sum transfers ≥ ₹1.00 cr to non-trade counterparties in Q2`,
        action: "Review purpose of each transfer",
        confidence: 0.71,
      },
      {
        severity: "info",
        title: "Internal account transfers",
        detail: `${cf.ownTransferPairs} own-account pairs, ${cr(cf.totals.ownTransfers)}, matched within the same day — excluded from inflows`,
        action: "None",
        confidence: 0.99,
      },
    ],
    topIncoming: c.top.map((r) => ({
      label: r.name,
      channel: r.channel.replace("SWIFT · EUR", "SWIFT · EUR"),
      amount: money(r.totalMinor),
      share: r.share,
    })),
    topOutgoing: out.slice(0, 5).map((o) => ({
      label: o.name.replace("Payroll (412 employees)", "Payroll (412)"),
      pattern:
        o.kind === "payroll"
          ? "Bulk NEFT · 7th"
          : o.kind === "lender"
            ? "ACH · 5th"
            : o.id === "GROUP-STATUTORY"
              ? "Challan · 7th, 20th"
              : o.rows <= 24
                ? `NEFT · ${Math.round(o.rows / 6)}×/mo`
                : "NEFT · weekly",
      amount: money(o.totalMinor),
    })),
  });
}
