import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Home,
  Building2,
  Users,
  Layers,
  MapPin,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import DataTableHeader from "@/components/DataTableHeader";
import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import ResponsiveDataView from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataRow, MobileDataHeader, MobileDataActions } from "@/components/MobileDataCard";
import { useCondominium } from "@/contexts/CondominiumContext";

const Units = () => {
  const { selectedCondominiumId, condominiums } = useCondominium();
  const selectedCondominium = condominiums.find(c => c.id === selectedCondominiumId);
  
  const [units, setUnits] = useState<any[]>([]);
  const [occupiedUnitIds, setOccupiedUnitIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    condominium_id: selectedCondominiumId || "",
    unit_number: "",
    floor: "",
    block: "",
    max_vehicles: 2,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBlock, setFilterBlock] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteSelectedConfirm, setDeleteSelectedConfirm] = useState(false);
  const { toast } = useToast();

  // Update form condominium when selection changes
  useEffect(() => {
    if (selectedCondominiumId && !editingId) {
      setFormData(prev => ({ ...prev, condominium_id: selectedCondominiumId }));
    }
  }, [selectedCondominiumId, editingId]);

  const fetchData = async () => {
    setIsLoading(true);
    
    let unitsQuery = supabase.from("units").select("*, condominiums(name)").order("unit_number");
    
    // Filter by selected condominium
    if (selectedCondominiumId) {
      unitsQuery = unitsQuery.eq("condominium_id", selectedCondominiumId);
    }
    
    const [unitsRes, residentsRes] = await Promise.all([
      unitsQuery,
      supabase
        .from("residents")
        .select("unit_id")
        .eq("is_active", true),
    ]);

    if (unitsRes.error) {
      toast({ title: "Erro", description: unitsRes.error.message, variant: "destructive" });
    } else {
      setUnits(unitsRes.data || []);
    }

    if (!residentsRes.error && residentsRes.data) {
      setOccupiedUnitIds(new Set(residentsRes.data.map((r) => r.unit_id)));
    }

    setSelectedIds(new Set());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedCondominiumId]);

  const blocks = useMemo(() => {
    const uniqueBlocks = new Set(units.map((u) => u.block).filter(Boolean));
    return Array.from(uniqueBlocks).sort();
  }, [units]);

  const filteredUnits = useMemo(() => {
    let filtered = units;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.unit_number?.toLowerCase().includes(query) ||
          u.block?.toLowerCase().includes(query) ||
          u.condominiums?.name?.toLowerCase().includes(query)
      );
    }

    if (filterBlock && filterBlock !== "all") {
      filtered = filtered.filter((u) => u.block === filterBlock);
    }

    if (filterStatus && filterStatus !== "all") {
      if (filterStatus === "occupied") {
        filtered = filtered.filter((u) => occupiedUnitIds.has(u.id));
      } else if (filterStatus === "vacant") {
        filtered = filtered.filter((u) => !occupiedUnitIds.has(u.id));
      }
    }

    return filtered;
  }, [units, searchQuery, filterBlock, filterStatus, occupiedUnitIds]);

  const stats = useMemo(() => {
    const total = units.length;
    const occupied = units.filter((u) => occupiedUnitIds.has(u.id)).length;
    const vacant = total - occupied;
    return { total, occupied, vacant };
  }, [units, occupiedUnitIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      const { error } = await supabase.from("units").update(formData).eq("id", editingId);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Unidade atualizada!" });
      }
    } else {
      const { error } = await supabase.from("units").insert([formData]);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Unidade criada!" });
      }
    }

    setIsOpen(false);
    setFormData({ condominium_id: "", unit_number: "", floor: "", block: "", max_vehicles: 2 });
    setEditingId(null);
    fetchData();
  };

  const handleEdit = (unit: any) => {
    setEditingId(unit.id);
    setFormData({
      condominium_id: unit.condominium_id,
      unit_number: unit.unit_number,
      floor: unit.floor || "",
      block: unit.block || "",
      max_vehicles: unit.max_vehicles ?? 2,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Unidade excluída!" });
      fetchData();
    }
    setDeleteConfirm(null);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ 
      condominium_id: selectedCondominiumId || "", 
      unit_number: "", 
      floor: "", 
      block: "", 
      max_vehicles: 2 
    });
    setIsOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredUnits.map((u) => u.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedIds);
    const { error } = await supabase
      .from("units")
      .delete()
      .in("id", idsToDelete);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: `${idsToDelete.length} unidade(s) excluída(s)!` });
      fetchData();
    }
    setDeleteSelectedConfirm(false);
  };

  const allSelected = filteredUnits.length > 0 && filteredUnits.every((u) => selectedIds.has(u.id));
  const someSelected = selectedIds.size > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Unidades"
          description="Gerencie as unidades dos condomínios"
          count={stats.total}
          countLabel="unidades"
          actions={
            <div className="flex items-center gap-2">
              {someSelected && (
                <Button 
                  variant="destructive" 
                  onClick={() => setDeleteSelectedConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Apagar Selecionados ({selectedIds.size})
                </Button>
              )}
              <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
                <ResponsiveDialogTrigger asChild>
                  <Button 
                    variant="gradient" 
                    onClick={handleOpenNew}
                    disabled={!selectedCondominiumId}
                    title={!selectedCondominiumId ? "Selecione um condomínio primeiro" : undefined}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Unidade
                  </Button>
                </ResponsiveDialogTrigger>
                <ResponsiveDialogContent>
                  <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-primary" />
                      {editingId ? "Editar" : "Nova"} Unidade
                    </ResponsiveDialogTitle>
                  </ResponsiveDialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Visual indicator do condomínio selecionado */}
                    {selectedCondominiumId && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          Criando para: <strong>{selectedCondominium?.name}</strong>
                        </span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="unit_number">Número da Unidade</Label>
                      <Input
                        id="unit_number"
                        value={formData.unit_number}
                        onChange={(e) =>
                          setFormData({ ...formData, unit_number: e.target.value })
                        }
                        required
                        placeholder="Ex: 101, Casa 5"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="floor">Andar</Label>
                        <Input
                          id="floor"
                          value={formData.floor}
                          onChange={(e) =>
                            setFormData({ ...formData, floor: e.target.value })
                          }
                          placeholder="Ex: 1º Andar"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="block">Bloco</Label>
                        <Input
                          id="block"
                          value={formData.block}
                          onChange={(e) =>
                            setFormData({ ...formData, block: e.target.value })
                          }
                          placeholder="Ex: Bloco A"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_vehicles">Limite Máximo de Veículos</Label>
                      <Input
                        id="max_vehicles"
                        type="number"
                        min={0}
                        value={formData.max_vehicles}
                        onChange={(e) =>
                          setFormData({ ...formData, max_vehicles: parseInt(e.target.value) || 0 })
                        }
                        placeholder="Ex: 2"
                      />
                      <p className="text-xs text-muted-foreground">
                        Número máximo de veículos que podem ser cadastrados nesta unidade
                      </p>
                    </div>
                    <ResponsiveDialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
                        Cancelar
                      </Button>
                      <Button type="submit" variant="gradient" className="w-full sm:w-auto">
                        {editingId ? "Atualizar" : "Criar"}
                      </Button>
                    </ResponsiveDialogFooter>
                  </form>
                </ResponsiveDialogContent>
              </ResponsiveDialog>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsCard
            title="Total de Unidades"
            value={stats.total}
            icon={Home}
            variant="primary"
          />
          <StatsCard
            title="Ocupadas"
            value={stats.occupied}
            icon={Users}
            variant="success"
            description="Unidades com moradores ativos"
          />
          <StatsCard
            title="Vagas"
            value={stats.vacant}
            icon={Building2}
            variant="warning"
            description="Unidades disponíveis"
          />
        </div>

        {/* Data Table */}
        <Card>
          <DataTableHeader
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por número, bloco ou condomínio..."
            onRefresh={fetchData}
            isRefreshing={isLoading}
            resultCount={filteredUnits.length}
            resultLabel="unidades encontradas"
            filters={
              <div className="flex items-center gap-2">
                {blocks.length > 0 && (
                  <Select value={filterBlock} onValueChange={setFilterBlock}>
                    <SelectTrigger className="w-[140px]">
                      <Layers className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Bloco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os blocos</SelectItem>
                      {blocks.map((block) => (
                        <SelectItem key={block} value={block}>
                          {block}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="occupied">Ocupadas</SelectItem>
                    <SelectItem value="vacant">Vagas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton columns={6} rows={5} />
            ) : filteredUnits.length === 0 ? (
              <EmptyState
                icon={Home}
                title={searchQuery || filterBlock !== "all" || filterStatus !== "all" ? "Nenhuma unidade encontrada" : "Nenhuma unidade cadastrada"}
                description={
                  searchQuery || filterBlock !== "all" || filterStatus !== "all"
                    ? "Tente alterar os filtros de busca"
                    : "Comece adicionando a primeira unidade ao sistema"
                }
                actionLabel={!searchQuery && filterBlock === "all" && filterStatus === "all" ? "Nova Unidade" : undefined}
                onAction={!searchQuery && filterBlock === "all" && filterStatus === "all" ? handleOpenNew : undefined}
              />
            ) : (
              <ResponsiveDataView
                desktopView={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Condomínio</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Bloco</TableHead>
                        <TableHead>Andar</TableHead>
                        <TableHead>Limite Veículos</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUnits.map((unit) => {
                        const isOccupied = occupiedUnitIds.has(unit.id);
                        const isSelected = selectedIds.has(unit.id);
                        return (
                          <TableRow key={unit.id} className={isSelected ? "bg-primary/5" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectOne(unit.id, !!checked)}
                              />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {unit.condominiums?.name}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                  <Home className="h-4 w-4 text-primary" />
                                </div>
                                <span className="font-medium">{unit.unit_number}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {unit.block ? (
                                <Badge variant="outline">{unit.block}</Badge>
                              ) : (
                                <span className="text-muted-foreground/50">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {unit.floor || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {unit.max_vehicles ?? 2}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={isOccupied ? "success" : "warning"}>
                                {isOccupied ? "Ocupada" : "Vaga"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(unit)}
                                  className="h-8 w-8"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteConfirm(unit.id)}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                }
                mobileView={
                  <div className="space-y-3 p-4">
                    {filteredUnits.map((unit) => {
                      const isOccupied = occupiedUnitIds.has(unit.id);
                      return (
                        <MobileDataCard key={unit.id}>
                          <MobileDataHeader
                            avatar={
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <Home className="h-4 w-4 text-primary" />
                              </div>
                            }
                            title={unit.unit_number}
                            subtitle={unit.condominiums?.name}
                            badge={
                              <Badge variant={isOccupied ? "success" : "warning"} className="text-[10px]">
                                {isOccupied ? "Ocupada" : "Vaga"}
                              </Badge>
                            }
                            actions={
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(unit)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(unit.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            }
                          />
                          <MobileDataRow label="Bloco" value={unit.block || "-"} />
                          <MobileDataRow label="Andar" value={unit.floor || "-"} />
                          <MobileDataRow label="Limite Veículos" value={unit.max_vehicles ?? 2} />
                        </MobileDataCard>
                      );
                    })}
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>

        <ConfirmDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          title="Excluir Unidade"
          description="Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
          variant="destructive"
        />

        <ConfirmDialog
          open={deleteSelectedConfirm}
          onOpenChange={setDeleteSelectedConfirm}
          title="Excluir Unidades Selecionadas"
          description={`Tem certeza que deseja excluir ${selectedIds.size} unidade(s)? Esta ação não pode ser desfeita.`}
          confirmText="Excluir Todas"
          cancelText="Cancelar"
          onConfirm={handleDeleteSelected}
          variant="destructive"
        />
      </div>
    </DashboardLayout>
  );
};

export default Units;
