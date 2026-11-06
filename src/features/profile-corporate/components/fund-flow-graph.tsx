"use client";

import { type KeyboardEvent } from "react";
import { cn } from "@/shared/lib/cn";
import { formatCroreValue } from "@/shared/lib/format";
import { type Money } from "@/shared/lib/money";
import { TONE_VAR } from "@/shared/ui/tone";
import { type FundFlow } from "../schemas/corporate";

export type FlowFilter = "all" | "in" | "out" | "own" | "related" | "large";

type Node = FundFlow["nodes"][number];
type Kind = Node["kind"];

interface Placed extends Node {
  x: number;
  y: number;
  r: number;
}

interface Edge {
  id: string;
  from: string;
  to: string;
  value: number;
  kind: "in" | "out" | "own" | "related";
  dashed: boolean;
  color: string;
}

const W = 1000;
const H = 600;
const CR = 1e9; // minor units per ₹ crore

const KIND_COLOR: Readonly<Record<Kind, string>> = {
  own: TONE_VAR.info,
  customer: TONE_VAR.positive,
  supplier: TONE_VAR.negative,
  payroll: TONE_VAR.negative,
  statutory: TONE_VAR.negative,
  lender: TONE_VAR.magenta,
  flagged: TONE_VAR.warning,
};

const crValue = (m: Money) => m.amountMinor / CR;

/** Deterministic column layout: payers left, own accounts centre, payees right, lenders/flagged bottom. */
function layout(nodes: readonly Node[]): Placed[] {
  const maxFlow = Math.max(...nodes.map((n) => Math.max(crValue(n.inflow), crValue(n.outflow))), 1);
  const radius = (n: Node) =>
    n.kind === "own" ? 30 : 12 + 22 * Math.sqrt(Math.max(crValue(n.inflow), crValue(n.outflow)) / maxFlow);
  const columns: Record<"left" | "centre" | "right" | "bottom", Node[]> = {
    left: nodes.filter((n) => n.kind === "customer"),
    centre: nodes.filter((n) => n.kind === "own"),
    right: nodes.filter((n) => n.kind === "supplier" || n.kind === "payroll" || n.kind === "statutory"),
    bottom: nodes.filter((n) => n.kind === "lender" || n.kind === "flagged"),
  };
  const spread = (list: Node[], x: number, top: number, bottom: number): Placed[] =>
    list.map((n, i) => ({
      ...n,
      x,
      y: list.length === 1 ? (top + bottom) / 2 : top + ((bottom - top) * i) / (list.length - 1),
      r: radius(n),
    }));
  return [
    ...spread(columns.left, 150, 60, 470),
    ...spread(columns.centre, 500, 110, 400),
    ...spread(columns.right, 850, 60, 470),
    ...columns.bottom.map((n, i) => ({
      ...n,
      x: columns.bottom.length === 1 ? 500 : 340 + (320 * i) / (columns.bottom.length - 1),
      y: 540,
      r: radius(n),
    })),
  ];
}

function buildEdges(nodes: readonly Placed[], ownTransfers: Money): Edge[] {
  const edges: Edge[] = [];
  const hubId = (hub: string) => `own-${hub}`;
  for (const n of nodes) {
    if (n.kind === "own") continue;
    const hub = hubId(n.hub);
    if (n.kind === "flagged") {
      // Round trip: out from the hub account, back into a different own account.
      edges.push({
        id: `${n.id}-out`,
        from: hub,
        to: n.id,
        value: crValue(n.outflow),
        kind: "related",
        dashed: false,
        color: TONE_VAR.warning,
      });
      const backTo = nodes.find((o) => o.kind === "own" && o.id !== hub && o.id !== "own-sbi")?.id ?? hub;
      edges.push({
        id: `${n.id}-in`,
        from: n.id,
        to: backTo,
        value: crValue(n.inflow),
        kind: "related",
        dashed: true,
        color: TONE_VAR.warning,
      });
      continue;
    }
    if (n.inflow.amountMinor > 0)
      edges.push({
        id: `${n.id}-in`,
        from: n.id,
        to: hub,
        value: crValue(n.inflow),
        kind: "in",
        dashed: false,
        color: KIND_COLOR[n.kind],
      });
    if (n.outflow.amountMinor > 0)
      edges.push({
        id: `${n.id}-out`,
        from: hub,
        to: n.id,
        value: crValue(n.outflow),
        kind: "out",
        dashed: false,
        color: KIND_COLOR[n.kind],
      });
  }
  const own = nodes.filter((n) => n.kind === "own");
  const perPair = crValue(ownTransfers) / Math.max(own.length - 1, 1);
  for (let i = 0; i < own.length - 1; i++) {
    const a = own[i];
    const b = own[i + 1];
    if (a && b)
      edges.push({
        id: `own-${a.id}-${b.id}`,
        from: a.id,
        to: b.id,
        value: perPair,
        kind: "own",
        dashed: true,
        color: TONE_VAR.info,
      });
  }
  return edges;
}

function visible(edge: Edge, filter: FlowFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "in":
      return edge.kind === "in";
    case "out":
      return edge.kind === "out";
    case "own":
      return edge.kind === "own";
    case "related":
      return edge.kind === "related";
    case "large":
      return edge.value >= 1;
  }
}

function curve(a: Placed, b: Placed): string {
  const mx = (a.x + b.x) / 2;
  if (Math.abs(a.x - b.x) < 1) {
    const bend = a.x + 70;
    return `M ${a.x} ${a.y} C ${bend} ${a.y}, ${bend} ${b.y}, ${b.x} ${b.y}`;
  }
  return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
}

export function FundFlowGraph({
  data,
  filter,
  selected,
  onSelect,
}: {
  data: FundFlow;
  filter: FlowFilter;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const nodes = layout(data.nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = buildEdges(nodes, data.ownTransfers);
  const maxEdge = Math.max(...edges.map((e) => e.value), 1);
  const shownEdges = edges.filter((e) => visible(e, filter));
  const active = new Set(shownEdges.flatMap((e) => [e.from, e.to]));
  const ownCentre = nodes.filter((n) => n.kind === "own");
  const onKey = (id: string) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
    }
  };
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="group"
      aria-label="Transaction intelligence graph. Each counterparty is a button; select one to see its details."
    >
      <g aria-hidden>
        {shownEdges.map((e) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          const touchesSelected = e.from === selected || e.to === selected;
          return (
            <path
              key={e.id}
              d={curve(a, b)}
              fill="none"
              stroke={e.color}
              strokeWidth={1 + 13 * Math.sqrt(e.value / maxEdge)}
              strokeOpacity={touchesSelected ? 0.85 : 0.32}
              strokeDasharray={e.dashed ? "6 5" : undefined}
              strokeLinecap="round"
            />
          );
        })}
        {ownCentre.length > 1 && (filter === "all" || filter === "own") ? (
          <text x={575} y={(ownCentre[0]?.y ?? 0) + 70} className="num" fontSize={12} fill="var(--info)">
            ⇄ ₹{formatCroreValue(data.ownTransfers)} cr own transfers
          </text>
        ) : null}
      </g>
      {nodes.map((n) => {
        const isSelected = n.id === selected;
        const dim = !active.has(n.id) && n.kind !== "own";
        const color = KIND_COLOR[n.kind];
        const anchor = n.kind === "customer" ? "end" : n.kind === "own" ? "middle" : "start";
        const labelX = n.kind === "customer" ? n.x - n.r - 10 : n.kind === "own" ? n.x : n.x + n.r + 10;
        const labelY = n.kind === "own" ? n.y + n.r + 16 : n.y - 2;
        const flow =
          n.kind === "own"
            ? n.share
            : `₹${formatCroreValue(n.inflow.amountMinor > 0 && n.kind !== "flagged" && n.kind !== "lender" ? n.inflow : n.outflow)} cr · ${n.share}`;
        return (
          <g
            key={n.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`${n.label}, ${flow}`}
            onClick={() => onSelect(n.id)}
            onKeyDown={onKey(n.id)}
            className={cn(
              "cursor-pointer outline-none [&:focus-visible>circle]:stroke-[var(--fg)]",
              dim && "opacity-35",
            )}
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={color}
              fillOpacity={n.kind === "own" ? 0.14 : 0.22}
              stroke={isSelected ? "var(--fg)" : color}
              strokeWidth={isSelected ? 3 : 1.5}
              strokeDasharray={n.kind === "own" ? "4 3" : undefined}
            />
            {n.kind === "own" ? (
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--fg)">
                {n.label}
              </text>
            ) : null}
            {n.kind !== "own" ? (
              <text x={labelX} y={labelY} textAnchor={anchor} fontSize={13} fontWeight={600} fill="var(--fg)">
                {n.label}
              </text>
            ) : null}
            <text
              x={labelX}
              y={n.kind === "own" ? labelY : labelY + 15}
              textAnchor={anchor}
              fontSize={11}
              className="num"
              fill={n.kind === "flagged" ? "var(--warning)" : "var(--muted)"}
            >
              {flow}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
