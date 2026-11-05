"use client";

import { Switch as RSwitch } from "radix-ui";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/shared/lib/cn";

export const Switch = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof RSwitch.Root>>(
  function Switch({ className, ...props }, ref) {
    return (
      <RSwitch.Root
        ref={ref}
        className={cn(
          "inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border-strong bg-surface-3 transition-colors data-[state=checked]:border-lime/50 data-[state=checked]:bg-lime/25",
          className,
        )}
        {...props}
      >
        <RSwitch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-muted transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-lime" />
      </RSwitch.Root>
    );
  },
);
