import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Plus, Pencil, Trash2, Car, ArrowLeft, Palette, Home, Crown, Key, ParkingCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import DataTableHeader from "@/components/DataTableHeader";
import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import ResponsiveDataView from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataHeader, MobileDataRow } from "@/components/MobileDataCard";

const ResidentVehicles = () => {
  const { residentId } = useParams<{ residentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [resident, setResident] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [unitMaxVehicles, setUnitMaxVehicles] = useState<number>(2);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    model: "",
    plate: "",
    color: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterColor, setFilterColor] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = async () => {
    if (!residentId) return;
    
    setIsLoading(true);
    
    // Fetch resident with unit info and profile
    const { data: residentData, error: residentError } = await supabase
      .from("residents")
      .select("*, units(id, unit_number, max_vehicles, condominiums(name)), profiles:user_id(full_name)")
      .eq("id", residentId)
      .single();

    if (residentError || !residentData) {
      toast({ title: "Erro", description: "Morador não encontrado", variant: "destructive" });
      navigate("/dashboard/residents");
      return;
    }

    setResident(residentData);
    setUnitMaxVehicles(residentData.units?.max_vehicles || 2);

    // Fetch vehicles for this resident's unit
    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .eq("unit_id", residentData.unit_id)
      .order("plate");

    if (vehiclesError) {
      toast({ title: "Erro", description: vehiclesError.message, variant: "destructive" });
    } else {
      setVehicles(vehiclesData || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [residentId]);

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
          v.model?.toLowerCase().includes(query)
      );
    }
    if (filterColor && filterColor !== "all") {
      filtered = filtered.filter((v) => v.color === filterColor);
    }
    return filtered;
  }, [vehicles, searchQuery, filterColor]);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = Math.max(0, unitMaxVehicles - total);
    return { total, available, limit: unitMaxVehicles };
  }, [vehicles, unitMaxVehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId && vehicles.length >= unitMaxVehicles) {
      toast({ 
        title: "Limite atingido", 
        description: `Esta unidade já possui ${unitMaxVehicles} veículo(s) cadastrado(s)`, 
        variant: "destructive" 
      });
      return;
    }

    const data = {
      ...formData,
      unit_id: resident.unit_id,
      resident_id: residentId,
    };

    if (editingId) {
      const { error } = await supabase.from("vehicles").update(formData).eq("id", editingId);
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
    setFormData({ model: "", plate: "", color: "" });
    setEditingId(null);
    fetchData();
  };

  const handleEdit = (vehicle: any) => {
    setEditingId(vehicle.id);
    setFormData({
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
    setFormData({ model: "", plate: "", color: "" });
    setIsOpen(true);
  };

  const residentName = resident?.profiles?.full_name || "Morador";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard/residents">Moradores</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{residentName}</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Veículos</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Back Button + Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/dashboard/residents")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <PageHeader
              title={`Veículos de ${residentName}`}
              description={
                resident ? (
                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Home className="h-4 w-4" />
                      {resident.units?.condominiums?.name} - {resident.units?.unit_number}
                    </span>
                    <Badge variant={resident.resident_type === "proprietario" ? "gold" : "info"}>
                      {resident.resident_type === "proprietario" ? (
                        <><Crown className="mr-1 h-3 w-3" /> Proprietário</>
                      ) : (
                        <><Key className="mr-1 h-3 w-3" /> Inquilino</>
                      )}
                    </Badge>
                    <Badge variant={resident.is_active ? "success" : "destructive"}>
                      {resident.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                ) : ""
              }
              count={stats.total}
              countLabel="veículos"
              actions={
                <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
                  <ResponsiveDialogTrigger asChild>
                    <Button 
                      variant="gradient" 
                      onClick={handleOpenNew}
                      disabled={vehicles.length >= unitMaxVehicles}
                    >
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <ResponsiveDialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-4">
                        <Button type="submit" variant="gradient" className="w-full sm:w-auto">
                          {editingId ? "Atualizar" : "Criar"}
                        </Button>
                      </ResponsiveDialogFooter>
                    </form>
                  </ResponsiveDialogContent>
                </ResponsiveDialog>
              }
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsCard
            title="Total de Veículos"
            value={stats.total}
            icon={Car}
            variant="primary"
          />
          <StatsCard
            title="Limite da Unidade"
            value={stats.limit}
            icon={ParkingCircle}
            variant="info"
            description="Vagas permitidas"
          />
          <StatsCard
            title="Vagas Disponíveis"
            value={stats.available}
            icon={Home}
            variant={stats.available > 0 ? "success" : "warning"}
            description={stats.available === 0 ? "Limite atingido" : "Vagas livres"}
          />
        </div>

        {/* Data Table */}
        <Card>
          <DataTableHeader
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por placa ou modelo..."
            onRefresh={fetchData}
            isRefreshing={isLoading}
            resultCount={filteredVehicles.length}
            resultLabel="veículos encontrados"
            filters={
              colors.length > 0 && (
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
              )
            }
          />
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton columns={4} rows={3} />
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
                    : "Este morador ainda não possui veículos cadastrados"
                }
                actionLabel={
                  !searchQuery && filterColor === "all" && vehicles.length < unitMaxVehicles
                    ? "Novo Veículo"
                    : undefined
                }
                onAction={
                  !searchQuery && filterColor === "all" && vehicles.length < unitMaxVehicles
                    ? handleOpenNew
                    : undefined
                }
              />
            ) : (
              <ResponsiveDataView
                desktopView={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Cor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
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
                          <TableCell className="text-right">
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
                      <MobileDataCard key={vehicle.id}>
                        <MobileDataHeader
                          avatar={
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                              <Car className="h-4 w-4 text-primary" />
                            </div>
                          }
                          title={vehicle.model}
                          badge={
                            <Badge variant="outline" className="font-mono">
                              {vehicle.plate}
                            </Badge>
                          }
                          actions={
                            <>
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
                            </>
                          }
                        />
                        <MobileDataRow 
                          label="Cor" 
                          value={
                            vehicle.color ? (
                              <Badge variant="secondary">{vehicle.color}</Badge>
                            ) : (
                              "-"
                            )
                          } 
                        />
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

export default ResidentVehicles;
