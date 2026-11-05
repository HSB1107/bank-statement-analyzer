"use client";

import { Check, Download, FileSpreadsheet, Printer, RefreshCw, Share2 } from "lucide-react";
import { useState } from "react";
import { formatPercent } from "@/shared/lib/format";
import { type ProfileHeader as ProfileHeaderData } from "@/shared/data/schemas/profile";
import { Button } from "@/shared/ui/button";
import { Chip, SyntheticBadge } from "@/shared/ui/chip";

export function ProfileHeader({
  data,
  onRefresh,
  onSave,
  saving,
}: {
  data: ProfileHeaderData;
  onRefresh: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [note, setNote] = useState<string | null>(null);
  const corporate = data.kind === "corporate";
  const pass2 = (what: string) => setNote(`${what} is part of Pass 2 (consolidated report).`);
  return (
    <section
      aria-label="Profile summary"
      className="mb-4 rounded-[var(--radius-card)] border border-border bg-surface px-5 py-4 shadow-card"
    >
      <div className="flex flex-wrap items-start gap-4">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-full border border-info/40 bg-info/10 text-lg font-bold text-info"
        >
          {data.initials}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold text-fg">
            {data.name}
            <Chip tone={corporate ? "lime" : "info"} variant="outline" mono size="xs">
              {corporate ? "Corporate" : "Individual"}
            </Chip>
            <SyntheticBadge />
          </h1>
          <p className="num mt-1 text-[13px] text-muted">{data.reference}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => pass2("PDF export")}>
            <Download aria-hidden /> PDF
          </Button>
          <Button size="sm" onClick={() => pass2("Excel export")}>
            <FileSpreadsheet aria-hidden /> Excel
          </Button>
          <Button size="icon" aria-label="Print" onClick={() => window.print()}>
            <Printer aria-hidden />
          </Button>
          <Button size="icon" aria-label="Refresh profile" onClick={onRefresh}>
            <RefreshCw aria-hidden />
          </Button>
          <Button size="sm" variant="info" onClick={() => pass2("Share with CAS")}>
            <Share2 aria-hidden /> Share with CAS
          </Button>
          <Button size="sm" variant="primary" onClick={onSave} disabled={saving}>
            <Check aria-hidden /> {data.savedAt ? "Saved" : saving ? "Saving…" : "Save Final Profile"}
          </Button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-border pt-3">
        {data.facts.map((f) => (
          <div key={f.label} className="border-l border-border pl-4 first:border-l-0 first:pl-0">
            <p className="label-micro text-[10px]">{f.label}</p>
            <p className="num mt-1 font-semibold text-fg">{f.value}</p>
          </div>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <Chip tone={data.coverage.covered < data.coverage.total ? "warning" : "positive"} variant="outline">
            Coverage{" "}
            <strong className="num">
              {data.coverage.covered}/{data.coverage.total} mo
            </strong>
          </Chip>
          <Chip tone="positive" variant="outline">
            Extraction <strong className="num">{formatPercent(data.extraction)}</strong>
          </Chip>
          <Chip tone="info" variant="outline">
            Classified <strong className="num">{formatPercent(data.classified)}</strong>
          </Chip>
        </div>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-4 text-xs text-muted">
        {note ?? (data.savedAt ? `Final profile saved ${data.savedAt} · audited` : "")}
      </p>
    </section>
  );
}
