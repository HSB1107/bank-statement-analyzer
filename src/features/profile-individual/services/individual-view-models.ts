import { formatDayMonth, monthShort } from "@/shared/lib/dates";
import { formatMoney, formatPercent } from "@/shared/lib/format";
import { money } from "@/shared/lib/money";
import { arjunAnalytics } from "@/shared/data/demo-profiles";
import {
  ARJUN_PREVIOUS_ASSESSMENT,
  INCOME_STABILITY_RULES,
  liquiditySubScores,
  LIQUIDITY_RULES,
  SCM_RTL,
} from "@/shared/data/scoring/individual-model";
import { HEALTH_BAND_CUTOFFS, healthBandFor } from "@/shared/data/schemas/case";
import { signalsForCase } from "@/shared/data/signals";
import {
  IncomeAnalysisSchema,
  IndividualOverviewSchema,
  LiquidityAnalysisSchema,
  ObligationsAnalysisSchema,
} from "../schemas/individual";

/** Pure builders: computed metrics → view models (what an API would return). */
const inr = (minor: number) => money(Math.round(minor));
const fmt = (minor: number, scale: "full" | "lakh" = "full") => formatMoney(inr(minor), { scale });
const M = (i: number) => monthShort(i);

export function overviewVm() {
  const { input, metrics: m, score } = arjunAnalytics();
  const health = score.score;
  const band = healthBandFor(health);
  const prevAxes = ARJUN_PREVIOUS_ASSESSMENT.radar;
  const dim = (id: string) => score.dimensions.find((d) => d.id === id)?.score ?? 0;
  const lq = liquiditySubScores(m);
  const lower =
    health -
    (band === "healthy"
      ? HEALTH_BAND_CUTOFFS.healthy
      : band === "watchlist"
        ? HEALTH_BAND_CUTOFFS.watchlist
        : HEALTH_BAND_CUTOFFS.weak);
  const salary = m.income.salaryByMonth;
  const loanTxn = input.transactions.find((t) => t.category === "loan_disbursement");
  const oneOff = m.cash.oneOffs[0];
  const returned = m.obligations.servicing.failedAutoDebits[0];
  const reEmi = m.obligations.servicing.delayedEmis[0];
  const hdfcClosing = m.liquidity.perAccount.find((a) => a.account.bank === "HDFC")?.closingMinor ?? 0;
  const iciciClosing = m.liquidity.perAccount.find((a) => a.account.bank === "ICICI")?.closingMinor ?? 0;
  const lines = [
    {
      provenance: "FACT" as const,
      text: `Salary from ${m.income.employerName} credited in all ${m.income.salaryCreditCount} months; ${fmt(salary[0] ?? 0)} → ${fmt(salary[5] ?? 0)} from ${["January", "February", "March", "April", "May", "June"][m.income.revisionMonth] ?? ""}.`,
    },
    {
      provenance: "DERIVED" as const,
      text: `Expense-to-income rose from ${formatPercent(m.cash.expenseRatios[0] ?? 0)} to ${formatPercent(m.cash.expenseRatios[5] ?? 0)}; net cash flow negative in May (${formatMoney(inr(m.cash.netByMonth[4] ?? 0))}) and June (${formatMoney(inr(m.cash.netByMonth[5] ?? 0))}).`,
    },
    loanTxn && oneOff
      ? {
          provenance: "FACT" as const,
          text: `New HDFC personal loan ${fmt(loanTxn.amount.amountMinor)} disbursed ${formatDayMonth(loanTxn.date)}; ${fmt(oneOff.amount.amountMinor)} paid out two days later (home furnishing).`,
        }
      : null,
    returned && reEmi
      ? {
          provenance: "FACT" as const,
          text: `ACH auto-loan EMI returned unpaid on ${formatDayMonth(returned.date)} (insufficient funds); re-presented and cleared ${formatDayMonth(reEmi.date)}.`,
        }
      : null,
    {
      provenance: "AI" as const,
      text: `Pattern is consistent with higher committed outflows after the April loan rather than income stress. June close of ${fmt(iciciClosing)} in the salary account puts the 05-Jul EMI at risk unless funds move from HDFC.`,
    },
    {
      provenance: "INVESTIGATE" as const,
      text: `Confirm purpose of the ${oneOff ? fmt(oneOff.amount.amountMinor, "lakh") : "—"} payment and whether the HDFC balance (${fmt(hdfcClosing, "lakh")}) is available for servicing.`,
    },
  ].filter((x): x is { provenance: "FACT" | "DERIVED" | "AI" | "INVESTIGATE"; text: string } => x !== null);
  return IndividualOverviewSchema.parse({
    kpis: {
      avgMonthlyIncome: inr(m.income.avgMonthlyIncomeMinor),
      avgMonthlyOutflow: inr(m.cash.avgMonthlyOutflowMinor),
      expenseToIncome: m.cash.expenseToIncome,
      expenseToIncomeFirst: m.cash.expenseRatios[0] ?? 0,
      expenseToIncomeLast: m.cash.expenseRatios[5] ?? 0,
      foir: m.obligations.foirLatest,
      policyFoir: input.policyFoir,
      avgDailyBalance: inr(m.liquidity.avgDailyBalanceMinor),
      days: m.liquidity.consolidated.length,
      primaryLow: inr(m.liquidity.primaryLow.balanceMinor),
      primaryLowDate: m.liquidity.primaryLow.date,
      primaryAccount: input.accounts.find((a) => a.id === input.primaryAccountId)?.label ?? "",
    },
    health: {
      score: health,
      band,
      bandPosition: lower < 5 ? "lower" : lower > 10 ? "upper" : "mid",
      previous: score.previousScore,
      previousPeriod: ARJUN_PREVIOUS_ASSESSMENT.period,
      cutoffs: Object.values(HEALTH_BAND_CUTOFFS),
      model: `${SCM_RTL.id} ${SCM_RTL.version}`,
      modelConfidence: 0.86,
      dataCompleteness: 1,
      extractionConfidence: m.quality.extractionConfidence,
      classificationConfidence: m.quality.classifiedShare,
    },
    radar: {
      currentLabel: "Jan-Jun 26",
      previousLabel: ARJUN_PREVIOUS_ASSESSMENT.period,
      axes: [
        {
          id: "incomeStability",
          label: "Income Stability",
          current: dim("incomeStability"),
          previous: prevAxes.incomeStability,
        },
        { id: "liquidity", label: "Liquidity", current: dim("liquidity"), previous: prevAxes.liquidity },
        { id: "cashFlow", label: "Cash Flow", current: dim("cashFlow"), previous: prevAxes.cashFlow },
        {
          id: "debtCapacity",
          label: "Debt Capacity",
          current: dim("debtCapacity"),
          previous: prevAxes.debtCapacity,
        },
        {
          id: "balanceBehaviour",
          label: "Balance Behaviour",
          current: Math.round((lq.volatility + lq.lowBalance) / 2),
          previous: prevAxes.balanceBehaviour,
        },
        {
          id: "consistency",
          label: "Consistency",
          current: dim("consistency"),
          previous: prevAxes.consistency,
        },
      ],
    },
    summary: {
      headline:
        "Recurring salary credits provide a stable income base. However, primary-account balances are declining and identified debt obligations increased in May; liquidity buffers warrant monitoring.",
      citations: 11,
      confidence: 0.84,
      lines,
    },
    dimensions: score.dimensions.map((d) => ({
      id: d.id,
      label: d.label,
      weight: d.weight,
      score: d.score,
      delta: d.score - d.previous,
      positive: d.factors.find((f) => f.direction === "positive")?.text ?? "",
      negative: d.factors.find((f) => f.direction === "negative")?.text ?? "",
      confidence: d.confidence,
    })),
    formula: `Score = Σ dimension × weight = ${score.dimensions.map((d) => `${d.score}×${d.weight}`).join(" + ")} = ${health}. Health score, model confidence and extraction confidence are reported separately.`,
    strengths: [
      `Salary every month from one employer for the full period`,
      `Salary revised ${formatPercent(m.income.revisionPct, 1, "always")} in ${["January", "February", "March", "April", "May", "June"][m.income.revisionMonth] ?? ""}`,
      `Investments ${fmt(10_000_00)} SIP maintained all 6 months`,
      `Credit card settled in full each month (no revolving)`,
    ],
    concerns: [
      `Primary account depleted before EMI dates (May, Jun)`,
      `Expense-to-income now ~${Math.round((m.cash.expenseRatios[5] ?? 0) * 100)}%`,
      `New unsecured loan taken in April`,
    ],
    attention: [
      `Purpose of ${oneOff ? fmt(oneOff.amount.amountMinor, "lakh") : "—"} payment on ${oneOff ? formatDayMonth(oneOff.date) : "—"}`,
      `Card spend ${formatPercent(m.cardGrowth, 1, "always")} Jan → Jun`,
      `Ask customer to move EMI mandate or maintain buffer`,
    ],
  });
}

export function incomeVm() {
  const { metrics: m } = arjunAnalytics();
  const i = m.income;
  const months = [0, 1, 2, 3, 4, 5];
  const r = INCOME_STABILITY_RULES;
  const calendar = i.calendar;
  const delayed = i.delayedDetail;
  return IncomeAnalysisSchema.parse({
    kpis: {
      totalCredits: inr(i.totalCreditsMinor),
      ownTransfers: inr(i.ownTransfersInMinor),
      avgIncome: inr(i.avgMonthlyIncomeMinor),
      median: inr(i.medianMonthlyIncomeMinor),
      salaryTotal: inr(i.salaryTotalMinor),
      salaryCredits: i.salaryCreditCount,
      employers: i.employerCount,
      otherRecurring: inr(i.interestTotalMinor),
      nonRecurring: inr(i.nonRecurringTotalMinor),
      loan: inr(i.loanDisbursementMinor),
      growth: i.salaryGrowthQ1toQ2,
      volatility: i.salaryCv,
    },
    trend: months.map((k) => {
      const nonIncome = i.nonIncomeByMonth[k] ?? 0;
      const total = i.totalInflowsByMonth[k] ?? 0;
      const tax = k === 2 ? i.taxRefundMinor : 0;
      return {
        month: `${M(k)} 26`,
        salary: inr(i.salaryByMonth[k] ?? 0),
        otherRecurring: inr(i.interestByMonth[k] ?? 0),
        nonIncome: inr(nonIncome),
        total: inr(total),
        note:
          k === 3 && i.loanDisbursementMinor
            ? `${fmt(total, "lakh")} incl. ${fmt(i.loanDisbursementMinor, "lakh")} loan`
            : tax
              ? `${fmt(total, "lakh")} incl. ₹${(tax / 100_000).toFixed(1)}k tax refund`
              : null,
      };
    }),
    trendNote: `Not every credit is income: the ${fmt(i.loanDisbursementMinor, "lakh")} HDFC personal-loan disbursement and ${fmt(i.ownTransfersInMinor / 6)} monthly own-account transfers are excluded; the tax refund is one-off and excluded from average income.`,
    distribution: i.distribution.map((d) => ({
      id: d.id,
      label:
        {
          salary: "Salary",
          interest: "Interest income",
          loan: "Loan disbursement",
          tax_refund: "Tax refund",
        }[d.id] ?? d.id,
      amount: inr(d.amountMinor),
      share: d.share,
      nature: d.nature,
    })),
    distributionTotal: inr(i.totalCreditsMinor),
    notObserved: "Not observed: professional, business, rental or investment income.",
    salary: {
      rule: "detected by rule IR-SAL-01 · employer narration + monthly cadence ± 5 days",
      calendar: calendar.map((c) => ({
        month: M(c.month),
        amount: inr(c.amountMinor),
        day: c.day,
        status: c.status,
        delayDays: c.delayDays,
      })),
      facts: [
        { label: "Credit frequency", value: `Monthly · ${i.salaryCreditCount} / 6`, tone: "positive" },
        {
          label: "Typical credit date",
          value: i.typicalDays.map((d) => (d === 1 ? "1st" : d === 2 ? "2nd" : `${d}th`)).join(" – "),
          tone: "neutral",
        },
        { label: "Average salary", value: fmt(i.averageSalaryMinor), tone: "neutral" },
        { label: "Amount variability", value: `0% within band · ${i.revisions} revision`, tone: "positive" },
        { label: "Employer consistency", value: `${i.employerName} · 100%`, tone: "positive" },
        { label: "Missed salary periods", value: String(i.missedCount), tone: "positive" },
        {
          label: "Delayed credits",
          value: delayed ? `${i.delayedCount} · ${M(delayed.month)} (+${delayed.delayDays} days)` : "0",
          tone: i.delayedCount ? "warning" : "positive",
        },
        {
          label: "Change",
          value: `${formatPercent(i.revisionPct, 1, "always")} from ${M(i.revisionMonth)} 2026`,
          tone: "positive",
        },
      ],
    },
    stability: {
      score: SCM_RTL.dimensions[0]?.score(m) ?? 0,
      label: "Stable",
      model: `${r.id} ${r.version} · configurable`,
      note: `6 months observed (minimum ${r.minimumMonths} for a strong conclusion) · confidence 0.88`,
      items: [
        {
          label: "Recurring income periods",
          value: `${i.salaryCreditCount} of 6`,
          meter: i.salaryCreditCount / 6,
          tone: "positive",
        },
        {
          label: "Salary variation (CV)",
          value: formatPercent(i.salaryCv),
          meter: 1 - i.salaryCv,
          tone: "positive",
        },
        { label: "Missed expected credits", value: String(i.missedCount), meter: 1, tone: "positive" },
        {
          label: "Single-source dependence",
          value: `${formatPercent(i.singleSourceDependence)} of income`,
          meter: 0.55,
          tone: "warning",
        },
        {
          label: "Non-recurring inflow frequency",
          value: `${i.nonRecurringEvents} events · ${formatPercent(i.nonRecurringShareOfCredits)} of credits`,
          meter: 0.7,
          tone: "warning",
        },
        {
          label: "Delayed credits",
          value: `${i.delayedCount} of 6`,
          meter: 1 - i.delayedCount / 6,
          tone: "positive",
        },
      ],
      ai: `Strongly salaried profile. The single delayed credit (${delayed ? M(delayed.month) : "—"}, +${delayed?.delayDays ?? 0} days) is isolated — amount and employer unchanged — so on its own it does not indicate employer stress. Recheck if repeated.`,
    },
  });
}

export function liquidityVm() {
  const { input, metrics: m } = arjunAnalytics();
  const l = m.liquidity;
  const primary = l.perAccount.find((a) => a.account.id === input.primaryAccountId);
  const secondary = l.perAccount.find((a) => a.account.id !== input.primaryAccountId);
  const lq = liquiditySubScores(m);
  const sal = input.transactions.filter((t) => t.category === "salary");
  const loan = input.transactions.find((t) => t.category === "loan_disbursement");
  const oneOff = m.cash.oneOffs[0];
  const returned = m.obligations.servicing.failedAutoDebits[0];
  const closingPrimary = primary?.series.at(-1);
  return LiquidityAnalysisSchema.parse({
    kpis: {
      avgMonthlyBalance: inr(l.avgMonthlyBalanceMinor),
      avgDailyBalance: inr(l.avgDailyBalanceMinor),
      avgMonthEnd: inr(l.avgMonthEndMinor),
      min: inr(l.min.balanceMinor),
      max: inr(l.max.balanceMinor),
      closing: inr(l.closingMinor),
      lowBalanceDays: l.lowBalanceDays,
      lowBalanceRule: `${primary?.account.bank ?? ""} < ${fmt(input.lowBalanceThresholdMinor).replace(",000", "k").replace("₹10k", "₹10k")}`,
      negativeBalances: l.negativeBalanceDays,
      odFacility: l.hasOdFacility,
      bufferMonths: l.liquidityBufferMonths,
    },
    series: l.consolidated.map((p, k) => ({
      date: p.date,
      consolidated: inr(p.balanceMinor),
      primary: inr(primary?.series[k]?.balanceMinor ?? 0),
      secondary: inr(secondary?.series[k]?.balanceMinor ?? 0),
    })),
    seriesLabels: {
      primary: `${primary?.account.label ?? ""} (salary)`,
      secondary: secondary?.account.label ?? "",
    },
    markers: [
      ...sal.map((t) => ({
        date: t.date,
        label: "SAL",
        kind: "salary" as const,
        series: "primary" as const,
      })),
      ...(loan
        ? [
            {
              date: loan.date,
              label: `PL ${fmt(loan.amount.amountMinor, "lakh")} in`,
              kind: "loan" as const,
              series: "consolidated" as const,
            },
          ]
        : []),
      ...(oneOff
        ? [
            {
              date: oneOff.date,
              label: `${fmt(oneOff.amount.amountMinor, "lakh")} out`,
              kind: "major_payment" as const,
              series: "consolidated" as const,
            },
          ]
        : []),
      ...(returned
        ? [
            {
              date: returned.date,
              label: `ACH return · ${fmt(l.primaryLow.balanceMinor)}`,
              kind: "returned" as const,
              series: "primary" as const,
            },
          ]
        : []),
      ...(closingPrimary
        ? [
            {
              date: closingPrimary.date,
              label: fmt(closingPrimary.balanceMinor),
              kind: "closing" as const,
              series: "primary" as const,
            },
          ]
        : []),
    ],
    lowThreshold: inr(input.lowBalanceThresholdMinor),
    indicator: {
      score: Math.round(SCM_RTL.dimensions[1]?.score(m) ?? 0),
      label: "Watchlist",
      model: `${LIQUIDITY_RULES.id} ${LIQUIDITY_RULES.version}`,
      previous: ARJUN_PREVIOUS_ASSESSMENT.dimensions.liquidity,
      previousPeriod: ARJUN_PREVIOUS_ASSESSMENT.period,
      confidence: 0.9,
      items: [
        {
          label: "Average balance",
          detail: `ADB ${fmt(l.avgDailyBalanceMinor, "lakh")} vs ${fmt(m.cash.avgMonthlyOutflowMinor, "lakh")} avg monthly outflow`,
          score: lq.avgBalance,
        },
        {
          label: "Balance volatility",
          detail: `Salary a/c swings ${fmt(l.primaryLow.balanceMinor)} – ${fmt(l.primaryHigh.balanceMinor, "lakh")} within months`,
          score: lq.volatility,
        },
        {
          label: "Low-balance frequency",
          detail: `${l.lowBalanceDays} days in ${l.consolidated.length} · all salary a/c`,
          score: lq.lowBalance,
        },
        {
          label: "Recurring obligations",
          detail: `${fmt(m.obligations.committedJuneMinor, "lakh")} committed in June (rent, EMIs, card, utilities, SIP)`,
          score: lq.obligations,
        },
        {
          label: "Cash-flow consistency",
          detail: `Net positive ${m.cash.positiveMonths} / 6 months`,
          score: lq.consistency,
        },
        {
          label: "Liquidity buffer",
          detail: `${l.liquidityBufferMonths.toFixed(1)} months of outflows on hand`,
          score: lq.buffer,
        },
      ],
    },
    monthly: [0, 1, 2, 3, 4, 5].map((k) => ({
      month: M(k),
      inflow: inr(m.cash.inByMonth[k] ?? 0),
      outflow: inr(m.cash.outByMonth[k] ?? 0),
      net: inr(m.cash.netByMonth[k] ?? 0),
      monthEnd: inr(m.cash.monthEnd[k] ?? 0),
    })),
    totals: {
      inflow: inr(m.cash.totalInMinor),
      outflow: inr(m.cash.totalOutMinor),
      net: inr(m.cash.netMinor),
      margin: m.cash.cashFlowMargin,
      retention: m.cash.cashRetention,
      negativeMonths: m.cash.negativeMonths,
    },
    seasonality: "Seasonality: April spike = loan in / furnishing out; not recurring.",
  });
}

export function obligationsVm() {
  const { input, metrics: m } = arjunAnalytics();
  const o = m.obligations;
  const s = o.servicing;
  const returned = s.failedAutoDebits[0];
  const penalty = s.penaltyCharges[0];
  const delayed = s.delayedEmis[0];
  const newLoan = s.newLoanDeductions[0];
  const hdfc = m.liquidity.perAccount.find((a) => a.account.bank === "HDFC");
  const icici = m.liquidity.perAccount.find((a) => a.account.bank === "ICICI");
  const auto = o.recurring.find((r) => r.recurringId === "auto-emi");
  const pl = o.recurring.find((r) => r.recurringId === "pl-emi");
  return ObligationsAnalysisSchema.parse({
    foir: {
      month: "June 2026",
      value: o.foirLatest,
      policy: input.policyFoir,
      policyId: "PL-RTL-IN",
      within: o.foirLatest <= input.policyFoir,
      first: o.foirByMonth[0] ?? 0,
      numerator: inr(o.numeratorMinor),
      numeratorParts: `Auto EMI ${fmt(o.autoEmiMinor)} + PL EMI ${fmt(o.plEmiMinor)}`,
      denominator: inr(o.denominatorMinor),
      denominatorParts: `June salary ${fmt(o.salaryLatestMinor)} + interest ${fmt(o.interestLatestMinor)}`,
      cardAvg: inr(o.cardSettlementAvgMinor),
      fixedRatio: o.fixedObligationRatio,
    },
    trend: [0, 1, 2, 3, 4, 5].map((k) => ({
      month: M(k),
      foir: o.foirByMonth[k] ?? 0,
      emi: inr(o.emiByMonth[k] ?? 0),
      income: inr(o.incomeByMonth[k] ?? 0),
    })),
    headroom: inr(o.headroomMinor),
    maxNewEmi: inr(o.headroomMinor),
    committedInclRent: inr(o.committedInclRentMinor),
    recurring: o.recurring.map((r) => ({
      label: r.label,
      sublabel: r.recurringId === "insurance" ? `${fmt(r.avgMonthlyMinor * 12)} / yr ÷ 12` : r.sublabel,
      counterparty: r.counterparty,
      avgMonthly: inr(r.avgMonthlyMinor),
      frequency: r.frequency,
      lastPayment: r.lastPayment,
      regularity:
        r.recurringId === "pl-emi"
          ? `${r.onDate} of ${r.expected} · new from ${M(r.firstMonth)}`
          : r.recurringId === "card"
            ? `${r.onDate} of ${r.expected} · full`
            : `${r.onDate} of ${r.expected}${r.onDate < r.expected ? " on date" : ""}`,
      regularityTone: r.recurringId === "pl-emi" ? "info" : r.onDate < r.expected ? "warning" : "positive",
      confidence:
        {
          "auto-emi": 0.98,
          "pl-emi": 0.98,
          rent: 0.94,
          card: 0.99,
          utilities: 0.96,
          sip: 0.98,
          insurance: 0.97,
        }[r.recurringId] ?? 0.9,
      treatment: r.foirTreatment,
    })),
    recurringRule: `${o.recurring.length} obligations · rule pack RP-RTL v2.0 · counterparty + cadence ± 3 days + amount ± 10%`,
    servicing: [
      {
        label: "Failed auto-debit",
        count: s.failedAutoDebits.length,
        detail: returned
          ? `${formatDayMonth(returned.date)} · Axis auto loan · ACH return “insufficient funds”`
          : "none",
        provenance: "FACT",
      },
      {
        label: "Repeated penalty charges",
        count: s.penaltyCharges.length,
        detail: penalty
          ? `${fmt(penalty.amount.amountMinor)} ACH return charge · ${formatDayMonth(penalty.date)}`
          : "none",
        provenance: "FACT",
      },
      {
        label: "Delayed EMI",
        count: s.delayedEmis.length,
        detail: delayed
          ? `Auto EMI cleared ${formatDayMonth(delayed.date)} (+${Number(delayed.date.slice(8)) - 5} days) on re-presentment`
          : "none",
        provenance: "FACT",
      },
      {
        label: "New recurring loan deduction",
        count: s.newLoanDeductions.length,
        detail: newLoan
          ? `HDFC PL55203 · ${fmt(newLoan.amount.amountMinor)} from ${formatDayMonth(newLoan.date)}`
          : "none",
        provenance: "FACT",
      },
      {
        label: "Changes in EMI amount",
        count: s.emiAmountChanges,
        detail: `Auto EMI constant at ${fmt(auto?.avgMonthlyMinor ?? 0)}`,
        provenance: "FACT",
      },
      {
        label: "Unusual repayment pattern",
        count: s.unusualRepayments,
        detail: "no part-payments or prepayments seen",
        provenance: "DERIVED",
      },
    ],
    servicingAi:
      "The May return happened two days after rent left the salary account and before salary landed on 6 May. It reads as a timing mismatch, not inability to pay — the auto-loan mandate still debits the salary account on the 5th, so the same gap recurs whenever salary arrives late. The PL EMI debits HDFC, which is well funded.",
    calendar: s.calendar.map((c) => ({ month: M(c.month), cells: [c.auto, c.pl, c.card] })),
    calendarColumns: ["Auto EMI", "PL EMI", "Card"],
    nextDue: `Next due: 05-Jul auto EMI ${fmt(auto?.avgMonthlyMinor ?? 0)} + PL EMI ${fmt(pl?.avgMonthlyMinor ?? 0)} · salary a/c balance on 30-Jun ${fmt(icici?.closingMinor ?? 0)} · HDFC ${fmt(hdfc?.closingMinor ?? 0)}.`,
  });
}

export function arjunOpenSignals(): number {
  return signalsForCase("BSA-26-04417").filter(
    (s) => s.status !== "false_positive" && s.status !== "resolved",
  ).length;
}
