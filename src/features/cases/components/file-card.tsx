"use client";

import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { formatLongDate, monthShort } from "@/shared/lib/dates";
import { formatFileSize, formatMoney } from "@/shared/lib/format";
import { assertNever } from "@/shared/lib/assert";
import { type StatementFile } from "@/shared/data/statement-files";
import { Chip } from "@/shared/ui/chip";
import { type Tone } from "@/shared/ui/tone";

function statusChip(f: StatementFile): { tone: Tone; label: string } {
  const s = f.status;
  switch (s.kind) {
    case "validated":
      return { tone: "positive", label: "Validated" };
    case "duplicate":
      return { tone: "negative", label: "Duplicate · excluded" };
    case "low_ocr":
      return { tone: "warning", label: `Low OCR on p.${s.page}` };
    case "limit_extracted":
      return { tone: "positive", label: "Limit extracted" };
    case "identifying":
      return { tone: "info", label: "Identifying…" };
    case "unrecognised":
      return { tone: "warning", label: "Map manually" };
    default:
      return assertNever(s, "file status");
  }
}

const FORMAT_TONE: Readonly<Record<string, string>> = {
  PDF: "text-negative bg-negative/10",
  XLSX: "text-positive bg-positive/10",
  XLS: "text-positive bg-positive/10",
  CSV: "text-positive bg-positive/10",
  JPG: "text-warning bg-warning/10",
  PNG: "text-warning bg-warning/10",
  JPEG: "text-warning bg-warning/10",
  TIFF: "text-warning bg-warning/10",
};

function periodText(f: StatementFile): string {
  const d = f.detected;
  if (!d) return "—";
  if (f.docKind === "sanction_letter")
    return `Valid to ${formatLongDate(d.periodTo).replace(/^0/, "")} · ${d.currency}`;
  if (!d.periodFrom) return "—";
  const sameMonth = d.periodFrom.slice(0, 7) === d.periodTo.slice(0, 7);
  return sameMonth
    ? `01 – ${d.periodTo.slice(8)} ${monthShort(Number(d.periodTo.slice(5, 7)) - 1)} ${d.periodTo.slice(2, 4)} · ${d.currency}`
    : `01 ${monthShort(Number(d.periodFrom.slice(5, 7)) - 1)} – ${d.periodTo.slice(8)} ${monthShort(Number(d.periodTo.slice(5, 7)) - 1)} ${d.periodTo.slice(2, 4)} · ${d.currency}`;
}

const TYPE: Readonly<Record<string, string>> = {
  current: "Current",
  savings: "Savings",
  od_cc: "OD / CC",
  sanction_letter: "Sanction letter",
};

export function FileCard({
  file,
  onRemove,
  removing,
}: {
  file: StatementFile;
  onRemove: () => void;
  removing: boolean;
}) {
  const chip = statusChip(file);
  const border =
    file.status.kind === "duplicate"
      ? "border-negative/60"
      : file.status.kind === "low_ocr"
        ? "border-warning/60"
        : "border-border";
  const d = file.detected;
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-surface-2 p-3.5",
        border,
        removing && "opacity-50",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "num grid size-9 shrink-0 place-items-center rounded-md text-[9px] font-bold",
            FORMAT_TONE[file.format] ?? "bg-surface-3 text-muted",
          )}
        >
          {file.format}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-semibold text-fg",
              file.status.kind === "duplicate" && "line-through decoration-negative",
            )}
            title={file.name}
          >
            {file.name}
          </p>
          <p className="num text-[11px] text-subtle">
            {formatFileSize(file.sizeBytes)} · {file.uploadedAt}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remove ${file.name}`}
          className="rounded p-1 text-subtle hover:bg-surface-3 hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <dl className="grid grid-cols-[64px_1fr] gap-y-1 text-[13px]">
        <dt className="text-subtle">Bank</dt>
        <dd className="truncate text-fg">{d?.bankName ?? "Not recognised"}</dd>
        <dt className="text-subtle">Holder</dt>
        <dd className="truncate text-fg">{d?.holder ?? "—"}</dd>
        <dt className="text-subtle">Account</dt>
        <dd className="num truncate text-fg">
          {d ? `XXXX${d.last4} · ${TYPE[d.accountType] ?? d.accountType}` : "—"}
        </dd>
        <dt className="text-subtle">Period</dt>
        <dd className="num truncate text-fg">{periodText(file)}</dd>
      </dl>
      <div className="flex items-center justify-between">
        <Chip tone={chip.tone} variant="outline" dot>
          {chip.label}
        </Chip>
        <Chip
          tone={file.idConfidence < 0.9 ? "warning" : "magenta"}
          variant="outline"
          mono
          size="xs"
          title="Auto-identification confidence"
        >
          ID {Math.round(file.idConfidence * 100)}%
        </Chip>
      </div>
      <p className="text-[11px] text-subtle">
        {file.status.kind === "limit_extracted"
          ? `${file.footnote} ${formatMoney(file.status.limit, { scale: "crore" })}`
          : file.footnote}
      </p>
    </li>
  );
}
