import { cn } from "@/shared/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg bg-[linear-gradient(135deg,var(--primary),#22d8f0)] text-base font-bold text-primary-fg",
        className,
      )}
    >
      N
    </span>
  );
}

export function Logo({
  subtitle = "BANK STMT ANALYZER",
  className,
}: {
  subtitle?: string;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold text-fg">FinnOne Neo</span>
        <span className="label-micro block text-[10px]">{subtitle}</span>
      </span>
    </span>
  );
}
