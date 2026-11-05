import { formatCount } from "@/shared/lib/format";
import { HEALTH_BAND_LABELS } from "@/shared/data/schemas/case";
import { Panel } from "@/shared/ui/panel";
import { TONE_VAR } from "@/shared/ui/tone";
import { type DashboardOverview } from "../schemas/dashboard";
import { bandTone } from "./case-chips";

const REGION = {
  IN: { label: "India", x: 128, y: 64, tone: "lime" },
  ME: { label: "Middle East", x: 58, y: 48, tone: "warning" },
  ANZ: { label: "ANZ", x: 222, y: 112, tone: "info" },
} as const;

export function RegionalPanel({ regions }: { regions: DashboardOverview["regions"] }) {
  const max = Math.max(...regions.map((r) => r.cases), 1);
  return (
    <Panel title="Regional Overview" meta="cases">
      <svg
        viewBox="0 0 300 150"
        className="h-36 w-full"
        role="img"
        aria-label={`Cases by region: ${regions.map((r) => `${REGION[r.region].label} ${r.cases}`).join(", ")}`}
      >
        <defs>
          <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill="var(--border-strong)" />
          </pattern>
        </defs>
        {regions.map((r) => {
          const pos = REGION[r.region];
          const radius = 10 + 22 * Math.sqrt(r.cases / max);
          return (
            <g key={r.region}>
              <rect
                x={pos.x - radius - 6}
                y={pos.y - radius - 6}
                width={(radius + 6) * 2}
                height={(radius + 6) * 2}
                fill="url(#dots)"
                opacity={0.7}
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill={TONE_VAR[pos.tone]}
                fillOpacity={0.18}
                stroke={TONE_VAR[pos.tone]}
                strokeDasharray="2 2"
              />
              <circle cx={pos.x} cy={pos.y} r={3} fill={TONE_VAR[pos.tone]} />
              <text
                x={pos.x}
                y={pos.y - radius - 4}
                textAnchor="middle"
                fontSize={9}
                fill={TONE_VAR[pos.tone]}
                className="num"
              >
                {r.region}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="mt-2 space-y-4">
        {regions.map((r) => {
          const total = r.bands.reduce((a, b) => a + b.count, 0) || 1;
          return (
            <li key={r.region}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-fg">
                  {REGION[r.region].label}{" "}
                  <span className="num ml-1 text-[10px] font-normal text-subtle">
                    {r.currencies.slice(0, 3).join(" ")}
                    {r.currencies.length > 3 ? ` +${r.currencies.length - 3}` : ""}
                  </span>
                </span>
                <span className="num font-semibold text-fg">{formatCount(r.cases)}</span>
              </div>
              <div
                className="mt-1.5 flex h-1.5 overflow-hidden rounded-full"
                role="img"
                aria-label={r.bands.map((b) => `${HEALTH_BAND_LABELS[b.band]} ${b.count}`).join(", ")}
              >
                {[...r.bands].map((b) => (
                  <span
                    key={b.band}
                    style={{ width: `${(b.count / total) * 100}%`, background: TONE_VAR[bandTone(b.band)] }}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
