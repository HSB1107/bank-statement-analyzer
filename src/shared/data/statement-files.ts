import { z } from "zod";
import { IsoDateSchema, monthIndex, type IsoDate } from "@/shared/lib/dates";
import { CurrencySchema, MoneySchema } from "@/shared/lib/money";
import { AccountIdSchema, StatementFileIdSchema } from "./schemas/ids";
import { AccountTypeSchema, BankCodeSchema, type Account } from "./schemas/customer";
import { type Transaction } from "./schemas/transaction";
import { getArjunDataset } from "./generators/arjun";
import { getMeridianDataset, MERIDIAN_SBI, SANCTION_LETTER_FILE } from "./generators/meridian";

/** Uploaded statement / supporting document, with auto-identified fields and validation status. */
export const FileFormatSchema = z.enum(["PDF", "XLS", "XLSX", "CSV", "PNG", "JPG", "JPEG", "TIFF"]);
export type FileFormat = z.infer<typeof FileFormatSchema>;

export const FileStatusSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("validated") }),
  z.object({ kind: z.literal("duplicate"), of: z.string() }),
  z.object({ kind: z.literal("low_ocr"), page: z.number().int(), confidence: z.number() }),
  z.object({ kind: z.literal("limit_extracted"), limit: MoneySchema }),
  z.object({ kind: z.literal("identifying") }),
  z.object({ kind: z.literal("unrecognised"), reason: z.string() }),
]);
export type FileStatus = z.infer<typeof FileStatusSchema>;

export const StatementFileSchema = z.object({
  id: StatementFileIdSchema,
  name: z.string(),
  format: FileFormatSchema,
  sizeBytes: z.number().int().positive(),
  uploadedAt: z.string(),
  docKind: z.enum(["bank_statement", "sanction_letter"]),
  detected: z
    .object({
      bank: BankCodeSchema,
      bankName: z.string(),
      holder: z.string(),
      accountId: AccountIdSchema,
      last4: z.string(),
      accountType: z.union([AccountTypeSchema, z.literal("sanction_letter")]),
      periodFrom: IsoDateSchema.nullable(),
      periodTo: IsoDateSchema,
      currency: CurrencySchema,
    })
    .nullable(),
  idConfidence: z.number().min(0).max(1),
  status: FileStatusSchema,
  pages: z.number().int().nullable(),
  rows: z.number().int().nullable(),
  footnote: z.string(),
});
export type StatementFile = z.infer<typeof StatementFileSchema>;

interface FileMeta {
  name: string;
  format: FileFormat;
  sizeBytes: number;
  time: string;
  pages: number | null;
  sourceFileId: string | null;
  idConfidence: number;
  scanned?: boolean;
}

const MERIDIAN_META: readonly FileMeta[] = [
  {
    name: "ICICI_CA_3307_Jan-Jun26.pdf",
    format: "PDF",
    sizeBytes: 4_800_000,
    time: "14:12",
    pages: 214,
    sourceFileId: "SF-MP-ICICI-3307",
    idConfidence: 0.99,
  },
  {
    name: "HDFC_CA_5582_H1-2026.xlsx",
    format: "XLSX",
    sizeBytes: 1_200_000,
    time: "14:13",
    pages: null,
    sourceFileId: "SF-MP-HDFC-5582",
    idConfidence: 0.99,
  },
  {
    name: "SBI_OD_0914_Jan26.pdf",
    format: "PDF",
    sizeBytes: 610_000,
    time: "14:14",
    pages: 9,
    sourceFileId: "SF-MP-SBI-01",
    idConfidence: 0.98,
  },
  {
    name: "SBI_OD_0914_Feb26.pdf",
    format: "PDF",
    sizeBytes: 540_000,
    time: "14:15",
    pages: 8,
    sourceFileId: "SF-MP-SBI-02",
    idConfidence: 0.98,
  },
  {
    name: "SBI_OD_0914_Mar26.pdf",
    format: "PDF",
    sizeBytes: 702_000,
    time: "14:16",
    pages: 11,
    sourceFileId: "SF-MP-SBI-03",
    idConfidence: 0.98,
  },
  {
    name: "SBI_OD_0914_Mar26 (1).pdf",
    format: "PDF",
    sizeBytes: 702_000,
    time: "14:17",
    pages: 11,
    sourceFileId: null,
    idConfidence: 0.98,
  },
  {
    name: "SBI_OD_0914_May26_scan.jpg",
    format: "JPG",
    sizeBytes: 3_400_000,
    time: "14:18",
    pages: 4,
    sourceFileId: "SF-MP-SBI-05",
    idConfidence: 0.84,
    scanned: true,
  },
  {
    name: "SBI_OD_0914_Jun26.pdf",
    format: "PDF",
    sizeBytes: 655_000,
    time: "14:19",
    pages: 10,
    sourceFileId: "SF-MP-SBI-06",
    idConfidence: 0.98,
  },
  {
    name: SANCTION_LETTER_FILE,
    format: "PDF",
    sizeBytes: 880_000,
    time: "14:20",
    pages: 3,
    sourceFileId: null,
    idConfidence: 0.97,
  },
];

const ARJUN_META: readonly FileMeta[] = [
  {
    name: "ICICI_SA_4821_Jan-Jun26.pdf",
    format: "PDF",
    sizeBytes: 1_100_000,
    time: "11:02",
    pages: 6,
    sourceFileId: "SF-AM-ICICI-4821",
    idConfidence: 0.99,
  },
  {
    name: "HDFC_SA_7710_H1-2026.pdf",
    format: "PDF",
    sizeBytes: 640_000,
    time: "11:03",
    pages: 2,
    sourceFileId: "SF-AM-HDFC-7710",
    idConfidence: 0.99,
  },
];

function periodOf(rows: readonly Transaction[]): { from: IsoDate; to: IsoDate } | null {
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!first || !last) return null;
  const from = `${first.date.slice(0, 7)}-01`;
  const lastMonth = Number(last.date.slice(5, 7));
  const end = new Date(Date.UTC(Number(last.date.slice(0, 4)), lastMonth, 0)).toISOString().slice(0, 10);
  return { from: IsoDateSchema.parse(from), to: IsoDateSchema.parse(end) };
}

function build(
  meta: readonly FileMeta[],
  accounts: readonly Account[],
  holder: string,
  txns: readonly Transaction[],
): StatementFile[] {
  return meta.map((m, i) => {
    const sourceId = m.sourceFileId ?? (m.name.includes("(1)") ? "SF-MP-SBI-03" : null);
    const rows = sourceId ? txns.filter((t) => t.source.fileId === sourceId) : [];
    const account = rows[0]
      ? accounts.find((a) => a.id === rows[0]?.accountId)
      : accounts.find((a) => a.id === MERIDIAN_SBI);
    const period = periodOf(rows);
    const isSanction = m.name === SANCTION_LETTER_FILE;
    const original = meta.find((x) => x !== m && x.sourceFileId === sourceId && m.sourceFileId === null);
    let status: FileStatus = { kind: "validated" };
    if (isSanction && account && account.odLimit.status === "available")
      status = { kind: "limit_extracted", limit: account.odLimit.value.limit };
    else if (original) status = { kind: "duplicate", of: original.name };
    else if (m.scanned) {
      const p3 = rows.filter((r) => r.source.page === 3);
      const conf = p3.length ? p3.reduce((a, r) => a + (r.ocrConfidence ?? 1), 0) / p3.length : 0.84;
      status = { kind: "low_ocr", page: 3, confidence: conf };
    }
    return StatementFileSchema.parse({
      id: `FILE-${String(i + 1).padStart(2, "0")}-${m.name.slice(0, 12).replace(/[^A-Za-z0-9]/g, "")}`,
      name: m.name,
      format: m.format,
      sizeBytes: m.sizeBytes,
      uploadedAt: `05 Nov ${m.time}`,
      docKind: isSanction ? "sanction_letter" : "bank_statement",
      detected: account
        ? {
            bank: account.bank,
            bankName: account.bankName,
            holder,
            accountId: account.id,
            last4: account.last4,
            accountType: isSanction ? "sanction_letter" : account.type,
            periodFrom: isSanction ? null : (period?.from ?? null),
            periodTo:
              isSanction && account.odLimit.status === "available"
                ? account.odLimit.value.validTo
                : (period?.to ?? IsoDateSchema.parse("2026-06-30")),
            currency: account.currency,
          }
        : null,
      idConfidence: m.idConfidence,
      status,
      pages: m.pages,
      rows: m.format === "XLSX" || m.format === "CSV" ? rows.length : null,
      footnote: isSanction
        ? "Supporting · OD limit"
        : original
          ? `Duplicate of ${original.name}`
          : m.scanned
            ? `Scanned · ${m.pages ?? 0} images · OCR`
            : m.format === "XLSX"
              ? `Bank statement · ${rows.length.toLocaleString("en-IN")} rows`
              : `Bank statement · ${m.pages ?? 0} pp`,
    });
  });
}

export function statementFilesFor(customerId: string): StatementFile[] {
  if (customerId === "CUST-IN-000318") {
    const ds = getMeridianDataset();
    return build(MERIDIAN_META, ds.accounts, "Meridian Precision Comp. Pvt. Ltd.", ds.transactions);
  }
  const ds = getArjunDataset();
  return build(ARJUN_META, ds.accounts, "Arjun Mehta", ds.transactions);
}

/** Coverage cell per account-month, derived from files. */
export type CoverageCell = "covered" | "missing" | "low_ocr" | "duplicate";

export function coverageFromFiles(
  files: readonly StatementFile[],
  accounts: readonly Account[],
  months: readonly number[],
): { account: Account; cells: CoverageCell[] }[] {
  return accounts.map((a) => ({
    account: a,
    cells: months.map((m) => {
      const forMonth = files.filter(
        (f) =>
          f.docKind === "bank_statement" &&
          f.detected?.accountId === a.id &&
          f.detected.periodFrom &&
          monthIndex(f.detected.periodFrom) <= m &&
          monthIndex(f.detected.periodTo) >= m,
      );
      if (forMonth.length === 0) return "missing";
      if (forMonth.some((f) => f.status.kind === "duplicate")) return "duplicate";
      if (forMonth.some((f) => f.status.kind === "low_ocr")) return "low_ocr";
      return "covered";
    }),
  }));
}
