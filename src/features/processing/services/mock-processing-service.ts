import { formatCroreValue, formatPercent, formatIndianNumber } from "@/shared/lib/format";
import { money as toMoney } from "@/shared/lib/money";
import { type MockRuntime } from "@/shared/lib/mock-runtime";
import { getArjunDataset } from "@/shared/data/generators/arjun";
import { getMeridianDataset } from "@/shared/data/generators/meridian";
import { meridianInput } from "@/shared/data/meridian-input";
import { PIPELINE_STAGE_DEFS } from "@/shared/data/pipeline";
import {
  dataQuality,
  inflowConcentration,
  cashFlow,
  detectRoundTrips,
  coverage,
} from "@/shared/data/selectors/corporate";
import { isOwnTransfer, isPosted } from "@/shared/data/selectors/ledger";
import { statementFilesFor } from "@/shared/data/statement-files";
import { type Account } from "@/shared/data/schemas/customer";
import { type CaseId } from "@/shared/data/schemas/ids";
import { type Transaction } from "@/shared/data/schemas/transaction";
import { ProcessingPlanSchema, type ProcessingEvent, type ProcessingPlan } from "../schemas/processing";
import { type ProcessingService } from "./processing-service";

/** Stage timing metadata (seconds) — characteristic of the job, not derived from the data. */
const DURATIONS = [
  0.9, 1.2, 2.1, 41.8, 6.4, 1.7, 0.8, 8.9, 12.3, 9.6, 1.1, 2.4, 25.0, 8.0, 5.0, 4.0, 6.0, 7.0, 5.0, 3.0, 4.0,
] as const;
const PENDING: readonly string[] = [
  "files · duplicates · retained",
  "checksums · corruption · encryption",
  "bank · account · holder",
  "OCR for scanned images",
  "row parsing",
  "DD/MM/YY → ISO · Dr/Cr columns → signed amounts",
  "credit / debit split",
  "NEFT/RTGS/IMPS/UPI/ACH parsed · UTR & IFSC extracted",
  "64-category taxonomy",
  "entity resolution · alias merging",
  "same UTR, amount, date",
  "own-account pairs",
  "customer collection cadence",
  "payroll · rent · EMI · statutory",
  "term loan · OD interest · lease",
  "operating / financing / investing buckets",
  "daily balances · OD utilisation",
  "rule pack AD-BSA-CORP v1.6 + statistical",
  "severity · evidence · confidence",
  "SCM-CORP v1.3",
  "BSA-TPL-SME-IN · 14 sections",
];

const SHORT = (a: Account) => `${a.bank}${a.type === "od_cc" ? " OD" : ""} XX${a.last4}`;
const hubOf = (a: Account | undefined): "icici" | "hdfc" | "sbi" =>
  a?.bank === "HDFC" ? "hdfc" : a?.bank === "SBI" ? "sbi" : "icici";

function topNodes(
  t: readonly Transaction[],
  accounts: readonly Account[],
  side: "inflow" | "outflow",
  n: number,
) {
  const dir = side === "inflow" ? "credit" : "debit";
  const map = new Map<string, { label: string; value: number; byAccount: Map<string, number> }>();
  for (const x of t) {
    if (!isPosted(x) || isOwnTransfer(x) || x.direction !== dir) continue;
    const key =
      x.category === "gst" || x.category === "tds" || x.category === "epf_esic" ? "STAT" : x.counterparty.id;
    const label =
      key === "STAT"
        ? "GST · TDS · EPF"
        : x.counterparty.name.replace("Payroll (412 employees)", "Payroll · 412");
    const cur = map.get(key) ?? { label, value: 0, byAccount: new Map<string, number>() };
    cur.value += x.amount.amountMinor;
    cur.byAccount.set(x.accountId, (cur.byAccount.get(x.accountId) ?? 0) + x.amount.amountMinor);
    map.set(key, cur);
  }
  const ranked = [...map.entries()].sort((a, b) => b[1].value - a[1].value);
  const top = ranked.slice(0, n);
  const rest = ranked.slice(n);
  const nodes = top.map(([id, v]) => {
    const main = [...v.byAccount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return { id, label: v.label, side, hub: hubOf(accounts.find((a) => a.id === main)), valueMinor: v.value };
  });
  if (rest.length)
    nodes.push({
      id: `${side}-rest`,
      label: `${rest.length} ${side === "inflow" ? "others" : "suppliers"}`,
      side,
      hub: side === "inflow" ? "hdfc" : "hdfc",
      valueMinor: rest.reduce((a, [, v]) => a + v.value, 0),
    });
  return nodes;
}

function buildPlan(caseId: CaseId): { plan: ProcessingPlan; traces: { tag: string; text: string }[] } {
  const corporate = caseId === "BSA-26-04421";
  const ds = corporate ? getMeridianDataset() : getArjunDataset();
  const t = ds.transactions;
  const input = corporate
    ? meridianInput()
    : {
        transactions: t,
        accounts: ds.accounts,
        period: ds.customer.period,
        missingMonths: {},
        lowBalanceThresholdMinor: 1_000_000,
      };
  const q = dataQuality(input);
  const cf = cashFlow(input);
  const conc = inflowConcentration(input);
  const cov = coverage(input);
  const files = statementFilesFor(ds.customer.id);
  const dupFiles = files.filter((f) => f.status.kind === "duplicate").length;
  const scanned = files.filter((f) => f.status.kind === "low_ocr");
  const lowOcr = scanned[0]?.status.kind === "low_ocr" ? scanned[0].status : null;
  const statements = files.filter((f) => f.docKind === "bank_statement");
  const imagePages = scanned.reduce((a, f) => a + (f.pages ?? 0), 0);
  const money = (minor: number) =>
    corporate ? `₹${formatCroreValue(toMoney(minor))} cr` : `₹${formatIndianNumber(minor / 100)}`;
  const details: readonly string[] = [
    `${files.length} files · ${dupFiles} duplicate excluded · ${files.length - dupFiles} retained`,
    "checksums ok · 0 corrupt · 0 encrypted",
    ds.accounts.map(SHORT).join(" · "),
    lowOcr
      ? `${imagePages} scanned images · mean OCR ${formatPercent(q.ocrConfidence)} · p.${lowOcr.page} at ${Math.round(lowOcr.confidence * 100)}%`
      : `${statements.length} digital statements · no OCR needed`,
    `${formatIndianNumber(q.total)} rows parsed · ${Math.round(q.total / 776)} multi-line descriptions merged`,
    "DD/MM/YY → ISO · Dr/Cr columns → signed amounts",
    `${formatIndianNumber(q.credits)} Cr · ${formatIndianNumber(q.debits)} Dr`,
    "NEFT/RTGS/IMPS/UPI/ACH parsed · UTR & IFSC extracted",
    `${formatIndianNumber(q.categorised)} auto-classified (${formatPercent(q.classificationConfidence)}) · ${q.lowConfidence} low-confidence`,
    `${q.counterparties} counterparties · ${q.aliases} merged aliases`,
    `${q.duplicateRows} suspected duplicates (same UTR, amount, date)`,
    `${cf.ownTransferPairs} own-account pairs · ${money(cf.totals.ownTransfers)} matched`,
    `customer collection cadence · ${conc.payers} payers`,
    ...PENDING.slice(13),
  ];
  const warnings = new Set([lowOcr ? 3 : -1, q.duplicateRows > 0 ? 10 : -1]);
  const stages = PIPELINE_STAGE_DEFS.map((s, i) => ({
    index: i + 1,
    id: s.id,
    name: s.name,
    detail: details[i] ?? "",
    pendingDetail: PENDING[i] ?? "",
    durationSec: DURATIONS[i] ?? 3,
    outcome: warnings.has(i) ? ("warning" as const) : ("done" as const),
  }));

  const inflow = topNodes(t, ds.accounts, "inflow", corporate ? 4 : 3).map((n) => ({
    ...n,
    appearsAtStage: 10,
  }));
  const outflow = topNodes(t, ds.accounts, "outflow", corporate ? 4 : 4).map((n) => ({
    ...n,
    appearsAtStage: 10,
  }));
  const trips = corporate ? detectRoundTrips(meridianInput()) : [];
  const sbi = ds.accounts.find((a) => a.type === "od_cc");
  const missing = cov.grid.flatMap((g) =>
    g.months.map((m, i) => ({ g, m, i })).filter((x) => x.m === "missing"),
  );
  const exceptions = corporate
    ? [
        { tag: "OCR", text: `SBI May p.3 · ${q.ocrBelow90} rows below 90% OCR confidence` },
        {
          tag: "DUPLICATE",
          text: `${q.duplicateRows} suspected duplicate debits · SBI 14-Mar · ₹${(q.duplicateAmountMinor / 1e9).toFixed(2)} cr`,
        },
        ...missing.map((x) => ({
          tag: "COVERAGE",
          text: `${SHORT(x.g.account).replace(/ XX\d+$/, "")} ${["January", "February", "March", "April", "May", "June"][x.i]} 2026 missing · balances N/A for ${["January", "February", "March", "April", "May", "June"][x.i]}`,
        })),
        { tag: "RECON", text: sbi ? "SBI Mar close ₹(0.71) cr ≠ May open ₹(1.24) cr — gap month" : "" },
        { tag: "CLASSIFY", text: `${q.lowConfidence} low-confidence categories (< 85%)` },
        {
          tag: "CPTY",
          text: `${trips.length + 1} counterparties match director names → related-party check`,
        },
        { tag: "REVERSAL", text: "HDFC · 1 unexplained reversal pattern → reconciliation warning" },
      ]
    : [
        { tag: "CLASSIFY", text: `${q.lowConfidence} low-confidence categories (< 85%)` },
        { tag: "RECON", text: "ACH return 05-May · balance excluded from ledger" },
      ];

  const traces: { tag: string; text: string }[] = [];
  const sample = (pred: (x: Transaction) => boolean, k: number) =>
    t
      .filter(pred)
      .filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / k)) === 0)
      .slice(0, k);
  for (const x of sample((x) => x.counterparty.kind === "customer" || x.counterparty.kind === "employer", 6))
    traces.push({ tag: "CPTY", text: `${x.narration.slice(0, 28)} → ${x.counterparty.name}` });
  for (const x of sample(
    (x) =>
      x.direction === "debit" &&
      isOwnTransfer(x) &&
      x.transferPairId !== null &&
      x.amount.amountMinor >= (corporate ? 5_00_00_000_00 : 1),
    5,
  ))
    traces.push({
      tag: "XFER",
      text: `${x.counterparty.name.replace("Self · ", "")} ⇄ ${money(x.amount.amountMinor)} matched 0d`,
    });
  for (const x of sample((x) => x.duplicateGroup !== null, 1))
    traces.push({
      tag: "DUP?",
      text: `${x.accountId.includes("SBI") ? "SBI" : ""} ${x.date.slice(8)}-${["Jan", "Feb", "Mar", "Apr", "May", "Jun"][Number(x.date.slice(5, 7)) - 1]} UTR …${x.reference.slice(-4)} ×${q.duplicateRows - 1}`,
    });
  for (const x of sample((x) => x.categoryConfidence >= 0.97 && x.counterparty.kind === "statutory", 3))
    traces.push({
      tag: "CAT",
      text: `${x.counterparty.name} → Statutory · ${x.categoryConfidence.toFixed(2)}`,
    });
  const lead = conc.ranked[0];
  if (lead)
    traces.push({
      tag: "REC",
      text: `${lead.name.split(" ")[0] ?? ""}: monthly cadence · ${lead.monthly.filter((v) => v > 0).length}/6 mo`,
    });

  const plan = ProcessingPlanSchema.parse({
    caseId,
    jobId: corporate ? "JOB-BSA-8K21" : "JOB-BSA-7R04",
    startedAt: "14:21:06",
    stages,
    totals: {
      transactions: q.total,
      categories: q.categories,
      extraction: q.extractionConfidence,
      accounts: ds.accounts.length,
    },
    perAccount: q.byAccount.map((b) => ({
      label: `${b.account.bank}${b.account.type === "od_cc" ? " OD" : ""} ${b.account.last4}`,
      transactions: b.rows,
      confidence: b.extraction,
    })),
    exceptions: exceptions.filter((e) => e.text),
    network: {
      hubs: ds.accounts.map((a) => ({ id: hubOf(a), label: a.type === "od_cc" ? "SBI-OD" : a.bank })),
      nodes: [...inflow, ...outflow],
      ownTransferMinor: cf.totals.ownTransfers,
    },
    periodLabel: "Jan-Jun 26",
  });
  return { plan, traces };
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

export function createMockProcessingService(runtime: MockRuntime): ProcessingService {
  return {
    async getPlan(caseId) {
      await runtime.delay();
      return buildPlan(caseId).plan;
    },
    async *stream(caseId, options): AsyncGenerator<ProcessingEvent> {
      const { plan, traces } = buildPlan(caseId);
      const speed = options?.speed ?? 6;
      let elapsed = 0;
      let traceIdx = 0;
      for (const stage of plan.stages) {
        const ticks = Math.max(2, Math.min(8, Math.round(stage.durationSec / 3)));
        for (let k = 1; k <= ticks; k++) {
          await sleep(((stage.durationSec / ticks) * 1000) / speed, options?.signal);
          elapsed += stage.durationSec / ticks;
          const final = k === ticks;
          yield {
            type: "stage",
            index: stage.index,
            status: final ? stage.outcome : "running",
            progress: k / ticks,
            elapsedSec: elapsed,
          };
          if (k % 2 === 0 && traces.length) {
            const tr = traces[traceIdx++ % traces.length];
            if (tr) yield { type: "trace", ...tr };
          }
        }
      }
      yield { type: "done", elapsedSec: elapsed };
    },
  };
}
