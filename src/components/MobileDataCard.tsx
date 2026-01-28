import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MobileDataCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * Card wrapper for mobile data display
 * Replaces table rows on mobile screens
 */
export const MobileDataCard = ({ children, onClick, className }: MobileDataCardProps) => {
  return (
    <Card 
      className={cn(
        "border-border hover:border-primary/50 transition-colors",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {children}
      </CardContent>
    </Card>
  );
};

interface MobileDataRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

/**
 * Single row for mobile data card
 * Displays label: value pair
 */
export const MobileDataRow = ({ label, value, className }: MobileDataRowProps) => {
  return (
    <div className={cn("flex justify-between items-center gap-2 py-0.5", className)}>
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right truncate">{value}</span>
    </div>
  );
};

interface MobileDataHeaderProps {
  avatar?: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}

/**
 * Header section for mobile data card
 * Includes avatar, title, subtitle and optional badge/actions
 */
export const MobileDataHeader = ({ avatar, title, subtitle, badge, actions }: MobileDataHeaderProps) => {
  return (
    <div className="flex items-start justify-between gap-2 pb-2 border-b border-border mb-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {avatar}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
};

interface MobileDataActionsProps {
  children: ReactNode;
  className?: string;
}

/**
 * Actions footer for mobile data card
 */
export const MobileDataActions = ({ children, className }: MobileDataActionsProps) => {
  return (
    <div 
      className={cn("flex items-center gap-1.5 pt-2 mt-2 border-t border-border", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};
