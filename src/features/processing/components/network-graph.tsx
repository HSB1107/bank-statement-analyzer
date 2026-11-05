"use client";

import { useState } from "react";
import { formatCroreValue } from "@/shared/lib/format";
import { money } from "@/shared/lib/money";
import { Panel } from "@/shared/ui/panel";
import { type NetworkNode, type ProcessingPlan } from "../schemas/processing";

const HUB_POS = { icici: [300, 230], hdfc: [470, 230], sbi: [385, 330] } as const;

/** Live transaction network: counterparty nodes appear once counterparty identification has run. */
export function NetworkGraph({ plan, resolvedStage }: { plan: ProcessingPlan; resolvedStage: number }) {
  const [selected, setSelected] = useState<NetworkNode | null>(null);
  const visible = plan.network.nodes.filter((n) => resolvedStage >= n.appearsAtStage);
  const showTransfers = resolvedStage >= 12;
  const inflows = visible.filter((n) => n.side === "inflow");
  const outflows = visible.filter((n) => n.side === "outflow");
  const max = Math.max(...plan.network.nodes.map((n) => n.valueMinor), 1);
  const pos = (n: NetworkNode, i: number, count: number): [number, number] => {
    const y = 70 + (i * 330) / Math.max(1, count - 1);
    return n.side === "inflow" ? [70 + (i % 2) * 40, y] : [700 - (i % 2) * 40, y];
  };
  const hubs = plan.network.hubs;
  return (
    <Panel
      title="Live Transaction Network"
      meta={`forming as counterparties resolve · ${plan.periodLabel} · ₹ cr`}
      actions={
        <span className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 bg-positive" /> Inflow
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 bg-negative" /> Outflow
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 border-t border-dashed border-info" /> Own transfer
          </span>
        </span>
      }
    >
      <svg
        viewBox="0 0 770 430"
        className="h-auto w-full"
        role="img"
        aria-label={`Transaction network: ${visible.length} counterparties resolved`}
      >
        {[
          ...inflows.map((n, i) => ({ n, p: pos(n, i, inflows.length) })),
          ...outflows.map((n, i) => ({ n, p: pos(n, i, outflows.length) })),
        ].map(({ n, p }) => {
          const hub = HUB_POS[n.hub];
          const w = 1 + (n.valueMinor / max) * 7;
          const color = n.side === "inflow" ? "var(--positive)" : "var(--negative)";
          return (
            <g key={n.id}>
              <path
                d={`M ${p[0]} ${p[1]} Q ${(p[0] + hub[0]) / 2} ${(p[1] + hub[1]) / 2 - 30} ${hub[0]} ${hub[1]}`}
                fill="none"
                stroke={color}
                strokeOpacity={0.65}
                strokeWidth={w}
              />
              <g
                role="button"
                tabIndex={0}
                aria-label={`${n.label}: ₹${formatCroreValue(money(n.valueMinor))} cr`}
                onClick={() => setSelected(n)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(n)}
                className="cursor-pointer focus:outline-none"
              >
                <circle
                  cx={p[0]}
                  cy={p[1]}
                  r={9}
                  fill="var(--surface)"
                  stroke={color}
                  strokeWidth={2}
                  className={selected?.id === n.id ? "stroke-[3]" : undefined}
                />
                <text x={p[0]} y={p[1] + 24} textAnchor="middle" fontSize={11} fill="var(--muted)">
                  {n.label.length > 22 ? `${n.label.slice(0, 20)}…` : n.label}
                </text>
              </g>
            </g>
          );
        })}
        {showTransfers && hubs.length > 1 ? (
          <g>
            {hubs.slice(1).map((h) => (
              <path
                key={h.id}
                d={`M ${HUB_POS[hubs[0]?.id ?? "icici"][0]} ${HUB_POS[hubs[0]?.id ?? "icici"][1]} Q ${(HUB_POS[hubs[0]?.id ?? "icici"][0] + HUB_POS[h.id][0]) / 2} ${HUB_POS[h.id][1] + 50} ${HUB_POS[h.id][0]} ${HUB_POS[h.id][1]}`}
                fill="none"
                stroke="var(--info)"
                strokeDasharray="4 4"
                strokeWidth={2}
              />
            ))}
            <text x={385} y={190} textAnchor="middle" fontSize={11} fill="var(--info)" className="num">
              ⇄ ₹{formatCroreValue(money(plan.network.ownTransferMinor), 1)} cr own-account
            </text>
          </g>
        ) : null}
        {hubs.map((h) => (
          <g key={h.id}>
            <circle
              cx={HUB_POS[h.id][0]}
              cy={HUB_POS[h.id][1]}
              r={26}
              fill={
                h.id === "sbi"
                  ? "color-mix(in oklab, var(--warning) 25%, var(--surface))"
                  : "color-mix(in oklab, var(--lime) 18%, var(--surface))"
              }
              stroke={h.id === "sbi" ? "var(--warning)" : "var(--lime)"}
              strokeWidth={2}
            />
            <text
              x={HUB_POS[h.id][0]}
              y={HUB_POS[h.id][1] + 4}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill={h.id === "sbi" ? "var(--warning)" : "var(--lime)"}
              className="num"
            >
              {h.label}
            </text>
          </g>
        ))}
      </svg>
      <p className="num min-h-5 text-xs text-muted" aria-live="polite">
        {selected
          ? `${selected.label} · ${selected.side} · ₹${formatCroreValue(money(selected.valueMinor))} cr via ${selected.hub.toUpperCase()}`
          : visible.length
            ? "Select a node to inspect"
            : "Waiting for counterparty identification…"}
      </p>
    </Panel>
  );
}
