"use client";

import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/shared/lib/cn";
import { formatDayMonth } from "@/shared/lib/dates";
import { formatCroreValue, formatIndianNumber } from "@/shared/lib/format";
import { toMajor, type Money } from "@/shared/lib/money";
import { type TransactionId } from "@/shared/data/schemas/ids";
import { ConfidenceBar } from "@/shared/ui/meter";
import { type TxnRow } from "../schemas/transactions";
import { CategoryChip } from "./category-chip";

const col = createColumnHelper<TxnRow>();

/** Column definitions (data). `corporate` switches amount units (₹ crore vs ₹). */
function columns(corporate: boolean) {
  const amt = (m: Money) => (corporate ? formatCroreValue(m) : formatIndianNumber(toMajor(m), 0));
  return [
    col.accessor("date", {
      header: "Date",
      size: 66,
      cell: (c) => <span className="num text-fg">{formatDayMonth(c.getValue())}</span>,
    }),
    col.accessor("accountShort", {
      header: "Acct",
      size: 64,
      cell: (c) => (
        <span className="num rounded border border-border-strong px-1.5 py-0.5 text-[10px] text-muted">
          {c.getValue()}
        </span>
      ),
    }),
    col.accessor("narration", {
      header: "Description · Reference",
      size: 320,
      cell: (c) => (
        <span className="block min-w-0">
          <span className="num block truncate text-[12px] text-fg">{c.getValue()}</span>
          <span className="num block truncate text-[10px] text-subtle">{c.row.original.reference}</span>
        </span>
      ),
    }),
    col.accessor("counterparty", {
      header: "Counterparty",
      size: 180,
      cell: (c) => <span className="block truncate text-fg">{c.getValue()}</span>,
    }),
    col.display({
      id: "debit",
      header: "Debit",
      size: 72,
      cell: (c) => (
        <span className="num text-negative">
          {c.row.original.direction === "debit" ? amt(c.row.original.amount) : "–"}
        </span>
      ),
    }),
    col.display({
      id: "credit",
      header: "Credit",
      size: 72,
      cell: (c) => (
        <span className="num text-positive">
          {c.row.original.direction === "credit" ? amt(c.row.original.amount) : "–"}
        </span>
      ),
    }),
    col.accessor("balance", {
      header: "Balance",
      size: 78,
      cell: (c) => <span className="num text-fg">{amt(c.getValue())}</span>,
    }),
    col.accessor("categoryLabel", {
      header: "Category",
      size: 168,
      cell: (c) => (
        <CategoryChip
          category={c.row.original.category}
          group={c.row.original.categoryGroup}
          label={c.getValue()}
        />
      ),
    }),
    col.accessor("confidence", {
      header: "Conf.",
      size: 78,
      cell: (c) => <ConfidenceBar value={c.getValue()} />,
    }),
  ];
}

const ROW_H = 52;
const RIGHT = new Set(["debit", "credit", "balance"]);

export function TxnTable({
  rows,
  corporate,
  selected,
  onSelect,
}: {
  rows: TxnRow[];
  corporate: boolean;
  selected: TransactionId | null;
  onSelect: (id: TransactionId) => void;
}) {
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns mutable instances; the compiler skips memoising this component.
  const table = useReactTable({
    data: rows,
    columns: columns(corporate),
    getCoreRowModel: getCoreRowModel(),
  });
  const parent = useRef<HTMLDivElement>(null);
  const model = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: model.length,
    getScrollElement: () => parent.current,
    estimateSize: () => ROW_H,
    overscan: 12,
  });
  const template = table
    .getVisibleFlatColumns()
    .map((c) =>
      c.id === "narration"
        ? "minmax(190px,2fr)"
        : c.id === "counterparty"
          ? "minmax(130px,1fr)"
          : `${c.getSize()}px`,
    )
    .join(" ");

  const onKey = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
    const next = e.key === "ArrowDown" ? index + 1 : e.key === "ArrowUp" ? index - 1 : null;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const r = model[index];
      if (r) onSelect(r.original.id);
    }
    if (next !== null && next >= 0 && next < model.length) {
      e.preventDefault();
      virtualizer.scrollToIndex(next);
      requestAnimationFrame(() =>
        parent.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus(),
      );
    }
  };

  return (
    <div
      role="table"
      aria-label="Transactions"
      aria-rowcount={model.length + 1}
      className="scrollbar-thin overflow-x-auto"
    >
      <div className="min-w-[980px]">
        <div role="row" className="grid border-b border-border" style={{ gridTemplateColumns: template }}>
          {table.getFlatHeaders().map((h) => (
            <div
              key={h.id}
              role="columnheader"
              className={cn("label-micro px-3 py-2.5", RIGHT.has(h.id) && "text-right")}
            >
              {flexRender(h.column.columnDef.header, h.getContext())}
            </div>
          ))}
        </div>
        <div ref={parent} className="relative h-[560px] scrollbar-thin overflow-y-auto">
          <div style={{ height: virtualizer.getTotalSize() }} className="relative">
            {virtualizer.getVirtualItems().map((v) => {
              const r = model[v.index];
              if (!r) return null;
              const t = r.original;
              const isSel = t.id === selected;
              return (
                <div
                  key={t.id}
                  role="row"
                  aria-rowindex={v.index + 2}
                  aria-selected={isSel}
                  data-index={v.index}
                  tabIndex={isSel || (selected === null && v.index === 0) ? 0 : -1}
                  onClick={() => onSelect(t.id)}
                  onKeyDown={(e) => onKey(e, v.index)}
                  className={cn(
                    "absolute inset-x-0 grid cursor-pointer items-center border-b border-border/60 text-sm transition-colors hover:bg-surface-2 focus-visible:outline-offset-[-2px]",
                    isSel && "bg-info/8 shadow-[inset_2px_0_0_var(--info)]",
                    t.excluded && "opacity-55",
                    t.ownTransferPair &&
                      !isSel &&
                      "shadow-[inset_2px_0_0_color-mix(in_oklab,var(--info)_60%,transparent)]",
                    t.confidence < 0.85 && !isSel && "shadow-[inset_2px_0_0_var(--warning)]",
                  )}
                  style={{
                    height: ROW_H,
                    transform: `translateY(${v.start}px)`,
                    gridTemplateColumns: template,
                  }}
                >
                  {r.getVisibleCells().map((c) => (
                    <div
                      key={c.id}
                      role="cell"
                      className={cn("min-w-0 px-3", RIGHT.has(c.column.id) && "text-right")}
                    >
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
