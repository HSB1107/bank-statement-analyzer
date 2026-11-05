"use client";

import { ProfileRadar } from "@/shared/charts/profile-radar";
import { formatDayMonth } from "@/shared/lib/dates";
import { formatMoney, formatPercent } from "@/shared/lib/format";
import { AiSummary, InsightList } from "@/shared/ui/ai-summary";
import { ChartLegend } from "@/shared/charts/chart-frame";
import { HealthScoreCard } from "@/shared/ui/health-score-card";
import { KpiGrid } from "@/shared/ui/kpi-card";
import { Meter } from "@/shared/ui/meter";
import { Panel } from "@/shared/ui/panel";
import { TONE_TEXT } from "@/shared/ui/tone";
import { type IndividualOverview } from "../schemas/individual";
import { renderKpis, type KpiDef } from "./kpi-defs";

const KPIS: readonly KpiDef<IndividualOverview>[] = [
  {
    id: "income",
    label: "Avg monthly income",
    provenance: "FACT",
    tone: "positive",
    value: (o) => formatMoney(o.kpis.avgMonthlyIncome),
    caption: () => "salary + interest only",
  },
  {
    id: "outflow",
    label: "Avg monthly outflow",
    provenance: "DERIVED",
    value: (o) => formatMoney(o.kpis.avgMonthlyOutflow),
    caption: () => "excl. one-offs & SIP",
  },
  {
    id: "e2i",
    label: "Expense-to-income",
    provenance: "DERIVED",
    tone: "warning",
    value: (o) => formatPercent(o.kpis.expenseToIncome),
    caption: (o) =>
      `Jan ${formatPercent(o.kpis.expenseToIncomeFirst)} → Jun ${formatPercent(o.kpis.expenseToIncomeLast)}`,
  },
  {
    id: "foir",
    label: "FOIR",
    provenance: "DERIVED",
    tone: "positive",
    value: (o) => formatPercent(o.kpis.foir),
    caption: (o) => `policy ${formatPercent(o.kpis.policyFoir, 0)} · EMIs only`,
  },
  {
    id: "adb",
    label: "Avg daily balance",
    provenance: "DERIVED",
    value: (o) => formatMoney(o.kpis.avgDailyBalance),
    caption: (o) => `both accounts · ${o.kpis.days} days`,
  },
  {
    id: "low",
    label: "Primary a/c low",
    provenance: "FACT",
    tone: "negative",
    value: (o) => formatMoney(o.kpis.primaryLow),
    caption: (o) => `${formatDayMonth(o.kpis.primaryLowDate)} · ${o.kpis.primaryAccount}`,
  },
];

const scoreTone = (s: number): "positive" | "warning" | "negative" =>
  s >= 75 ? "positive" : s >= 60 ? "warning" : "negative";

export function OverviewTab({ data }: { data: IndividualOverview }) {
  const h = data.health;
  return (
    <div className="space-y-4">
      <KpiGrid items={renderKpis(KPIS, data)} className="xl:grid-cols-6 2xl:grid-cols-6" />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1.5fr)]">
        <HealthScoreCard
          data={{
            score: h.score,
            band: h.band,
            bandPosition: h.bandPosition,
            previous: h.previous,
            previousPeriod: h.previousPeriod,
            cutoffs: h.cutoffs,
            model: h.model,
            confidences: [
              { label: "Model confidence", value: h.modelConfidence.toFixed(2), tone: "info" },
              { label: "Data completeness", value: formatPercent(h.dataCompleteness, 0), tone: "positive" },
              { label: "Extraction conf.", value: formatPercent(h.extractionConfidence), tone: "positive" },
              {
                label: "Classification conf.",
                value: formatPercent(h.classificationConfidence),
                tone: "info",
              },
            ],
          }}
        />
        <Panel
          title="Financial Profile Radar"
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
        </Panel>
        <AiSummary
          headline={data.summary.headline}
          lines={data.summary.lines}
          citations={data.summary.citations}
          confidence={data.summary.confidence}
        />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <Panel
          title="Score Dimensions"
          meta="contributing & negative factors · Δ vs previous assessment"
          actions={<span className="label-micro">confidence</span>}
        >
          <table className="w-full text-sm">
            <caption className="sr-only">Score dimensions with weights, scores, change and factors</caption>
            <tbody>
              {data.dimensions.map((d) => (
                <tr key={d.id} className="border-b border-border/60 align-top">
                  <th scope="row" className="py-3 pr-3 text-left font-semibold text-fg">
                    {d.label}
                    <span className="num block text-[11px] font-normal text-subtle">
                      weight {formatPercent(d.weight)}
                    </span>
                  </th>
                  <td className="w-32 py-3 pr-4">
                    <span className={`num text-xl font-semibold ${TONE_TEXT[scoreTone(d.score)]}`}>
                      {d.score}
                    </span>
                    <span className="num ml-2 text-xs text-negative">{d.delta}</span>
                    <Meter
                      value={d.score / 100}
                      tone={scoreTone(d.score)}
                      className="mt-1.5"
                      label={`${d.label} score`}
                    />
                  </td>
                  <td className="py-3 pr-3 text-fg">
                    <span aria-hidden className="text-positive">
                      ▲{" "}
                    </span>
                    <span className="sr-only">Positive: </span>
                    {d.positive}
                  </td>
                  <td className="py-3 pr-3 text-fg">
                    <span aria-hidden className="text-negative">
                      ▼{" "}
                    </span>
                    <span className="sr-only">Negative: </span>
                    {d.negative}
                  </td>
                  <td className="py-3 text-right text-xs text-subtle">{d.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="num mt-3 text-xs text-muted">{data.formula}</p>
        </Panel>
        <div className="space-y-4">
          <InsightList title="Financial Strengths" items={data.strengths} tone="positive" />
          <InsightList title="Financial Concerns" items={data.concerns} tone="negative" />
          <InsightList title="Underwriter Attention" items={data.attention} tone="warning" />
        </div>
      </div>
    </div>
  );
}
