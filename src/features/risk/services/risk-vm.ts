import { available, notAvailable } from "@/shared/lib/availability";
import { monthShort } from "@/shared/lib/dates";
import { formatCount } from "@/shared/lib/format";
import { type AuditLog } from "@/shared/data/audit-log";
import { arjunAnalytics, meridianAnalytics } from "@/shared/data/demo-profiles";
import { type CaseId } from "@/shared/data/schemas/ids";
import {
  SEVERITY_RANK,
  SeveritySchema,
  SignalCategorySchema,
  type RiskSignal,
  type Severity,
  type SignalCategory,
  type SignalStatus,
} from "@/shared/data/schemas/signal";
import { signalsForCase } from "@/shared/data/signals";
import {
  RiskWorkspaceSchema,
  type ConfidenceTile,
  type RiskWorkspace,
  type SignalView,
} from "../schemas/risk";

export const MERIDIAN_CASE = "BSA-26-04421";
export const ARJUN_CASE = "BSA-26-04417";

/** Mutable triage state layered over the computed signal catalogue. */
export interface TriageState {
  status: SignalStatus;
  owner: string | null;
}

const LANE_LABEL: Readonly<Record<SignalCategory, string>> = {
  liquidity: "Liquidity",
  cash_flow: "Cash flow",
  concentration: "Concentration",
  collections: "Collections",
  fund_flow: "Fund flow",
  integrity: "Integrity",
  income: "Income",
  debt: "Debt",
  corporate: "Corporate",
};

const REPORTING_ORDER = ["Income", "Liquidity", "Debt", "Corporate", "Integrity"] as const;

/** Rule-pack sizes (rules evaluated per case). Meridian's 31 is from screen 11; Arjun's retail pack is 24. */
const RULES_EVALUATED: Readonly<Record<string, number>> = { [MERIDIAN_CASE]: 31, [ARJUN_CASE]: 24 };

/** "Open" in the By Category panel = still being worked (open or under investigation). */
const isOpen = (s: SignalStatus) => s === "open" || s === "investigate";

export function caseSignals(caseId: CaseId): RiskSignal[] {
  const list = signalsForCase(caseId);
  if (list.length === 0) throw new Error(`Risk signals for ${caseId} are coming in Pass 2.`);
  return list;
}

/** When a rule ships no authored path, build one from the signal's own fields, labelled as such. */
function explain(s: RiskSignal): { steps: RiskSignal["explainability"]; derived: boolean } {
  if (s.explainability.length) return { steps: s.explainability, derived: false };
  const evidence =
    s.evidenceCount.status === "available"
      ? `${formatCount(s.evidenceCount.value)} supporting transactions in ${s.periodLabel}`
      : `Evidence not available — ${s.evidenceCount.reason}`;
  return {
    derived: true,
    steps: [
      { title: "Observation", provenance: "DERIVED", text: `${s.title}: ${s.impact}.` },
      { title: "Detection logic", provenance: "DERIVED", text: s.detection },
      { title: "Transactions", provenance: "FACT", text: evidence },
      {
        title: "Suggested investigation",
        provenance: "INVESTIGATE",
        text: "Review the linked transactions and confirm the pattern with the customer before relying on it.",
      },
    ],
  };
}

function confidence(caseId: CaseId): ConfidenceTile[] {
  if (caseId === MERIDIAN_CASE) {
    const { metrics: m } = meridianAnalytics();
    const q = m.quality;
    const missing = m.coverage.grid.flatMap((g) =>
      g.months.flatMap((x, i) => (x === "missing" ? [`${g.account.bank} ${monthShort(i)}`] : [])),
    );
    return [
      {
        id: "ocr",
        label: "OCR confidence",
        value: available(q.ocrConfidence),
        format: "percent",
        note: `scanned SBI May only · ${q.ocrBelow90} rows < 90%`,
        tone: "info",
      },
      {
        id: "extraction",
        label: "Transaction extraction",
        value: available(q.extractionConfidence),
        format: "percent",
        note: "row-level parse",
        tone: "positive",
      },
      {
        id: "classification",
        label: "Classification",
        value: available(q.classificationConfidence),
        format: "percent",
        note: `${formatCount(q.lowConfidence)} low-confidence`,
        tone: "positive",
      },
      {
        id: "counterparty",
        label: "Counterparty ID",
        value: available(q.counterpartyConfidence),
        format: "percent",
        note: `${q.aliases} aliases merged`,
        tone: "info",
      },
      {
        id: "completeness",
        label: "Metric data completeness",
        value: available(m.coverage.completeness),
        format: "percent",
        note: missing.length ? `${missing.join(", ")} missing` : "all statement months present",
        tone: missing.length ? "warning" : "positive",
      },
      // Same model run as the overview's executive summary.
      {
        id: "aiInterpretation",
        label: "AI interpretation",
        value: available(0.81),
        format: "score",
        note: "summary & signals",
        tone: "magenta",
      },
    ];
  }
  const { metrics: m, input } = arjunAnalytics();
  const t = input.transactions;
  const cp = t.reduce((a, x) => a + x.counterpartyConfidence, 0) / Math.max(t.length, 1);
  const months = input.accounts.length * 6;
  return [
    {
      id: "ocr",
      label: "OCR confidence",
      value: notAvailable("Digital statements — no OCR needed"),
      format: "percent",
      note: "digital PDFs · no OCR",
      tone: "neutral",
    },
    {
      id: "extraction",
      label: "Transaction extraction",
      value: available(m.quality.extractionConfidence),
      format: "percent",
      note: "row-level parse",
      tone: "positive",
    },
    {
      id: "classification",
      label: "Classification",
      value: available(m.quality.classifiedShare),
      format: "percent",
      note: `${formatCount(m.quality.total)} rows classified`,
      tone: "info",
    },
    {
      id: "counterparty",
      label: "Counterparty ID",
      value: available(cp),
      format: "percent",
      note: "employer, lenders & landlord resolved",
      tone: "info",
    },
    {
      id: "completeness",
      label: "Metric data completeness",
      value: available(1),
      format: "percent",
      note: `${months} / ${months} account-months`,
      tone: "positive",
    },
    {
      id: "aiInterpretation",
      label: "AI interpretation",
      value: available(0.84),
      format: "score",
      note: "summary & signals",
      tone: "magenta",
    },
  ];
}

function partialMonths(caseId: CaseId): { months: number[]; note: string | null } {
  if (caseId !== MERIDIAN_CASE) return { months: [], note: null };
  const grid = meridianAnalytics().metrics.coverage.grid;
  const gaps = grid.flatMap((g) =>
    g.months.flatMap((x, i) => (x === "missing" ? [{ i, bank: g.account.bank, type: g.account.type }] : [])),
  );
  const months = [...new Set(gaps.map((g) => g.i))];
  return {
    months,
    note: gaps.length
      ? gaps
          .map(
            (g) =>
              `${monthShort(g.i)} partial — ${g.bank}${g.type === "od_cc" ? " OD" : ""} statement missing.`,
          )
          .join(" ")
      : null,
  };
}

export function buildWorkspace(
  caseId: CaseId,
  state: ReadonlyMap<string, TriageState>,
  audit: AuditLog,
): RiskWorkspace {
  const signals: SignalView[] = caseSignals(caseId).map((s) => {
    const t = state.get(s.id);
    const ex = explain(s);
    return {
      ...s,
      status: t?.status ?? s.status,
      owner: t ? t.owner : s.owner,
      explainability: ex.steps,
      explainabilityDerived: ex.derived,
      audit: audit.list({ entity: "signal", entityId: s.id }),
    };
  });

  const severity = SeveritySchema.options
    .slice()
    .sort((a, b) => SEVERITY_RANK[b] - SEVERITY_RANK[a])
    .map((sev) => {
      const of = signals.filter((s) => s.severity === sev);
      const allFp = of.length > 0 && of.every((s) => s.status === "false_positive");
      const lanes = [...new Set(of.map((s) => LANE_LABEL[s.lane].toLowerCase()))];
      return {
        severity: sev,
        count: of.length,
        note: allFp ? "marked false positive" : lanes.join(" · ") || "none",
      };
    });

  const months = Array.from({ length: 6 }, (_, i) => monthShort(i));
  const lanes = SignalCategorySchema.options
    .filter((lane) => signals.some((s) => s.lane === lane && s.timeline.length))
    .map((lane) => ({
      id: lane,
      label: LANE_LABEL[lane],
      cells: months.map((_, mi) => {
        let worst: Severity | null = null;
        for (const s of signals) {
          if (s.lane !== lane || s.status === "false_positive") continue;
          for (const p of s.timeline)
            if (p.month === mi && (!worst || SEVERITY_RANK[p.severity] > SEVERITY_RANK[worst]))
              worst = p.severity;
        }
        return worst;
      }),
    }));
  const partial = partialMonths(caseId);

  return RiskWorkspaceSchema.parse({
    caseId,
    rulesEvaluated: RULES_EVALUATED[caseId] ?? 0,
    severity,
    confidence: confidence(caseId),
    signals,
    timeline: { months, partialMonths: partial.months, note: partial.note, lanes },
    categories: REPORTING_ORDER.map((label) => {
      const of = signals.filter((s) => s.reportingCategory === label);
      return { label, signals: of.length, open: of.filter((s) => isOpen(s.status)).length };
    }),
    activeCount: signals.filter((s) => s.status !== "false_positive").length,
  });
}
