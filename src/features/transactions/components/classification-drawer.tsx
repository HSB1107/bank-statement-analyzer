"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { formatDayMonth, formatUpperDate } from "@/shared/lib/dates";
import { formatCroreValue, formatIndianNumber, formatMoney, formatPercent } from "@/shared/lib/format";
import { toMajor } from "@/shared/lib/money";
import {
  CATEGORY_IDS,
  categoryLabel,
  CategoryIdSchema,
  type CategoryId,
} from "@/shared/data/schemas/category";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { ProvenanceTag } from "@/shared/ui/provenance-tag";
import { FilterSelect } from "@/shared/ui/select";
import { ErrorState, Skeleton } from "@/shared/ui/states";
import { type TxnAction, type TxnDetail } from "../schemas/transactions";

type Pending = { kind: "change_category"; category: CategoryId } | { kind: "comment"; text: string } | null;

const DEFAULT_REASON: Readonly<Record<TxnAction["kind"], string>> = {
  accept: "Classification confirmed by analyst",
  change_category: "Reclassified after review",
  internal_transfer: "Matched to own account",
  mark_recurring: "Recurring pattern confirmed",
  comment: "Analyst note",
  toggle_non_operating: "Excluded from operating cash flow",
  flag: "Flagged for investigation",
};

export function ClassificationDrawer({
  detail,
  isPending,
  error,
  corporate,
  onAction,
  busy,
}: {
  detail: TxnDetail | undefined;
  isPending: boolean;
  error: unknown;
  corporate: boolean;
  onAction: (a: TxnAction, reason: string) => void;
  busy: boolean;
}) {
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState("");
  if (error) return <ErrorState error={error} />;
  if (isPending || !detail) return <Skeleton className="h-64" />;
  const r = detail.row;
  const amount = corporate ? `₹${formatCroreValue(r.amount)} cr` : formatMoney(r.amount);
  const run = (a: TxnAction) => {
    onAction(a, reason.trim() || DEFAULT_REASON[a.kind]);
    setPending(null);
    setReason("");
  };
  const actionBtn = (label: string, a: TxnAction | "open-category" | "open-comment", active = false) => (
    <Button
      size="sm"
      variant={active ? "selected" : "secondary"}
      aria-pressed={active}
      disabled={busy}
      onClick={() =>
        a === "open-category"
          ? setPending({ kind: "change_category", category: r.category })
          : a === "open-comment"
            ? setPending({ kind: "comment", text: "" })
            : run(a)
      }
    >
      {label}
    </Button>
  );
  return (
    <section
      aria-labelledby="drawer-title"
      className="rounded-[var(--radius-card)] border border-info/50 bg-surface shadow-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="border-l-2 border-info pl-4">
          <p className="label-micro text-info">
            Classification drawer · {detail.accountLabel} · {formatUpperDate(r.date)} · row{" "}
            {formatIndianNumber(detail.source.row)}
          </p>
          <h2 id="drawer-title" className="mt-1 text-lg font-semibold text-fg">
            {amount} {r.direction} ·{" "}
            {detail.normalised.toLowerCase().startsWith("cheque")
              ? `cheque deposit from ${detail.counterparty.name}`
              : detail.normalised}
          </h2>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {actionBtn("Accept", { kind: "accept" })}
          {actionBtn("Change category", "open-category")}
          {actionBtn("Internal transfer", { kind: "internal_transfer" })}
          {actionBtn("Mark recurring", { kind: "mark_recurring" }, detail.recurring)}
          {actionBtn("Comment", "open-comment")}
          {actionBtn("Non-operating", { kind: "toggle_non_operating" }, detail.nonOperating)}
          <Button
            size="sm"
            variant="warning"
            aria-pressed={r.flagged}
            disabled={busy}
            onClick={() => run({ kind: "flag" })}
          >
            <AlertTriangle aria-hidden /> {r.flagged ? "Flagged for investigation" : "Flag for investigation"}
          </Button>
        </div>
      </header>
      {pending ? (
        <form
          className="flex flex-wrap items-end gap-3 border-b border-border bg-surface-2 px-5 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (pending.kind === "change_category")
              run({ kind: "change_category", category: pending.category });
            else if (pending.text.trim()) run({ kind: "comment", text: pending.text.trim() });
          }}
        >
          {pending.kind === "change_category" ? (
            <FilterSelect
              label="New category"
              size="sm"
              value={pending.category}
              options={CATEGORY_IDS.map((c) => ({ value: c, label: categoryLabel(c) }))}
              onValueChange={(v) =>
                setPending({ kind: "change_category", category: CategoryIdSchema.parse(v) })
              }
            />
          ) : (
            <label className="flex-1">
              <span className="label-micro">Comment</span>
              <input
                autoFocus
                value={pending.text}
                onChange={(e) => setPending({ kind: "comment", text: e.target.value })}
                className="mt-1 h-9 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-fg outline-none focus:border-info"
              />
            </label>
          )}
          <label className="min-w-[260px] flex-1">
            <span className="label-micro">Reason (audited)</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={DEFAULT_REASON[pending.kind]}
              className="mt-1 h-9 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-fg outline-none focus:border-info"
            />
          </label>
          <Button size="sm" variant="info" type="submit" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
            Cancel
          </Button>
        </form>
      ) : null}
      <div className="grid gap-5 px-5 py-4 xl:grid-cols-[1fr_1.1fr_1fr]">
        <div>
          <p className="label-micro flex items-center gap-2">
            Original bank description <ProvenanceTag value={detail.original.provenance} />
          </p>
          <p className="num mt-2 rounded-md border border-border-strong bg-black/30 px-3 py-2.5 text-sm text-fg">
            {detail.original.narration}
          </p>
          <dl className="mt-3 grid grid-cols-[96px_1fr] gap-y-1.5 text-sm">
            <dt className="text-subtle">Normalised</dt>
            <dd className="text-fg">{detail.normalised}</dd>
            <dt className="text-subtle">Counterparty</dt>
            <dd className="text-fg">
              {detail.counterparty.name}{" "}
              {detail.counterparty.isNew ? (
                <span className="num text-[11px] text-warning">
                  new · first seen {formatDayMonth(detail.counterparty.firstSeen)}
                </span>
              ) : (
                <span className="num text-[11px] text-subtle">{detail.counterparty.transactions} txns</span>
              )}
            </dd>
            <dt className="text-subtle">Source</dt>
            <dd className="num text-[12px] text-fg">
              {detail.source.fileName} {detail.source.page ? `· p.${detail.source.page}` : ""} · row{" "}
              {formatIndianNumber(detail.source.row)}
            </dd>
            <dt className="text-subtle">Extraction</dt>
            <dd className="num text-[12px] text-positive">
              {formatPercent(detail.extraction.confidence, 0)} · {detail.extraction.method}
            </dd>
          </dl>
        </div>
        <div className="rounded-lg border border-magenta/40 bg-magenta/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <ProvenanceTag value="AI" />
            <Chip tone="positive" variant="outline">
              {detail.ai.group}
            </Chip>
            <span aria-hidden className="text-subtle">
              ›
            </span>
            <Chip tone="positive" variant="outline">
              {detail.ai.category}
            </Chip>
            <span
              className={cn(
                "num ml-auto text-sm",
                detail.ai.confidence < 0.85 ? "text-warning" : "text-positive",
              )}
            >
              {detail.ai.confidence.toFixed(2)}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-fg">{detail.ai.reasoning}</p>
          {detail.ai.alternatives.length ? (
            <p className="mt-2 text-xs text-subtle">
              Alternatives:{" "}
              {detail.ai.alternatives
                .map((a) => `${a.label.toLowerCase()} ${a.probability.toFixed(2)}`)
                .join(" · ")}
            </p>
          ) : null}
          {r.overridden ? (
            <p className="mt-2 text-xs text-info">Analyst override in effect: {r.categoryLabel}</p>
          ) : null}
        </div>
        <div>
          <p className="label-micro">Related transactions</p>
          <ul className="mt-2 space-y-1.5">
            {detail.related.map((x) => (
              <li key={x.id} className="num grid grid-cols-[52px_44px_1fr_auto] gap-2 text-[12px]">
                <span className="text-subtle">{formatDayMonth(x.date)}</span>
                <span className="text-muted">{x.accountShort}</span>
                <span className="truncate text-fg">{x.narration}</span>
                <span className={x.direction === "credit" ? "text-positive" : "text-negative"}>
                  {x.direction === "debit" ? "(" : ""}
                  {corporate ? formatCroreValue(x.amount) : formatIndianNumber(toMajor(x.amount))}
                  {x.direction === "debit" ? ")" : ""}
                </span>
              </li>
            ))}
          </ul>
          {detail.relatedNote ? <p className="mt-3 text-sm text-warning">{detail.relatedNote}</p> : null}
          <p className="mt-2 text-xs text-subtle">
            Original values are preserved; every change is audited with a reason.
          </p>
          {detail.audit.length ? (
            <ul
              className="mt-2 space-y-1 border-t border-border pt-2 text-[11px] text-muted"
              aria-label="Audit trail"
            >
              {detail.audit.slice(-3).map((a) => (
                <li key={a.id}>
                  <span className="num text-subtle">{a.at.slice(11, 16)}</span> {a.actor} ·{" "}
                  {a.action.toLowerCase().replace(/_/g, " ")} — “{a.reason}”
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
