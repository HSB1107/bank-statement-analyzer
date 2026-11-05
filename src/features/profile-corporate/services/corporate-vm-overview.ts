import { available, notAvailable } from "@/shared/lib/availability";
import { monthShort } from "@/shared/lib/dates";
import { formatCroreValue, formatMoney, formatPercent } from "@/shared/lib/format";
import { money } from "@/shared/lib/money";
import { meridianAnalytics } from "@/shared/data/demo-profiles";
import { getMeridianDataset } from "@/shared/data/generators/meridian";
import { meridianInput } from "@/shared/data/meridian-input";
import {
  MERIDIAN_PREVIOUS_ASSESSMENT,
  SCM_CORP,
  workingCapitalScore,
} from "@/shared/data/scoring/corporate-model";
import { HEALTH_BAND_CUTOFFS, healthBandFor } from "@/shared/data/schemas/case";
import { collectionWeeks, detectRoundTrips } from "@/shared/data/selectors/corporate";
import { CorporateOverviewSchema, InflowAnalysisSchema } from "../schemas/corporate";

const cr = (minor: number) => `₹${formatCroreValue(money(minor))} cr`;
const M = (i: number) => monthShort(i);

export function corporateOverviewVm() {
  const { metrics: m, score } = meridianAnalytics();
  const cf = m.cash;
  const c = m.concentration;
  const od = m.od.status === "available" ? m.od : null;
  const trip = detectRoundTrips(meridianInput())[0];
  const leader = c.ranked[0];
  const dims = score.dimensions;
  const dim = (id: string) => dims.find((d) => d.id === id)?.score ?? 0;
  const prev = MERIDIAN_PREVIOUS_ASSESSMENT.radar;
  return CorporateOverviewSchema.parse({
    kpis: {
      receiptsProxy: money(cf.totals.receiptsProxy),
      operatingOutflows: money(cf.totals.opOut),
      netOperating: money(cf.totals.netOp),
      q1NetOperating: money(cf.totals.q1NetOp),
      q2NetOperating: money(cf.totals.q2NetOp),
      top3Share: c.top3Share,
      top3Names: c.ranked.slice(0, 3).map((r) => r.name.split(" ")[0] ?? r.name),
      odUtilJune: m.odUtilJune === null ? notAvailable("No OD") : available(m.odUtilJune),
      odLimit: od ? available(money(od.limitMinor)) : notAvailable("Limit unknown"),
      odPeak: od?.peak.utilisation ?? 0,
      debtServiceProxy: cf.debtServiceProxy,
    },
    health: {
      score: score.score,
      band: healthBandFor(score.score),
      previous: score.previousScore,
      previousPeriod: MERIDIAN_PREVIOUS_ASSESSMENT.period,
      cutoffs: Object.values(HEALTH_BAND_CUTOFFS),
      model: `${SCM_CORP.id} ${SCM_CORP.version}`,
      dimensions: dims.map((d) => ({
        label: d.label,
        score: d.score,
        delta: d.score - d.previous,
        weight: d.weight,
      })),
      modelConfidence: 0.81,
      completeness: m.coverage.completeness,
    },
    radar: {
      currentLabel: "Jan-Jun 26",
      previousLabel: MERIDIAN_PREVIOUS_ASSESSMENT.period,
      axes: [
        {
          id: "ocf",
          label: "Operating Cash Flow",
          current: dim("operatingCashFlow"),
          previous: prev.operatingCashFlow,
        },
        { id: "liq", label: "Liquidity", current: dim("liquidity"), previous: prev.liquidity },
        { id: "col", label: "Collections", current: dim("collectionStability"), previous: prev.collections },
        {
          id: "conc",
          label: "Counterparty Conc.",
          current: dim("concentration"),
          previous: prev.concentration,
        },
        { id: "debt", label: "Debt Servicing", current: dim("debtServicing"), previous: prev.debtServicing },
        {
          id: "txn",
          label: "Txn Consistency",
          current: dim("transactionIntegrity"),
          previous: prev.txnConsistency,
        },
        {
          id: "wc",
          label: "Working Capital",
          current: workingCapitalScore(m),
          previous: prev.workingCapital,
        },
      ],
    },
    summary: {
      headline:
        "Business inflows remain consistent, with strong collections from the top customer group. However, the accounts show elevated counterparty concentration and increasingly negative net operating cash flow in recent months.",
      citations: 17,
      confidence: 0.81,
      lines: [
        {
          provenance: "FACT",
          text: `Collections ${cr(cf.totals.receiptsProxy)} in H1 from ${c.payers} payers; Q2 ${cr(cf.totals.q2Collections)} vs Q1 ${cr(cf.totals.q1Collections)} (${formatPercent(m.collectionsQoQ)}).`,
        },
        {
          provenance: "DERIVED",
          text: `Top-3 customers ${formatPercent(c.top3Share)} of external inflows; ${leader?.name.replace(" Ltd", "") ?? ""} alone ${formatPercent(leader?.share ?? 0)}, and its receipts fell from ₹${((leader?.monthly[2] ?? 0) / 1e9).toFixed(1)} cr (Mar) to ₹${((leader?.monthly[5] ?? 0) / 1e9).toFixed(1)} cr (Jun).`,
        },
        {
          provenance: "DERIVED",
          text: `Net operating cash proxy negative in April (${formatMoney(money(cf.netOp[3] ?? 0), { scale: "crore" })}) and June (${formatMoney(money(cf.netOp[5] ?? 0), { scale: "crore" })}); OD drawn to ${formatPercent(m.odUtilJune ?? 0)} at June month-end, intra-month peak ${formatPercent(od?.peak.utilisation ?? 0, 0)}.`,
        },
        trip
          ? {
              provenance: "FACT",
              text: `${cr(trip.out.amount.amountMinor)} paid to ${trip.counterpartyName} on ${trip.out.date.slice(8)}-${M(Number(trip.out.date.slice(5, 7)) - 1)}; ${cr(trip.back.amount.amountMinor)} received back from the same party on ${trip.back.date.slice(8)}-${M(Number(trip.back.date.slice(5, 7)) - 1)}.`,
            }
          : { provenance: "FACT", text: "No round-trip detected." },
        {
          provenance: "AI",
          text: "Consistent with an OEM-driven slowdown in collections absorbed through the OD line. The K S Trading round-trip may be a related-party arrangement and should be explained before limits are renewed.",
        },
        {
          provenance: "INVESTIGATE",
          text: "Obtain Apex Motors ageing; confirm relationship with K S Trading Co; obtain SBI OD statement for April 2026.",
        },
      ],
    },
    concentration: {
      rows: [
        ...c.top.map((r) => ({ label: r.name, share: r.share })),
        { label: `Other customers (${c.rest.count})`, share: c.rest.share },
      ],
      hhi: c.hhi,
    },
    assessment: {
      strengths: [
        `Collections from ${c.payers} payers every month; no month below ₹${Math.floor(Math.min(...cf.opIn) / 1e9)} cr`,
        `Payroll (₹${(Math.min(...payroll()) / 1e9).toFixed(2)}–${(Math.max(...payroll()) / 1e9).toFixed(2)} cr) and statutory dues paid on schedule all 6 months`,
        "Term-loan EMI never missed; no cheque returns",
        "Clean reconciliation on both current accounts",
      ],
      concerns: [
        `Q2 collections ${formatPercent(m.collectionsQoQ)}; ${leader?.name.split(" ")[0] ?? ""} ${formatPercent(m.leaderQoQ, 0)} Q2 vs Q1`,
        `Net operating cash negative in ${m.negativeOpMonthsLast3} of last 3 months`,
        `OD reliance rising: ${formatPercent(od?.monthEnd[2]?.status === "available" ? od.monthEnd[2].value : 0)} → ${formatPercent(m.odUtilJune ?? 0)} month-end`,
        trip ? `Possible round-trip with ${trip.counterpartyName}` : "No round-trips",
      ],
      attention: [
        "Missing SBI OD statement for April",
        "Related-party check on K S Trading Co",
        `Reconcile bank receipts proxy with FY25 revenue (${formatMoney(getMeridianDataset().customer.declaredTurnover.amount, { scale: "crore", decimals: 1 })})`,
      ],
    },
  });
}

function payroll(): number[] {
  return [0, 1, 2, 3, 4, 5].map((m0) =>
    meridianInput()
      .transactions.filter((t) => t.category === "payroll" && Number(t.date.slice(5, 7)) - 1 === m0)
      .reduce((a, t) => a + t.amount.amountMinor, 0),
  );
}

export function inflowsVm() {
  const { metrics: m } = meridianAnalytics();
  const cf = m.cash;
  const c = m.concentration;
  const ds = getMeridianDataset();
  const loan = ds.transactions.find((t) => t.category === "loan_disbursement");
  const related = ds.transactions.find((t) => t.category === "related_party_receipt");
  const fxRows = ds.transactions.filter((t) => t.fx);
  const fxTotal = fxRows.reduce((a, t) => a + (t.fx?.original.amountMinor ?? 0), 0);
  const weeks = collectionWeeks(meridianInput());
  const months = [0, 1, 2, 3, 4, 5];
  const rows = c.top;
  let cum = 0;
  const conRows: {
    rank: number | null;
    label: string;
    fx: string | null;
    monthly: ReturnType<typeof money>[];
    total: ReturnType<typeof money>;
    share: number;
    cumulative: number;
  }[] = rows.map((r, i) => {
    cum += r.share;
    return {
      rank: i + 1,
      label: r.name,
      fx: fxRows.some((t) => t.counterparty.id === r.id) ? "EUR→INR" : null,
      monthly: r.monthly.map((v) => money(v)),
      total: money(r.totalMinor),
      share: r.share,
      cumulative: cum,
    };
  });
  conRows.push({
    rank: null,
    label: `Other customers (${c.rest.count})`,
    fx: null,
    monthly: c.rest.monthly.map((v) => money(v)),
    total: money(c.rest.totalMinor),
    share: c.rest.share,
    cumulative: 1,
  });
  const leader = c.ranked[0];
  const juneVsPeak = (cf.opIn[5] ?? 0) / Math.max(...cf.opIn) - 1;
  return InflowAnalysisSchema.parse({
    kpis: {
      grossCredits: money(cf.totals.grossCredits),
      ownTransfers: money(cf.totals.ownTransfers),
      pairs: cf.ownTransferPairs,
      loanProceeds: money(cf.totals.loanProceeds),
      loanNote: loan ? `HDFC term loan · ${loan.date.slice(8)}-${M(Number(loan.date.slice(5, 7)) - 1)}` : "—",
      relatedParty: money(cf.totals.relatedPartyReceipt),
      relatedNote: related ? `${related.counterparty.name.replace(" Co", "")} · under review` : "—",
      receiptsProxy: money(cf.totals.receiptsProxy),
      payers: c.payers,
      recurringPayers: c.recurringPayers,
      oneOffPayers: c.oneOffPayers,
    },
    trend: months.map((k) => ({
      month: `${M(k)} 26`,
      collections: money(cf.opIn[k] ?? 0),
      termLoan: money(cf.finIn[k] ?? 0),
      relatedParty: money(cf.relIn[k] ?? 0),
      ownTransfers: money(cf.ownByMonth[k] ?? 0),
      total: money(cf.grossByMonth[k] ?? 0),
    })),
    quarters: {
      q1: money(cf.totals.q1Collections),
      q2: money(cf.totals.q2Collections),
      change: m.collectionsQoQ,
    },
    methodology: {
      id: "BSA-MET-RP-01",
      rows: [
        { label: "Gross credits (3 accounts)", amount: money(cf.totals.grossCredits), sign: "base" },
        { label: "Own-account transfers", amount: money(cf.totals.ownTransfers), sign: "minus" },
        { label: "Term-loan disbursement", amount: money(cf.totals.loanProceeds), sign: "minus" },
        {
          label: "Possible related-party receipt",
          amount: money(cf.totals.relatedPartyReceipt),
          sign: "minus",
        },
        { label: "Reversals / refunds", amount: money(cf.totals.reversals), sign: "minus" },
        { label: "Business receipts proxy", amount: money(cf.totals.receiptsProxy), sign: "result" },
      ],
      annualised: money(cf.totals.receiptsProxy * 2),
      fyRevenue: ds.customer.declaredTurnover.amount,
      fyLabel: `${ds.customer.declaredTurnover.fiscalYear} revenue (${ds.customer.linkedFsaCase})`,
    },
    concentration: {
      months: months.map((k) => M(k).toUpperCase()),
      rows: conRows,
      top3: c.top3Share,
      top5: c.top5Share,
    },
    fxNote: `Kestrel Brakes pays in EUR (€${(fxTotal / 100 / 1e6).toFixed(2)} M in H1). Converted at RBI reference rate on value date; original EUR amount, rate and date are kept on each transaction. Balances are never summed across currencies before conversion.`,
    resolutionNote: `${m.quality.counterparties} counterparties after merging ${m.quality.aliases} aliases (e.g. “APEX MOTORS LTD/RTGS”, “APEX MOTORS LIMITED”, “APEXMOTORS”). Counterparty-ID confidence ${formatPercent(m.quality.counterpartyConfidence)}, reported separately from classification confidence.`,
    trendSeries: months.map((k) => ({
      month: M(k),
      top3: c.top3ShareByMonth[k] ?? 0,
      leader: c.leaderShareByMonth[k] ?? 0,
    })),
    alertThreshold: 0.6,
    alertId: "RI-CORP-07",
    consistency: [
      {
        label: "Regularity of inflows",
        detail: `Collections in all ${weeks.withCollections} weeks; ${leader?.name.split(" ")[0] ?? ""} pays every month`,
        tone: "positive",
      },
      {
        label: "Paying counterparties",
        detail: `${c.payers} in H1 · ${c.recurringPayers} recurring (≥ 3 months)`,
        tone: "positive",
      },
      {
        label: "Collection concentration",
        detail: `Top-3 ${formatPercent(c.top3Share)} · top-5 ${formatPercent(c.top5Share)} · HHI ${c.hhi.toFixed(2)}`,
        tone: "negative",
      },
      {
        label: "Significant decline",
        detail: `June ${cr(cf.opIn[5] ?? 0)} — lowest month, ${formatPercent(juneVsPeak)} vs March peak`,
        tone: "warning",
      },
      {
        label: "Largest customer trend",
        detail: `${leader?.name.split(" ")[0] ?? ""} receipts ${formatPercent(m.leaderQoQ)} Q2 vs Q1; share ${formatPercent(m.leaderShareQ1)} → ${formatPercent(m.leaderShareQ2)}`,
        tone: "warning",
      },
      {
        label: "Seasonality",
        detail: "March peak consistent with year-end OEM settlements",
        tone: "neutral",
      },
    ],
  });
}
