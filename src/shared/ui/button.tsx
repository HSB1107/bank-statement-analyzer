import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border-transparent bg-primary text-primary-fg shadow-[0_0_24px_-6px_var(--primary)] hover:brightness-95",
        secondary: "border-border-strong bg-surface-2 text-fg hover:bg-surface-3",
        ghost: "border-transparent bg-transparent text-muted hover:bg-surface-3 hover:text-fg",
        info: "border-info/60 bg-info/8 text-info hover:bg-info/15",
        warning: "border-warning/60 bg-warning/8 text-warning hover:bg-warning/15",
        danger: "border-negative/60 bg-negative/8 text-negative hover:bg-negative/15",
        selected: "border-info bg-info/12 text-info",
        lime: "border-lime/60 bg-lime/10 text-lime hover:bg-lime/15",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-3.5",
        lg: "h-11 px-5 text-base",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type = "button", ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp ref={ref} type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});

export { buttonVariants };
