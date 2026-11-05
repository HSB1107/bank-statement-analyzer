"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts";
import { ChartFrame } from "./chart-frame";

export interface RadarAxis {
  id: string;
  label: string;
  current: number;
  previous: number;
}

/** Config-driven radar: axes are data. Current period solid lime, previous dashed cyan. */
export function ProfileRadar({
  axes,
  currentLabel,
  previousLabel,
  height = 320,
}: {
  axes: readonly RadarAxis[];
  currentLabel: string;
  previousLabel: string;
  height?: number;
}) {
  const data = axes.map((a) => ({ axis: a.label, current: a.current, previous: a.previous }));
  return (
    <ChartFrame
      config={{
        current: { label: currentLabel, color: "var(--lime)" },
        previous: { label: previousLabel, color: "var(--info)" },
      }}
      summary={`Radar, ${currentLabel} vs ${previousLabel}: ${axes.map((a) => `${a.label} ${a.current} (was ${a.previous})`).join("; ")}`}
      height={height}
    >
      <RadarChart data={data} outerRadius="66%" margin={{ top: 8, right: 36, bottom: 8, left: 36 }}>
        <PolarGrid stroke="var(--chart-grid)" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted)", fontSize: 12 }} />
        <PolarRadiusAxis
          domain={[0, 100]}
          tick={{ fill: "var(--subtle)", fontSize: 9 }}
          tickCount={5}
          axisLine={false}
          angle={90}
        />
        <Radar
          dataKey="previous"
          stroke="var(--color-previous)"
          strokeDasharray="4 4"
          strokeWidth={2}
          fill="none"
          dot={{ r: 2.5, fill: "var(--color-previous)" }}
          isAnimationActive={false}
        />
        <Radar
          dataKey="current"
          stroke="var(--color-current)"
          strokeWidth={2.5}
          fill="var(--color-current)"
          fillOpacity={0.22}
          dot={{ r: 3, fill: "var(--color-current)" }}
          isAnimationActive={false}
        />
      </RadarChart>
    </ChartFrame>
  );
}
