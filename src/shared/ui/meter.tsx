import { cn } from "@/shared/lib/cn";
import { TONE_BG, type Tone } from "./tone";

/** Horizontal bar 0..1. Purely visual — always pair with a text value. */
export function Meter({
  value,
  tone = "positive",
  className,
  label,
}: {
  value: number;
  tone?: Tone;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div className={cn("h-full rounded-full", TONE_BG[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function confidenceTone(conf: number): Tone {
  if (conf >= 0.95) return "positive";
  if (conf >= 0.85) return "info";
  return "warning";
}

/** Compact confidence bar + number used in tables ("▬ 99"). */
export function ConfidenceBar({ value, className }: { value: number; className?: string }) {
  const tone = confidenceTone(value);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Meter value={value} tone={tone} className="w-10" label={`Confidence ${Math.round(value * 100)}`} />
      <span className={cn("num text-xs", tone === "warning" ? "text-warning" : "text-muted")}>
        {Math.round(value * 100)}
      </span>
    </span>
  );
}
