"use client";

import { cn } from "@/shared/lib/cn";

export interface ToggleChipOption<V extends string> {
  value: V;
  label: string;
}

/** Single-select chip group (radio semantics), e.g. graph flow filters. */
export function ToggleChips<V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: readonly ToggleChipOption<V>[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-8 rounded-md border px-3 text-[13px] font-medium transition-colors",
              active ? "border-lime/60 bg-lime/12 text-lime" : "border-border-strong bg-surface-2 text-muted hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
