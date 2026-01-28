import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  count?: number;
  countLabel?: string;
  actions?: ReactNode;
  className?: string;
}

const PageHeader = ({
  title,
  description,
  count,
  countLabel = "itens",
  actions,
  className,
}: PageHeaderProps) => {
  return (
    <div className={cn("animate-fade-in", className)}>
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Title row - stacks on mobile */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
                {title}
              </h1>
              {count !== undefined && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {count} {countLabel}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-none">
                {description}
              </p>
            )}
          </div>
          
          {/* Actions - full width on mobile */}
          {actions && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
