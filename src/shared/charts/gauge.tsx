/**
 * Semi-circular health gauge (0–100) with band ticks. Pure SVG; colours from tokens.
 * Bands are configuration (default 40 / 55 / 70 / 85).
 */
export function Gauge({
  value,
  bands = [40, 55, 70, 85],
  label,
}: {
  value: number;
  bands?: readonly number[];
  label: string;
}) {
  const size = 240;
  const r = 96;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const start = 210;
  const sweep = 240;
  const angle = (v: number) => ((start - (sweep * v) / 100) * Math.PI) / 180;
  const point = (v: number, radius: number) =>
    [cx + radius * Math.cos(angle(v)), cy - radius * Math.sin(angle(v))] as const;
  const arc = (from: number, to: number, radius: number) => {
    const [x1, y1] = point(from, radius);
    const [x2, y2] = point(to, radius);
    const large = (sweep * (to - from)) / 100 > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };
  const ticks = [0, ...bands, 100];
  return (
    <svg
      viewBox={`0 0 ${size} ${size - 30}`}
      role="img"
      aria-label={label}
      className="mx-auto w-full max-w-[260px]"
    >
      <defs>
        <linearGradient id="gauge-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--info)" />
          <stop offset="55%" stopColor="var(--positive)" />
          <stop offset="100%" stopColor="var(--lime)" />
        </linearGradient>
      </defs>
      <path d={arc(0, 100, r)} fill="none" stroke="var(--surface-3)" strokeWidth={16} strokeLinecap="round" />
      <path
        d={arc(0, Math.max(0.5, value), r)}
        fill="none"
        stroke="url(#gauge-grad)"
        strokeWidth={16}
        strokeLinecap="round"
      />
      <path
        d={arc(0, bands[0] ?? 40, r + 14)}
        fill="none"
        stroke="var(--negative)"
        strokeWidth={2}
        opacity={0.7}
      />
      <path
        d={arc(bands[0] ?? 40, bands[1] ?? 55, r + 14)}
        fill="none"
        stroke="var(--warning)"
        strokeWidth={2}
        opacity={0.7}
      />
      <path
        d={arc(bands[2] ?? 70, 100, r + 14)}
        fill="none"
        stroke="var(--positive)"
        strokeWidth={2}
        opacity={0.7}
      />
      {ticks.map((t) => {
        const [x, y] = point(t, r + 26);
        return (
          <text
            key={t}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="num"
            fontSize={10}
            fill="var(--subtle)"
          >
            {t}
          </text>
        );
      })}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize={54}
        fontWeight={700}
        fill="var(--fg)"
        fontFamily="var(--font-sans)"
      >
        {value}
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize={13} fill="var(--subtle)" className="num">
        / 100
      </text>
    </svg>
  );
}
