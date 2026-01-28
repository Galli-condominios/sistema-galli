import { ReactNode, useState } from "react";
import { Search, RefreshCw, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DataTableHeaderProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  resultCount?: number;
  resultLabel?: string;
  className?: string;
}

const DataTableHeader = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters,
  actions,
  onRefresh,
  isRefreshing,
  resultCount,
  resultLabel = "resultados",
  className,
}: DataTableHeaderProps) => {
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-3 sm:p-4",
        className
      )}
    >
      {/* Search and actions row */}
      <div className="flex items-center gap-2">
        {onSearchChange && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        )}
        
        {/* Mobile filter toggle */}
        {isMobile && filters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="shrink-0 h-9"
          >
            <Filter className="h-4 w-4" />
            {filtersOpen ? (
              <ChevronUp className="h-3 w-3 ml-1" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-1" />
            )}
          </Button>
        )}
        
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="shrink-0 h-9 w-9"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </Button>
        )}
        
        {/* Desktop actions */}
        {!isMobile && actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Desktop filters row */}
      {!isMobile && filters && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters}
          {resultCount !== undefined && (
            <span className="text-sm text-muted-foreground ml-auto">
              {resultCount} {resultLabel}
            </span>
          )}
        </div>
      )}

      {/* Mobile filters (collapsible) */}
      {isMobile && filters && (
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent className="space-y-3">
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {filters}
              </div>
              {actions && (
                <div className="flex flex-wrap gap-2">
                  {actions}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Result count (mobile - always visible) */}
      {isMobile && resultCount !== undefined && (
        <div className="text-xs text-muted-foreground">
          {resultCount} {resultLabel}
        </div>
      )}
    </div>
  );
};

export default DataTableHeader;
