"use client";

import { Search } from "lucide-react";
import { IsoDateSchema } from "@/shared/lib/dates";
import { CategoryIdSchema } from "@/shared/data/schemas/category";
import { FilterSelect } from "@/shared/ui/select";
import { type TxnFilter, type TxnPage } from "../schemas/transactions";

const DATE_PRESETS = [
  { value: "all", label: "All", from: null, to: null },
  { value: "jun1-18", label: "1–18 Jun", from: "2026-06-01", to: "2026-06-18" },
  { value: "jun", label: "Jun", from: "2026-06-01", to: "2026-06-30" },
  { value: "q1", label: "Q1", from: "2026-01-01", to: "2026-03-31" },
  { value: "q2", label: "Q2", from: "2026-04-01", to: "2026-06-30" },
] as const;

export function FiltersBar({
  filter,
  onChange,
  facets,
  corporate,
}: {
  filter: TxnFilter;
  onChange: (f: TxnFilter) => void;
  facets: TxnPage["facets"] | undefined;
  corporate: boolean;
}) {
  const datePreset =
    DATE_PRESETS.find((p) => p.from === filter.dateFrom && p.to === filter.dateTo)?.value ?? "all";
  const amountPresets = corporate
    ? [
        { value: "0", label: "Any" },
        { value: String(10_00_000_00), label: "≥ ₹0.10 cr" },
        { value: String(1_00_00_000_00), label: "≥ ₹1.00 cr" },
      ]
    : [
        { value: "0", label: "Any" },
        { value: String(10_000_00), label: "≥ ₹10,000" },
        { value: String(1_00_000_00), label: "≥ ₹1 L" },
      ];
  const set = (patch: Partial<TxnFilter>) => onChange({ ...filter, ...patch });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative flex min-w-[220px] flex-1 items-center">
        <span className="sr-only">Search narration or reference</span>
        <Search className="pointer-events-none absolute left-3 size-4 text-subtle" aria-hidden />
        <input
          value={filter.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search narration, ref..."
          className="h-9 w-full rounded-lg border border-border-strong bg-surface-2 pr-3 pl-9 text-sm text-fg outline-none placeholder:text-subtle focus:border-info"
        />
      </label>
      <FilterSelect
        label="Date"
        size="sm"
        value={datePreset}
        options={DATE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
        onValueChange={(v) => {
          const p = DATE_PRESETS.find((x) => x.value === v);
          set({
            dateFrom: p?.from ? IsoDateSchema.parse(p.from) : null,
            dateTo: p?.to ? IsoDateSchema.parse(p.to) : null,
          });
        }}
      />
      <FilterSelect
        label="Amount"
        size="sm"
        value={String(filter.minAmountMinor)}
        options={amountPresets}
        onValueChange={(v) => set({ minAmountMinor: Number(v) })}
      />
      <FilterSelect
        label="Dr/Cr"
        size="sm"
        value={filter.direction}
        options={[
          { value: "all", label: "All" },
          { value: "debit", label: "Debit" },
          { value: "credit", label: "Credit" },
        ]}
        onValueChange={(v) => set({ direction: v === "debit" || v === "credit" ? v : "all" })}
      />
      <FilterSelect
        label="Category"
        size="sm"
        value={filter.category}
        options={[
          { value: "all", label: "All" },
          ...(facets?.categories ?? []).map((c) => ({ value: c.id, label: c.label })),
        ]}
        onValueChange={(v) =>
          set({ category: v === "all" ? "all" : (CategoryIdSchema.safeParse(v).data ?? "all") })
        }
      />
      <FilterSelect
        label="Counterparty"
        size="sm"
        value={filter.counterparty || "all"}
        options={[
          { value: "all", label: "All" },
          ...(facets?.counterparties ?? []).map((c) => ({ value: c, label: c })),
        ]}
        onValueChange={(v) => set({ counterparty: v === "all" ? "" : v })}
      />
      <FilterSelect
        label="Confidence"
        size="sm"
        value={filter.confidence}
        options={[
          { value: "all", label: "All" },
          { value: "low", label: "< 85%" },
          { value: "high", label: "≥ 85%" },
        ]}
        onValueChange={(v) => set({ confidence: v === "low" || v === "high" ? v : "all" })}
      />
    </div>
  );
}
