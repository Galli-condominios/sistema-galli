import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  compact = false,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/30 text-center",
        compact ? "px-4 py-6" : "px-6 py-16",
        className
      )}
    >
      <div className={cn(
        "flex items-center justify-center rounded-full bg-muted/50",
        compact ? "h-10 w-10" : "h-16 w-16"
      )}>
        <Icon className={cn(compact ? "h-5 w-5" : "h-8 w-8", "text-muted-foreground")} />
      </div>
      <h3 className={cn(compact ? "mt-2 text-sm" : "mt-4 text-lg", "font-semibold")}>{title}</h3>
      {description && (
        <p className={cn(compact ? "mt-1 text-xs" : "mt-2 text-sm", "max-w-sm text-muted-foreground")}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className={compact ? "mt-3" : "mt-6"} variant="gradient" size={compact ? "sm" : "default"}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
