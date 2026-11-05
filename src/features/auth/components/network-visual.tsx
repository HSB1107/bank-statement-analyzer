import { cn } from "@/shared/lib/cn";
import { type Showcase } from "../schemas/auth";

/** Decorative transaction-intelligence network with real rows "flowing" in. */
const NODES = [
  [116, 40],
  [158, 85],
  [68, 140],
  [148, 175],
  [234, 125],
  [202, 160],
  [245, 172],
  [137, 232],
  [173, 255],
  [240, 242],
  [113, 307],
  [380, 101],
  [427, 70],
  [446, 47],
  [487, 135],
  [533, 157],
  [411, 225],
  [447, 190],
  [498, 185],
  [550, 82],
  [587, 106],
  [571, 225],
  [625, 140],
  [714, 192],
  [638, 195],
  [415, 304],
] as const;
const EDGES = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [3, 7],
  [7, 8],
  [8, 9],
  [7, 10],
  [11, 12],
  [12, 13],
  [12, 14],
  [14, 15],
  [11, 16],
  [16, 17],
  [17, 18],
  [15, 18],
  [13, 19],
  [19, 20],
  [18, 21],
  [20, 22],
  [22, 23],
  [21, 24],
  [16, 25],
  [6, 16],
  [9, 25],
] as const;

const TONE: Readonly<Record<Showcase["rows"][number]["tone"], string>> = {
  positive: "text-positive",
  negative: "text-negative",
  warning: "text-warning",
  transfer: "text-info",
};

export function NetworkVisual({ rows }: { rows: Showcase["rows"] }) {
  return (
    <div aria-hidden className="relative h-[300px] w-full overflow-hidden">
      <svg
        viewBox="0 0 760 330"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMinYMid slice"
      >
        {EDGES.map(([a, b]) => {
          const p = NODES[a];
          const q = NODES[b];
          if (!p || !q) return null;
          return (
            <line
              key={`${a}-${b}`}
              x1={p[0]}
              y1={p[1]}
              x2={q[0]}
              y2={q[1]}
              stroke="var(--info)"
              strokeOpacity={0.28}
              strokeWidth={1}
            />
          );
        })}
        {NODES.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i % 5 === 0 ? 4.5 : 2.5}
            fill={i % 5 === 0 ? "var(--lime)" : i % 3 === 0 ? "var(--magenta)" : "var(--info)"}
            className={i % 5 === 0 ? "animate-pulse" : undefined}
          />
        ))}
        <path
          d="M 30 315 C 220 280, 320 280, 420 210 S 640 120, 740 95"
          fill="none"
          stroke="var(--lime)"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </svg>
      <ul className="absolute top-0 right-0 flex w-[56%] flex-col gap-2">
        {rows.map((r, i) => (
          <li
            key={r.label}
            className={cn(
              "num flex items-center justify-between rounded-md border border-border-strong bg-surface/85 px-3 py-1.5 text-[11px] tracking-wider text-muted backdrop-blur",
              i % 2 === 1 && "ml-8",
            )}
          >
            <span>{r.label}</span>
            <span className={TONE[r.tone]}>{r.amount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
