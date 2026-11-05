"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

/** Tiny trend line for KPI cards. Decorative; the KPI value + delta carry the meaning. */
export function Sparkline({ values, color }: { values: readonly number[]; color: string }) {
  const id = useId().replace(/:/g, "");
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div aria-hidden className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#sp-${id})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
