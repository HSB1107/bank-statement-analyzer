import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { TONE_BORDER, type Tone } from "./tone";

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  /** Mono, muted text next to the title ("2,611 cases in last 30 days"). */
  meta?: ReactNode;
  actions?: ReactNode;
  /** Highlight border (e.g. lime for the selected/critical panel). */
  highlight?: Tone;
  bodyClassName?: string;
  as?: "section" | "div" | "article";
}

export function Panel({
  title,
  meta,
  actions,
  highlight,
  className,
  bodyClassName,
  children,
  as = "section",
  ...rest
}: PanelProps) {
  const Comp = as;
  return (
    <Comp
      className={cn(
        "rounded-[var(--radius-card)] border bg-surface/95 shadow-card",
        highlight ? TONE_BORDER[highlight] : "border-border",
        className,
      )}
      {...rest}
    >
      {(title ?? actions) ? (
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            {title ? <h2 className="text-[15px] font-semibold text-fg">{title}</h2> : null}
            {meta ? <span className="num text-xs text-subtle">{meta}</span> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("px-4 pb-4 sm:px-5", !(title ?? actions) && "pt-4", bodyClassName)}>{children}</div>
    </Comp>
  );
}

export function SubCard({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-surface-2 p-3", className)} {...rest} />;
}
