import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "info";
  className?: string;
}

const variantStyles = {
  default: "text-muted-foreground bg-muted/50",
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  info: "text-info bg-info/10",
};

const StatsCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = "default",
  className,
}: StatsCardProps) => {
  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        className
      )}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</span>
              {trend && (
                <span
                  className={cn(
                    "text-[10px] sm:text-xs font-medium",
                    trend.isPositive ? "text-success" : "text-destructive"
                  )}
                >
                  {trend.isPositive ? "+" : ""}
                  {Number.isInteger(trend.value) ? trend.value : trend.value.toFixed(1)}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl shrink-0",
              variantStyles[variant]
            )}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
