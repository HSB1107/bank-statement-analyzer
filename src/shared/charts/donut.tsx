"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { type ReactNode } from "react";

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function Donut({
  slices,
  center,
  size = 170,
  thickness = 18,
  summary,
}: {
  slices: readonly DonutSlice[];
  center: ReactNode;
  size?: number;
  thickness?: number;
  summary: string;
}) {
  return (
    <figure className="relative shrink-0" style={{ width: size, height: size }}>
      <figcaption className="sr-only">{summary}</figcaption>
      <div aria-hidden className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[...slices]}
              dataKey="value"
              nameKey="label"
              innerRadius={size / 2 - thickness}
              outerRadius={size / 2}
              paddingAngle={1.5}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">{center}</div>
    </figure>
  );
}
