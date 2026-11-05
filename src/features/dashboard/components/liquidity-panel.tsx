"use client";

import { useState } from "react";
import { formatMoney, formatPercent } from "@/shared/lib/format";
import { Meter } from "@/shared/ui/meter";
import { Panel, SubCard } from "@/shared/ui/panel";
import { FilterSelect } from "@/shared/ui/select";
import { ErrorState, PanelSkeleton } from "@/shared/ui/states";
import { type LiquidityQuery } from "../schemas/dashboard";
import { useLiquidity } from "../hooks/use-dashboard";

const GROUP_LABEL = { retail: "Retail", corporate_all: "Corporate" } as const;

export function LiquidityPanel() {
  const [query, setQuery] = useState<LiquidityQuery>({ group: "retail", currency: "INR" });
  const q = useLiquidity(query);
  const l = q.data;
  const key = (x: LiquidityQuery) => `${x.group}:${x.currency}`;
  return (
    <Panel
      title="Liquidity & Risk"
      actions={
        l ? (
          <FilterSelect
            ariaLabel="Segment and currency"
            size="sm"
            value={key(query)}
            options={l.options.map((o) => ({
              value: key(o),
              label: `${GROUP_LABEL[o.group]} · ${o.currency}`,
            }))}
            onValueChange={(v) => {
              const next = l.options.find((o) => key(o) === v);
              if (next) setQuery(next);
            }}
          />
        ) : null
      }
    >
      {q.isPending ? (
        <PanelSkeleton rows={4} className="border-0 p-0 shadow-none" />
      ) : q.isError || !l ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Avg monthly inflows", formatMoney(l.avgInflow, { scale: "lakh" }), "text-fg"],
              ["Avg monthly outflows", formatMoney(l.avgOutflow, { scale: "lakh" }), "text-fg"],
              ["Avg net cash flow", formatMoney(l.avgNet, { scale: "thousand" }), "text-positive"],
              ["Avg monthly balance", formatMoney(l.avgBalance, { scale: "lakh" }), "text-fg"],
            ].map(([label, value, cls]) => (
              <SubCard key={label}>
                <p className="text-xs text-muted">{label}</p>
                <p className={`num mt-1 text-lg font-semibold ${cls}`}>{value}</p>
              </SubCard>
            ))}
          </div>
          <p className="label-micro mt-5 mb-2">% of customers</p>
          <ul className="space-y-2.5 text-sm">
            {[
              ["Negative net cash flow", l.negativeNetShare, "warning"],
              ["Irregular income", l.irregularIncomeShare, "warning"],
              ["FOIR above 50%", l.foirAbove50Share, "negative"],
            ].map(([label, value, tone]) => (
              <li key={String(label)} className="flex items-center gap-3">
                <span className="flex-1 text-fg">{label}</span>
                <Meter
                  value={Number(value) * 2.5}
                  tone={tone === "negative" ? "negative" : "warning"}
                  className="w-20"
                  label={String(label)}
                />
                <span
                  className={`num w-12 text-right ${tone === "negative" ? "text-negative" : "text-warning"}`}
                >
                  {formatPercent(Number(value))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
