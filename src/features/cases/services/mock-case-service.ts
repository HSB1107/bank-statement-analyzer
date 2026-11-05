import { available } from "@/shared/lib/availability";
import { monthShort } from "@/shared/lib/dates";
import { money } from "@/shared/lib/money";
import { type MockRuntime } from "@/shared/lib/mock-runtime";
import { type AuditLog } from "@/shared/data/audit-log";
import { getArjunDataset } from "@/shared/data/generators/arjun";
import { getMeridianDataset } from "@/shared/data/generators/meridian";
import { closingBalanceMinor, openingBalanceMinor } from "@/shared/data/selectors/ledger";
import { type Account, type AccountRole } from "@/shared/data/schemas/customer";
import { StatementFileIdSchema, type CaseId } from "@/shared/data/schemas/ids";
import { type Transaction } from "@/shared/data/schemas/transaction";
import {
  coverageFromFiles,
  statementFilesFor,
  StatementFileSchema,
  type StatementFile,
} from "@/shared/data/statement-files";
import {
  CaseDetailSchema,
  CustomerListSchema,
  CustomerContextSchema,
  IngestionSchema,
  ProcessingOptionIdSchema,
  ProcessingOptionsSchema,
  StartProcessingResultSchema,
  ValidationCheckSchema,
  type CaseDetail,
  type CustomerContext,
  type ProcessingOptions,
  type ValidationCheck,
} from "../schemas/cases";
import { type CaseService } from "./case-service";

const MONTHS = [0, 1, 2, 3, 4, 5] as const;
const ACTOR = "Priya Raman";

interface CaseState {
  detail: CaseDetail;
  accounts: readonly Account[];
  transactions: readonly Transaction[];
  files: StatementFile[];
  context: CustomerContext;
  options: ProcessingOptions;
  roles: Map<string, AccountRole>;
}

function allOptions(): ProcessingOptions {
  return ProcessingOptionsSchema.parse(
    Object.fromEntries(ProcessingOptionIdSchema.options.map((id) => [id, true])),
  );
}

function initialState(caseId: CaseId): CaseState {
  if (caseId === "BSA-26-04421") {
    const ds = getMeridianDataset();
    const c = ds.customer;
    return {
      detail: CaseDetailSchema.parse({
        id: caseId,
        customerId: c.id,
        customerName: c.name,
        customerRef: `${c.id} · ${c.segmentLabel} · ${c.sector}`,
        kind: c.kind,
        regionLabel: `${c.country} · ${c.reportingCurrency}`,
        purpose: "SME Underwriting",
        periodLabel: c.period.label,
        accounts: c.accountIds.length,
        stage: "upload",
      }),
      accounts: ds.accounts,
      transactions: ds.transactions,
      files: statementFilesFor(c.id),
      context: CustomerContextSchema.parse({
        customerType: c.segmentLabel,
        sector: c.sector,
        regionCountry: `${c.country} · IN`,
        reportingCurrency: c.reportingCurrency,
        analysisPeriod: c.period.label,
        expectedAccounts: c.accountIds.length,
        declaredTurnover: `₹${(c.declaredTurnover.amount.amountMinor / 1e9).toFixed(1)} cr ${c.declaredTurnover.fiscalYear}`,
        linkedFsaCase: c.linkedFsaCase,
        template: c.template,
        confirmed: true,
      }),
      options: allOptions(),
      roles: new Map(ds.accounts.map((a) => [a.id, a.role])),
    };
  }
  if (caseId === "BSA-26-04417") {
    const ds = getArjunDataset();
    const c = ds.customer;
    return {
      detail: CaseDetailSchema.parse({
        id: caseId,
        customerId: c.id,
        customerName: c.name,
        customerRef: `${c.id} · ${c.segmentLabel}`,
        kind: c.kind,
        regionLabel: `${c.country} · ${c.reportingCurrency}`,
        purpose: "Retail Underwriting",
        periodLabel: c.period.label,
        accounts: c.accountIds.length,
        stage: "review",
      }),
      accounts: ds.accounts,
      transactions: ds.transactions,
      files: statementFilesFor(c.id),
      context: CustomerContextSchema.parse({
        customerType: c.segmentLabel,
        sector: "—",
        regionCountry: `${c.country} · IN`,
        reportingCurrency: c.reportingCurrency,
        analysisPeriod: c.period.label,
        expectedAccounts: c.accountIds.length,
        declaredTurnover: "—",
        linkedFsaCase: "—",
        template: {
          id: "BSA-TPL-RTL-IN",
          name: "Retail Financial Profile v3.1",
          note: "retail metrics on, corporate analytics off",
        },
        confirmed: true,
      }),
      options: allOptions(),
      roles: new Map(ds.accounts.map((a) => [a.id, a.role])),
    };
  }
  throw new Error(`Case ${caseId} is not part of the Pass 1 demo (coming in Pass 2).`);
}

const TYPE_LABEL: Readonly<Record<Account["type"], string>> = {
  current: "Current",
  savings: "Savings",
  od_cc: "OD / CC",
};

/** Auto-identify bank/account/month from a file name (stands in for the classifier). */
function identify(state: CaseState, name: string, sizeBytes: number, index: number): StatementFile {
  const m = /(ICICI|HDFC|SBI)[_-](?:CA|SA|OD)[_-](\d{4})[_-]([A-Za-z]{3})(\d{2})/i.exec(name);
  const format = (name.split(".").pop() ?? "PDF").toUpperCase();
  const fmt = ["PDF", "XLS", "XLSX", "CSV", "PNG", "JPG", "JPEG", "TIFF"].includes(format) ? format : "PDF";
  const account = m ? state.accounts.find((a) => a.last4 === m[2]) : undefined;
  const monthIdx = m
    ? ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(
        (m[3] ?? "").toLowerCase(),
      )
    : -1;
  const id = StatementFileIdSchema.parse(`FILE-U${index}-${Date.now().toString(36)}`);
  const holder =
    state.detail.kind === "corporate" ? "Meridian Precision Comp. Pvt. Ltd." : state.detail.customerName;
  if (!account || monthIdx < 0) {
    return StatementFileSchema.parse({
      id,
      name,
      format: fmt,
      sizeBytes,
      uploadedAt: "now",
      docKind: "bank_statement",
      detected: null,
      idConfidence: 0.42,
      status: { kind: "unrecognised", reason: "Bank or account not recognised — map manually" },
      pages: null,
      rows: null,
      footnote: "Needs manual mapping",
    });
  }
  const mm = String(monthIdx + 1).padStart(2, "0");
  const last = new Date(Date.UTC(2026, monthIdx + 1, 0)).getUTCDate();
  const duplicateOf = state.files.find(
    (f) =>
      f.detected?.accountId === account.id &&
      f.detected.periodFrom === `2026-${mm}-01` &&
      f.status.kind !== "duplicate",
  );
  return StatementFileSchema.parse({
    id,
    name,
    format: fmt,
    sizeBytes,
    uploadedAt: "now",
    docKind: "bank_statement",
    detected: {
      bank: account.bank,
      bankName: account.bankName,
      holder,
      accountId: account.id,
      last4: account.last4,
      accountType: account.type,
      periodFrom: `2026-${mm}-01`,
      periodTo: `2026-${mm}-${last}`,
      currency: account.currency,
    },
    idConfidence: 0.97,
    status: duplicateOf ? { kind: "duplicate", of: duplicateOf.name } : { kind: "validated" },
    pages: null,
    rows: null,
    footnote: duplicateOf ? `Duplicate of ${duplicateOf.name}` : "Identified · queued for extraction",
  });
}

function validation(state: CaseState): ValidationCheck[] {
  const coverage = coverageFromFiles(state.files, state.accounts, MONTHS);
  const missing = coverage.flatMap((r) =>
    r.cells.map((c, m) => ({ account: r.account, c, m })).filter((x) => x.c === "missing"),
  );
  const duplicates = state.files.filter((f) => f.status.kind === "duplicate");
  const unsupported = state.files.filter((f) => f.status.kind === "unrecognised");
  // Balance continuity: an account with a missing month between covered months cannot chain balances.
  const gaps = coverage.filter((r) =>
    r.cells.some(
      (c, i) =>
        c === "missing" &&
        r.cells.slice(0, i).some((x) => x !== "missing") &&
        r.cells.slice(i + 1).some((x) => x !== "missing"),
    ),
  );
  const short = (a: Account) => `${a.bank} ${a.type === "od_cc" ? "OD" : ""}`.trim();
  const dupFile = duplicates[0];
  return [
    {
      id: "duplicates",
      label: "Duplicate documents",
      detail: dupFile
        ? `${dupFile.detected?.bank ?? ""} ${dupFile.detected?.periodFrom ? monthShort(Number(dupFile.detected.periodFrom.slice(5, 7)) - 1) : ""} ${dupFile.detected?.periodFrom?.slice(2, 4) ?? ""} · SHA-256 match → excluded`
        : "none",
      count: duplicates.length,
      severity: duplicates.length ? "error" : "ok",
    },
    {
      id: "missing_months",
      label: "Missing months",
      detail: missing.length
        ? missing.map((x) => `${short(x.account)} · ${monthShort(x.m)} 2026 not uploaded`).join("; ")
        : "all months present",
      count: missing.length,
      severity: missing.length ? "error" : "ok",
    },
    {
      id: "missing_pages",
      label: "Missing pages",
      detail: "page sequence continuous",
      count: 0,
      severity: "ok",
    },
    {
      id: "unsupported",
      label: "Unsupported / corrupt",
      detail: unsupported.length ? unsupported.map((f) => f.name).join(", ") : "",
      count: unsupported.length,
      severity: unsupported.length ? "warning" : "ok",
    },
    {
      id: "inconsistent_accounts",
      label: "Inconsistent account nos.",
      detail: "all match holder & IFSC",
      count: 0,
      severity: "ok",
    },
    {
      id: "overlaps",
      label: "Overlapping periods",
      detail: "after duplicate removal",
      count: 0,
      severity: "ok",
    },
    {
      id: "balance_continuity",
      label: "Balance continuity",
      detail: gaps.length
        ? gaps
            .map(
              (g) =>
                `${short(g.account)} ${monthShort(g.cells.findIndex((c) => c === "missing") - 1)} close ≠ ${monthShort(g.cells.findIndex((c) => c === "missing") + 1)} open (${monthShort(g.cells.findIndex((c) => c === "missing"))} gap)`,
            )
            .join("; ")
        : "balances chain across statements",
      count: gaps.length,
      severity: gaps.length ? "warning" : "ok",
    },
  ].map((v) => ValidationCheckSchema.parse(v));
}

function ingestion(caseId: CaseId, state: CaseState) {
  const coverage = coverageFromFiles(state.files, state.accounts, MONTHS);
  const total = coverage.length * MONTHS.length;
  const covered = coverage.reduce((a, r) => a + r.cells.filter((c) => c !== "missing").length, 0);
  const corporate = state.detail.kind === "corporate";
  const missing = coverage.flatMap((r) =>
    r.cells.map((c, m) => ({ r, c, m })).filter((x) => x.c === "missing"),
  );
  const sbi = state.accounts.find((a) => a.type === "od_cc");
  const limitNote =
    sbi && sbi.odLimit.status === "available"
      ? ` OD limit ₹${(sbi.odLimit.value.limit.amountMinor / 1e9).toFixed(2)} cr taken from sanction letter — utilisation will be computed against this verified limit only.`
      : "";
  return IngestionSchema.parse({
    caseId,
    files: state.files,
    context: state.context,
    coverage: {
      months: MONTHS.map((m) => monthShort(m).toUpperCase()),
      rows: coverage.map((r) => ({
        label: `${r.account.bank}${r.account.type === "od_cc" ? " OD" : ""} XX${r.account.last4}`,
        cells: r.cells,
      })),
      covered,
      total,
    },
    validation: validation(state),
    mapping: state.accounts.map((a) => {
      const gap = coverage.find((r) => r.account.id === a.id)?.cells.includes("missing") ?? false;
      return {
        accountId: a.id,
        bankName: a.bankName,
        maskedAccount: `XXXX${a.last4}`,
        typeLabel: TYPE_LABEL[a.type],
        currency: a.currency,
        periodLabel: `Jan-Jun 26${gap ? "*" : ""}`,
        incomplete: gap,
        opening: available(money(openingBalanceMinor(state.transactions, a.id), a.currency)),
        closing: available(money(closingBalanceMinor(state.transactions, a.id), a.currency)),
        role: state.roles.get(a.id) ?? a.role,
      };
    }),
    mappingNote: missing.length
      ? `* ${missing.map((x) => `${monthShort(x.m)} 2026 missing for ${x.r.account.bank}${x.r.account.type === "od_cc" ? " OD" : ""}`).join("; ")}.${limitNote}`
      : limitNote.trim(),
    options: state.options,
    completeness: total ? covered / total : 1,
    coverageWarning: missing.length
      ? `${missing.map((x) => `${x.r.account.bank}${x.r.account.type === "od_cc" ? " OD" : ""} ${monthShort(x.m)} 2026`).join(", ")} missing — ${corporate ? "OD utilisation and consolidated balances" : "balances"} for ${missing.map((x) => monthShort(x.m)).join(", ")} will show “Not Available”. Request statement or proceed with reduced completeness (${((covered / total) * 100).toFixed(1)}%).`
      : null,
  });
}

const DIRECTORY = () =>
  CustomerListSchema.parse(
    [getArjunDataset().customer, getMeridianDataset().customer].map((c) => ({
      customerId: c.id,
      caseId: c.caseId,
      kind: c.kind,
      name: c.name,
    })),
  );

export function createMockCaseService(runtime: MockRuntime, audit: AuditLog): CaseService {
  const states = new Map<string, CaseState>();
  const state = (caseId: CaseId) => {
    let s = states.get(caseId);
    if (!s) {
      s = initialState(caseId);
      states.set(caseId, s);
    }
    return s;
  };
  let uploads = 0;
  return {
    async getCase(caseId) {
      await runtime.delay();
      return state(caseId).detail;
    },
    async getCustomer(customerId) {
      await runtime.delay();
      const found = DIRECTORY().find((c) => c.customerId === customerId);
      if (!found)
        throw new Error(`Customer ${customerId} is not part of the Pass 1 demo (coming in Pass 2).`);
      return found;
    },
    async listProfiles() {
      await runtime.delay();
      return DIRECTORY();
    },
    async getIngestion(caseId) {
      await runtime.delay();
      runtime.maybeFail("load ingestion");
      return ingestion(caseId, state(caseId));
    },
    async addFile(caseId, file) {
      await runtime.delay();
      const s = state(caseId);
      const f = identify(s, file.name, file.sizeBytes, ++uploads);
      s.files = [...s.files, f];
      audit.append({
        actor: ACTOR,
        entity: "statement",
        entityId: f.id,
        action: "UPLOAD",
        before: null,
        after: f.name,
        reason: "Statement uploaded",
      });
      return f;
    },
    async removeFile(caseId, fileId) {
      await runtime.delay();
      const s = state(caseId);
      const f = s.files.find((x) => x.id === fileId);
      if (!f) throw new Error("File not found");
      s.files = s.files.filter((x) => x.id !== fileId);
      audit.append({
        actor: ACTOR,
        entity: "statement",
        entityId: fileId,
        action: "REMOVE",
        before: f.name,
        after: null,
        reason: "Removed by analyst",
      });
    },
    async updateContext(caseId, context) {
      await runtime.delay();
      const s = state(caseId);
      const parsed = CustomerContextSchema.parse(context);
      audit.append({
        actor: ACTOR,
        entity: "case",
        entityId: caseId,
        action: "UPDATE_CONTEXT",
        before: JSON.stringify(s.context),
        after: JSON.stringify(parsed),
        reason: "Customer context edited",
      });
      s.context = parsed;
      return parsed;
    },
    async setAccountRole(caseId, accountId, role) {
      await runtime.delay();
      const s = state(caseId);
      audit.append({
        actor: ACTOR,
        entity: "case",
        entityId: `${caseId}/${accountId}`,
        action: "SET_ACCOUNT_ROLE",
        before: s.roles.get(accountId) ?? null,
        after: role,
        reason: "Account role mapping",
      });
      s.roles.set(accountId, role);
    },
    async updateOptions(caseId, options) {
      await runtime.delay();
      const s = state(caseId);
      s.options = ProcessingOptionsSchema.parse({ ...s.options, ...options });
      audit.append({
        actor: ACTOR,
        entity: "case",
        entityId: caseId,
        action: "UPDATE_OPTIONS",
        before: null,
        after: JSON.stringify(s.options),
        reason: "Processing options",
      });
      return s.options;
    },
    async validate(caseId) {
      await runtime.delay();
      return validation(state(caseId));
    },
    async startProcessing(caseId) {
      await runtime.delay();
      const s = state(caseId);
      s.detail = { ...s.detail, stage: "processing" };
      audit.append({
        actor: ACTOR,
        entity: "case",
        entityId: caseId,
        action: "START_PROCESSING",
        before: "upload",
        after: "processing",
        reason: "AI processing started",
      });
      return StartProcessingResultSchema.parse({
        jobId: "JOB-BSA-8K21",
        startedAt: new Date().toISOString(),
      });
    },
  };
}
