import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, Car, Home, Palette, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import DataTableHeader from "@/components/DataTableHeader";
import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import ResponsiveDataView from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataRow, MobileDataHeader, MobileDataActions } from "@/components/MobileDataCard";

const Vehicles = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    unit_id: "",
    resident_id: "none" as string,
    model: "",
    plate: "",
    color: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterColor, setFilterColor] = useState<string>("all");
  const [filterResident, setFilterResident] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const [vehiclesRes, unitsRes, residentsRes, profilesRes] = await Promise.all([
      supabase
        .from("vehicles")
        .select("*, units(unit_number, condominiums(name)), residents(*, profiles:user_id(full_name))")
        .order("plate"),
      supabase.from("units").select("*, condominiums(name)").order("unit_number"),
      supabase.from("residents").select("*").order("created_at"),
      supabase.from("profiles").select("*"),
    ]);

    if (vehiclesRes.error) {
      toast({ title: "Erro", description: vehiclesRes.error.message, variant: "destructive" });
    } else {
      const vehiclesWithNames = (vehiclesRes.data || []).map((vehicle) => {
        if (vehicle.residents && vehicle.residents.profiles) {
          return { ...vehicle, resident_name: vehicle.residents.profiles.full_name || "N/A" };
        }
        return { ...vehicle, resident_name: null };
      });
      setVehicles(vehiclesWithNames);
    }

    if (unitsRes.error) {
      toast({ title: "Erro", description: unitsRes.error.message, variant: "destructive" });
    } else {
      setUnits(unitsRes.data || []);
    }

    if (residentsRes.error) {
      toast({ title: "Erro", description: residentsRes.error.message, variant: "destructive" });
    } else {
      const residentsWithProfiles = (residentsRes.data || []).map((resident) => {
        const profile = profilesRes.data?.find((p) => p.id === resident.user_id);
        return { ...resident, profile_name: profile?.full_name || "N/A" };
      });
      setResidents(residentsWithProfiles);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const colors = useMemo(() => {
    const uniqueColors = new Set(vehicles.map((v) => v.color).filter(Boolean));
    return Array.from(uniqueColors).sort();
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    let filtered = vehicles;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.plate?.toLowerCase().includes(query) ||
          v.model?.toLowerCase().includes(query) ||
          v.units?.unit_number?.toLowerCase().includes(query) ||
          v.resident_name?.toLowerCase().includes(query)
      );
    }
    if (filterColor && filterColor !== "all") {
      filtered = filtered.filter((v) => v.color === filterColor);
    }
    if (filterResident && filterResident !== "all") {
      filtered = filtered.filter((v) => v.resident_id === filterResident);
    }
    return filtered;
  }, [vehicles, searchQuery, filterColor, filterResident]);

  // Get unique residents with vehicles for filter dropdown
  const residentsWithVehicles = useMemo(() => {
    const uniqueResidentIds = new Set(vehicles.map((v) => v.resident_id).filter(Boolean));
    return residents.filter((r) => uniqueResidentIds.has(r.id));
  }, [vehicles, residents]);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const withResident = vehicles.filter((v) => v.resident_id).length;
    return { total, withResident };
  }, [vehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      resident_id: formData.resident_id === "none" ? null : formData.resident_id,
    };

    if (editingId) {
      const { error } = await supabase.from("vehicles").update(data).eq("id", editingId);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Veículo atualizado!" });
      }
    } else {
      const { error } = await supabase.from("vehicles").insert([data]);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Veículo criado!" });
      }
    }

    setIsOpen(false);
    setFormData({ unit_id: "", resident_id: "none", model: "", plate: "", color: "" });
    setEditingId(null);
    fetchData();
  };

  const handleEdit = (vehicle: any) => {
    setEditingId(vehicle.id);
    setFormData({
      unit_id: vehicle.unit_id,
      resident_id: vehicle.resident_id || "none",
      model: vehicle.model,
      plate: vehicle.plate,
      color: vehicle.color || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Veículo excluído!" });
      fetchData();
    }
    setDeleteConfirm(null);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ unit_id: "", resident_id: "none", model: "", plate: "", color: "" });
    setIsOpen(true);
  };

  const filteredResidents = residents.filter((r) => r.unit_id === formData.unit_id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Veículos"
          description="Gerencie os veículos das unidades"
          count={stats.total}
          countLabel="veículos"
          actions={
            <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
              <ResponsiveDialogTrigger asChild>
                <Button variant="gradient" onClick={handleOpenNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Veículo
                </Button>
              </ResponsiveDialogTrigger>
              <ResponsiveDialogContent>
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    {editingId ? "Editar" : "Novo"} Veículo
                  </ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidade</Label>
                    <Select
                      value={formData.unit_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, unit_id: value, resident_id: "none" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.condominiums?.name} - {unit.unit_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resident">Morador (Opcional)</Label>
                    <Select
                      value={formData.resident_id}
                      onValueChange={(value) => setFormData({ ...formData, resident_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {filteredResidents.map((resident) => (
                          <SelectItem key={resident.id} value={resident.id}>
                            {resident.profile_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model">Modelo</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        required
                        placeholder="Ex: Honda Civic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plate">Placa</Label>
                      <Input
                        id="plate"
                        value={formData.plate}
                        onChange={(e) =>
                          setFormData({ ...formData, plate: e.target.value.toUpperCase() })
                        }
                        required
                        placeholder="Ex: ABC1D23"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Cor</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="Ex: Preto"
                    />
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
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatsCard
            title="Total de Veículos"
            value={stats.total}
            icon={Car}
            variant="primary"
          />
          <StatsCard
            title="Vinculados a Morador"
            value={stats.withResident}
            icon={Home}
            variant="success"
            description="Veículos com morador responsável"
          />
        </div>

        {/* Data Table */}
        <Card>
          <DataTableHeader
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por placa, modelo, unidade ou morador..."
            onRefresh={fetchData}
            isRefreshing={isLoading}
            resultCount={filteredVehicles.length}
            resultLabel="veículos encontrados"
            filters={
              <div className="flex items-center gap-2">
                {residentsWithVehicles.length > 0 && (
                  <Select value={filterResident} onValueChange={setFilterResident}>
                    <SelectTrigger className="w-[180px]">
                      <Users className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Morador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os moradores</SelectItem>
                      {residentsWithVehicles.map((resident) => (
                        <SelectItem key={resident.id} value={resident.id}>
                          {resident.profile_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {colors.length > 0 && (
                  <Select value={filterColor} onValueChange={setFilterColor}>
                    <SelectTrigger className="w-[130px]">
                      <Palette className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Cor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as cores</SelectItem>
                      {colors.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            }
          />
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton columns={6} rows={5} />
            ) : filteredVehicles.length === 0 ? (
              <EmptyState
                icon={Car}
                title={
                  searchQuery || filterColor !== "all"
                    ? "Nenhum veículo encontrado"
                    : "Nenhum veículo cadastrado"
                }
                description={
                  searchQuery || filterColor !== "all"
                    ? "Tente alterar os filtros de busca"
                    : "Comece adicionando o primeiro veículo ao sistema"
                }
                actionLabel={
                  !searchQuery && filterColor === "all" ? "Novo Veículo" : undefined
                }
                onAction={
                  !searchQuery && filterColor === "all" ? handleOpenNew : undefined
                }
              />
            ) : (
              <ResponsiveDataView
                desktopView={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Morador</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Cor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVehicles.map((vehicle) => (
                        <TableRow 
                          key={vehicle.id}
                          className={vehicle.resident_id ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
                          onClick={() => vehicle.resident_id && navigate(`/dashboard/residents/${vehicle.resident_id}/vehicles`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-muted-foreground" />
                              {vehicle.units?.condominiums?.name} - {vehicle.units?.unit_number}
                            </div>
                          </TableCell>
                          <TableCell className={vehicle.resident_id ? "text-foreground" : "text-muted-foreground"}>
                            {vehicle.resident_name || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <Car className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium">{vehicle.model}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {vehicle.plate}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {vehicle.color ? (
                              <Badge variant="secondary">{vehicle.color}</Badge>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(vehicle)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm(vehicle.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                }
                mobileView={
                  <div className="space-y-3 p-4">
                    {filteredVehicles.map((vehicle) => (
                      <MobileDataCard 
                        key={vehicle.id}
                        onClick={vehicle.resident_id ? () => navigate(`/dashboard/residents/${vehicle.resident_id}/vehicles`) : undefined}
                      >
                        <MobileDataHeader
                          avatar={
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                              <Car className="h-4 w-4 text-primary" />
                            </div>
                          }
                          title={vehicle.model}
                          subtitle={`${vehicle.units?.condominiums?.name} - ${vehicle.units?.unit_number}`}
                          badge={
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {vehicle.plate}
                            </Badge>
                          }
                          actions={
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEdit(vehicle); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(vehicle.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          }
                        />
                        <MobileDataRow label="Morador" value={vehicle.resident_name || "-"} />
                        <MobileDataRow label="Cor" value={vehicle.color || "-"} />
                      </MobileDataCard>
                    ))}
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>

        <ConfirmDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          title="Excluir Veículo"
          description="Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
          variant="destructive"
        />
      </div>
    </DashboardLayout>
  );
};

export default Vehicles;
