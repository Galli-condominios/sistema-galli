import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Home, Search, Plus, Minus, Users2, Loader2 } from "lucide-react";
import { BlockGroup } from "@/hooks/useBlockGroups";
import { useUnits } from "@/hooks/useUnits";
import { useToast } from "@/hooks/use-toast";

interface GroupUnitsManagerProps {
  group: BlockGroup;
  onAssignUnits: (groupId: string, unitIds: string[]) => void;
  onRemoveUnits: (unitIds: string[]) => void;
  isAssigning?: boolean;
}

export const GroupUnitsManager = ({
  group,
  onAssignUnits,
  onRemoveUnits,
  isAssigning,
}: GroupUnitsManagerProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [mode, setMode] = useState<"add" | "remove">("add");
  
  const { units, isLoading } = useUnits();
  const { toast } = useToast();

  // Filter units based on mode and search
  const filteredUnits = useMemo(() => {
    if (!units) return [];

    const filtered = units.filter((unit) => {
      // Filter by condominium
      if (unit.condominium_id !== group.condominium_id) return false;

      // Filter by mode (assigned or unassigned)
      if (mode === "add") {
        return !unit.block_group_id; // Show only unassigned
      } else {
        return unit.block_group_id === group.id; // Show only assigned to this group
      }
    });

    // Filter by search
    if (!searchQuery) return filtered;
    const query = searchQuery.toLowerCase();
    return filtered.filter(
      (unit) =>
        unit.unit_number?.toLowerCase().includes(query) ||
        unit.block?.toLowerCase().includes(query) ||
        unit.floor?.toLowerCase().includes(query)
    );
  }, [units, group, mode, searchQuery]);

  const toggleUnit = (unitId: string) => {
    setSelectedUnits((prev) =>
      prev.includes(unitId)
        ? prev.filter((id) => id !== unitId)
        : [...prev, unitId]
    );
  };

  const toggleAll = () => {
    if (selectedUnits.length === filteredUnits.length) {
      setSelectedUnits([]);
    } else {
      setSelectedUnits(filteredUnits.map((u) => u.id));
    }
  };

  const handleSubmit = () => {
    if (selectedUnits.length === 0) {
      toast({
        title: "Selecione unidades",
        description: "Nenhuma unidade foi selecionada",
        variant: "destructive",
      });
      return;
    }

    if (mode === "add") {
      onAssignUnits(group.id, selectedUnits);
    } else {
      onRemoveUnits(selectedUnits);
    }

    setSelectedUnits([]);
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedUnits([]);
      setSearchQuery("");
    }
  };

  const unassignedCount = useMemo(() => {
    if (!units) return 0;
    return units.filter(
      (u) => u.condominium_id === group.condominium_id && !u.block_group_id
    ).length;
  }, [units, group.condominium_id]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users2 className="h-4 w-4" />
          Gerenciar Unidades
          {unassignedCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {unassignedCount} disponíveis
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            Unidades do {group.name}
          </SheetTitle>
          <SheetDescription>
            Gerencie quais unidades pertencem a este grupo
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === "add" ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => {
                setMode("add");
                setSelectedUnits([]);
              }}
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
            <Button
              variant={mode === "remove" ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => {
                setMode("remove");
                setSelectedUnits([]);
              }}
            >
              <Minus className="h-4 w-4" />
              Remover
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar unidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Select all */}
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={
                  filteredUnits.length > 0 &&
                  selectedUnits.length === filteredUnits.length
                }
                onCheckedChange={toggleAll}
              />
              <label htmlFor="select-all" className="text-sm cursor-pointer">
                Selecionar todas ({filteredUnits.length})
              </label>
            </div>
            <Badge variant="outline">
              {selectedUnits.length} selecionadas
            </Badge>
          </div>

          {/* Units list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Home className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {mode === "add"
                  ? "Nenhuma unidade disponível para adicionar"
                  : "Nenhuma unidade atribuída a este grupo"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {filteredUnits.map((unit) => (
                  <div
                    key={unit.id}
                    onClick={() => toggleUnit(unit.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUnits.includes(unit.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedUnits.includes(unit.id)}
                      onCheckedChange={() => toggleUnit(unit.id)}
                    />
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Home className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        Unidade {unit.unit_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {unit.block && `Bloco ${unit.block}`}
                        {unit.block && unit.floor && " • "}
                        {unit.floor && `Andar ${unit.floor}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Action button */}
          <Button
            variant="gradient"
            className="w-full"
            onClick={handleSubmit}
            disabled={selectedUnits.length === 0 || isAssigning}
          >
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : mode === "add" ? (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar {selectedUnits.length} unidades ao grupo
              </>
            ) : (
              <>
                <Minus className="h-4 w-4 mr-2" />
                Remover {selectedUnits.length} unidades do grupo
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
