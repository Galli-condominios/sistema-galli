import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 sm:gap-1.5 rounded-full border font-medium transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/15 text-primary",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/20 bg-destructive/15 text-destructive",
        outline:
          "border-border text-muted-foreground",
        success:
          "border-success/20 bg-success/15 text-success",
        warning:
          "border-warning/20 bg-warning/15 text-warning",
        info:
          "border-info/20 bg-info/15 text-info",
        gold:
          "border-gold-500/30 bg-gold-500/15 text-gold-400",
        muted:
          "border-transparent bg-muted text-muted-foreground",
      },
      size: {
        default: "px-2 py-0.5 text-[10px] sm:px-2.5 sm:text-xs",
        sm: "px-1.5 py-0.5 text-[9px] sm:px-2 sm:text-[10px]",
        lg: "px-2.5 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
}

function Badge({ className, variant, size, dot, pulse, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full bg-current",
            pulse && "animate-pulse-soft"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
