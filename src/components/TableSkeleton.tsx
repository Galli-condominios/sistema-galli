import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  className?: string;
}

const TableSkeleton = ({
  columns = 5,
  rows = 5,
  className,
}: TableSkeletonProps) => {
  const columnWidths = ["w-1/4", "w-1/3", "w-1/5", "w-2/5", "w-1/6"];

  return (
    <div className={cn("rounded-lg border border-border", className)}>
      {/* Header */}
      <div className="flex gap-4 border-b border-border bg-muted/30 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={`header-${i}`}
            className={cn("h-4", columnWidths[i % columnWidths.length])}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className={cn(
            "flex gap-4 px-4 py-4",
            rowIndex !== rows - 1 && "border-b border-border",
            rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10"
          )}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className={cn(
                "h-4",
                columnWidths[(colIndex + rowIndex) % columnWidths.length]
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;
