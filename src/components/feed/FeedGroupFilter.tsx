import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Globe, Users2, Layers } from "lucide-react";
import { BlockGroup } from "@/hooks/useBlockGroups";
import { cn } from "@/lib/utils";

interface FeedGroupFilterProps {
  groups: BlockGroup[];
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  messageCounts?: Record<string, number>;
}

export const FeedGroupFilter = ({
  groups,
  selectedFilter,
  onFilterChange,
  messageCounts = {},
}: FeedGroupFilterProps) => {
  const filters = [
    { id: "all", label: "Todas", icon: Layers },
    { id: "global", label: "Globais", icon: Globe },
    ...groups.map((g) => ({
      id: g.id,
      label: g.name,
      icon: Users2,
      unitsCount: g.units_count,
    })),
  ];

  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const count = messageCounts[filter.id] || 0;
            const isActive = selectedFilter === filter.id;

            return (
              <Button
                key={filter.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange(filter.id)}
                className={cn(
                  "flex items-center gap-2 shrink-0",
                  isActive && "shadow-md"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{filter.label}</span>
                {count > 0 && (
                  <Badge
                    variant={isActive ? "secondary" : "outline"}
                    className="ml-1 h-5 min-w-[20px] px-1.5 text-xs"
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
