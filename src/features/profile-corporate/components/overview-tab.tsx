"use client";

import { ChartLegend } from "@/shared/charts/chart-frame";
import { ProfileRadar } from "@/shared/charts/profile-radar";
import { formatAvailability, formatMoney, formatMultiple, formatPercent } from "@/shared/lib/format";
import { AiSummary, InsightList } from "@/shared/ui/ai-summary";
import { Chip } from "@/shared/ui/chip";
import { HealthScoreCard } from "@/shared/ui/health-score-card";
import { KpiGrid } from "@/shared/ui/kpi-card";
import { renderKpis, type KpiDef } from "@/shared/ui/kpi-defs";
import { Meter } from "@/shared/ui/meter";
import { Panel } from "@/shared/ui/panel";
import { type CorporateOverview } from "../schemas/corporate";

const crore = { scale: "crore" } as const;

const KPIS: readonly KpiDef<CorporateOverview>[] = [
  {
    id: "receipts",
    label: "Receipts proxy",
    provenance: "DERIVED",
    tone: "positive",
    value: (o) => formatMoney(o.kpis.receiptsProxy, crore),
    caption: () => "H1 · excl. transfers, loans, related party",
  },
  {
    id: "opout",
    label: "Operating outflows",
    provenance: "DERIVED",
    value: (o) => formatMoney(o.kpis.operatingOutflows, crore),
    caption: () => "suppliers, payroll, statutory, opex",
  },
  {
    id: "netop",
    label: "Net op. cash proxy",
    provenance: "DERIVED",
    accent: "warning",
    tone: (o) => (o.kpis.netOperating.amountMinor < 0 ? "negative" : "positive"),
    value: (o) => formatMoney(o.kpis.netOperating, { ...crore, sign: "always" }),
    caption: (o) =>
      `Q1 ${formatMoney(o.kpis.q1NetOperating, { ...crore, sign: "always" })} · Q2 ${formatMoney(o.kpis.q2NetOperating, { ...crore, sign: "always" })}`,
  },
  {
    id: "top3",
    label: "Top-3 inflow share",
    provenance: "DERIVED",
    tone: "warning",
    value: (o) => formatPercent(o.kpis.top3Share),
    caption: (o) => o.kpis.top3Names.join(" · "),
  },
  {
    id: "od",
    label: "OD utilisation (Jun)",
    provenance: "DERIVED",
    accent: "warning",
    tone: "warning",
    value: (o) => formatAvailability(o.kpis.odUtilJune, (v) => formatPercent(v)),
    caption: (o) =>
      `vs ${formatAvailability(o.kpis.odLimit, (m) => formatMoney(m, crore), "unverified limit")} sanctioned · peak ${formatPercent(o.kpis.odPeak, 0)}`,
  },
  {
    id: "dsp",
    label: "Debt service proxy",
    provenance: "DERIVED",
    accent: "warning",
    tone: (o) => (o.kpis.debtServiceProxy < 1 ? "negative" : "positive"),
    value: (o) => formatMultiple(o.kpis.debtServiceProxy),
    caption: () => "net op. cash ÷ debt service · H1",
  },
];

export function CorporateOverviewTab({ data }: { data: CorporateOverview }) {
  const h = data.health;
  const maxShare = Math.max(...data.concentration.rows.map((r) => r.share), 0.01);
  return (
    <div className="space-y-4">
      <KpiGrid items={renderKpis(KPIS, data)} className="xl:grid-cols-6 2xl:grid-cols-6" />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1.5fr)]">
        <HealthScoreCard
          data={{
            score: h.score,
            band: h.band,
            previous: h.previous,
            previousPeriod: h.previousPeriod,
            cutoffs: h.cutoffs,
            model: h.model,
            dimensions: h.dimensions,
            confidences: [
              { label: "Model confidence", value: h.modelConfidence.toFixed(2), tone: "info" },
              { label: "Completeness", value: formatPercent(h.completeness), tone: "warning" },
            ],
          }}
        />
        <Panel
          title="Corporate Profile Radar"
          actions={
            <ChartLegend
              config={{
                c: { label: data.radar.currentLabel, color: "var(--lime)" },
                p: { label: data.radar.previousLabel, color: "var(--info)" },
              }}
              dashed={["p"]}
            />
          }
        >
          <ProfileRadar
            axes={data.radar.axes}
            currentLabel={data.radar.currentLabel}
            previousLabel={data.radar.previousLabel}
            height={360}
          />
          <p className="mt-2 text-xs text-subtle">
            Corporate axes replace individual ones (income, FOIR, spending) — retail metrics are not shown for
            business customers.
          </p>
        </Panel>
        <AiSummary
          headline={data.summary.headline}
          lines={data.summary.lines}
          citations={data.summary.citations}
          confidence={data.summary.confidence}
        />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel
          title="Inflow Concentration"
          meta="share of external inflows · H1"
          actions={
            <Chip
              tone={data.concentration.hhi >= 0.18 ? "negative" : "warning"}
              variant="outline"
              mono
              size="xs"
            >
              HHI {data.concentration.hhi.toFixed(2)} · {data.concentration.hhi >= 0.18 ? "high" : "moderate"}
            </Chip>
          }
        >
          <ul className="space-y-3">
            {data.concentration.rows.map((r, i) => (
              <li key={r.label}>
                <p className="flex justify-between text-sm">
                  <span className="text-fg">{r.label}</span>
                  <span className="num text-fg">{formatPercent(r.share)}</span>
                </p>
                <Meter
                  value={r.share / maxShare}
                  tone={i === 0 ? "warning" : i < 3 ? "lime" : "neutral"}
                  className="mt-1"
                  label={`${r.label} share ${formatPercent(r.share)}`}
                />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Overall Assessment" meta="analytical view · not a credit decision" bodyClassName="pt-0">
          <div className="grid gap-4 md:grid-cols-3 [&>section]:h-full">
            <InsightList title="Financial Strengths" items={data.assessment.strengths} tone="positive" />
            <InsightList title="Financial Concerns" items={data.assessment.concerns} tone="negative" />
            <InsightList title="Underwriter Attention" items={data.assessment.attention} tone="warning" />
          </div>
        </Panel>
      </div>
    </div>
  );
}
