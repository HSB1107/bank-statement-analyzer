"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as RSelect } from "radix-ui";
import { cn } from "@/shared/lib/cn";

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
}

export interface FilterSelectProps<V extends string> {
  label?: string;
  value: V;
  options: readonly SelectOption<V>[];
  onValueChange: (value: V) => void;
  className?: string;
  ariaLabel?: string;
  size?: "sm" | "md";
}

/** Pill select used across filters: "Period  Last 30 days ⌄". */
export function FilterSelect<V extends string>({
  label,
  value,
  options,
  onValueChange,
  className,
  ariaLabel,
  size = "md",
}: FilterSelectProps<V>) {
  const current = options.find((o) => o.value === value);
  return (
    <RSelect.Root
      value={value}
      onValueChange={(next) => {
        const match = options.find((o) => o.value === next);
        if (match) onValueChange(match.value);
      }}
    >
      <RSelect.Trigger
        aria-label={ariaLabel ?? label}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface-2 text-sm text-muted transition-colors hover:bg-surface-3 data-[state=open]:border-info",
          size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-9 px-3",
          className,
        )}
      >
        {label ? <span>{label}</span> : null}
        <span className="font-medium text-fg">
          <RSelect.Value>{current?.label}</RSelect.Value>
        </span>
        <RSelect.Icon>
          <ChevronDown className="size-3.5 text-subtle" aria-hidden />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-80 min-w-[10rem] overflow-hidden rounded-lg border border-border-strong bg-surface-2 shadow-card"
        >
          <RSelect.Viewport className="p-1">
            {options.map((o) => (
              <RSelect.Item
                key={o.value}
                value={o.value}
                className="relative flex cursor-pointer items-center rounded-md py-1.5 pr-8 pl-2.5 text-sm text-fg outline-none select-none data-[highlighted]:bg-surface-3"
              >
                <RSelect.ItemText>{o.label}</RSelect.ItemText>
                <RSelect.ItemIndicator className="absolute right-2">
                  <Check className="size-3.5 text-info" aria-hidden />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}
