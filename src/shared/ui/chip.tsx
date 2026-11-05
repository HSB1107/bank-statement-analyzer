import { type HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { TONE_BG, TONE_SOFT, type Tone } from "./tone";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: "soft" | "outline" | "dashed" | "solid";
  dot?: boolean;
  mono?: boolean;
  size?: "xs" | "sm";
}

export function Chip({
  tone = "neutral",
  variant = "soft",
  dot = false,
  mono = false,
  size = "sm",
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        mono && "num tracking-wider uppercase",
        variant === "soft" && TONE_SOFT[tone],
        variant === "outline" && cn(TONE_SOFT[tone], "bg-transparent"),
        variant === "dashed" && cn(TONE_SOFT[tone], "border-dashed bg-transparent"),
        variant === "solid" && cn(TONE_BG[tone], "border-transparent text-primary-fg"),
        className,
      )}
      {...rest}
    >
      {dot ? <span aria-hidden className={cn("size-1.5 rounded-full", TONE_BG[tone])} /> : null}
      {children}
    </span>
  );
}

/** Amber dashed badge kept on every screen: synthetic / demo data. */
export function SyntheticBadge({ label = "SYNTHETIC", className }: { label?: string; className?: string }) {
  return (
    <Chip
      tone="warning"
      variant="dashed"
      mono
      size="xs"
      className={className}
      title="Synthetic demo data — fictional customers"
    >
      {label}
    </Chip>
  );
}
