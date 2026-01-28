import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/responsive-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Home,
  Crown,
  Key,
  Car,
  ChevronRight,
  RotateCw,
  UserPlus,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import StatsCard from "@/components/StatsCard";
import DataTableHeader from "@/components/DataTableHeader";
import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
import StatsCardSkeleton from "@/components/StatsCardSkeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ResponsiveDataView } from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataHeader, MobileDataRow, MobileDataActions } from "@/components/MobileDataCard";
import { useCondominiumFilter } from "@/hooks/useCondominiumFilter";
import { CreateUserInline } from "@/components/CreateUserInline";

const Residents = () => {
  const navigate = useNavigate();
  const { condominiumId, shouldFilter } = useCondominiumFilter();
  const [residents, setResidents] = useState<any[]>([]);
  const [vehicleCounts, setVehicleCounts] = useState<Record<string, number>>({});
  const [units, setUnits] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    user_id: "",
    unit_id: "",
    resident_type: "proprietario" as "proprietario" | "inquilino",
    contract_start_date: "",
    contract_end_date: "",
    is_active: true,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    
    // Build query with optional condominium filter
    let residentsQuery = supabase
      .from("residents")
      .select("*, units(unit_number, condominium_id, condominiums(name))")
      .order("created_at", { ascending: false });
    
    let unitsQuery = supabase.from("units").select("*, condominiums(name)").order("unit_number");
    
    if (shouldFilter && condominiumId) {
      residentsQuery = residentsQuery.eq("units.condominium_id", condominiumId);
      unitsQuery = unitsQuery.eq("condominium_id", condominiumId);
    }

    const [residentsRes, unitsRes, usersRes, vehiclesRes] = await Promise.all([
      residentsQuery,
      unitsQuery,
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("vehicles").select("resident_id"),
    ]);

    if (residentsRes.error) {
      toast({ title: "Erro", description: residentsRes.error.message, variant: "destructive" });
    } else {
      // Filter out residents where units is null (filtered out by condominium)
      const validResidents = (residentsRes.data || []).filter(r => r.units !== null);
      const residentsWithProfiles = validResidents.map((resident) => {
        const profile = usersRes.data?.find((p) => p.id === resident.user_id);
        return {
          ...resident,
          profile_name: profile?.full_name || "N/A",
        };
      });
      setResidents(residentsWithProfiles);
    }

    if (unitsRes.error) {
      toast({ title: "Erro", description: unitsRes.error.message, variant: "destructive" });
    } else {
      setUnits(unitsRes.data || []);
    }

    if (usersRes.error) {
      toast({ title: "Erro", description: usersRes.error.message, variant: "destructive" });
    } else {
      setUsers(usersRes.data || []);
    }

    // Count vehicles per resident
    if (!vehiclesRes.error && vehiclesRes.data) {
      const counts: Record<string, number> = {};
      vehiclesRes.data.forEach((v) => {
        if (v.resident_id) {
          counts[v.resident_id] = (counts[v.resident_id] || 0) + 1;
        }
      });
      setVehicleCounts(counts);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [condominiumId, shouldFilter]);

  const filteredResidents = useMemo(() => {
    let filtered = residents;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.profile_name?.toLowerCase().includes(query) ||
          r.units?.unit_number?.toLowerCase().includes(query) ||
          r.units?.condominiums?.name?.toLowerCase().includes(query)
      );
    }

    if (filterType && filterType !== "all") {
      filtered = filtered.filter((r) => r.resident_type === filterType);
    }

    if (filterStatus && filterStatus !== "all") {
      const isActive = filterStatus === "active";
      filtered = filtered.filter((r) => r.is_active === isActive);
    }

    return filtered;
  }, [residents, searchQuery, filterType, filterStatus]);

  const stats = useMemo(() => {
    const total = residents.length;
    const owners = residents.filter((r) => r.resident_type === "proprietario").length;
    const tenants = residents.filter((r) => r.resident_type === "inquilino").length;
    const active = residents.filter((r) => r.is_active).length;
    return { total, owners, tenants, active };
  }, [residents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      contract_start_date: formData.contract_start_date || null,
      contract_end_date: formData.contract_end_date || null,
    };

    if (editingId) {
      const { error } = await supabase.from("residents").update(data).eq("id", editingId);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Morador atualizado!" });
      }
    } else {
      const { error } = await supabase.from("residents").insert([data]);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Morador criado!" });
      }
    }

    setIsOpen(false);
    setFormData({
      user_id: "",
      unit_id: "",
      resident_type: "proprietario",
      contract_start_date: "",
      contract_end_date: "",
      is_active: true,
    });
    setEditingId(null);
    fetchData();
  };

  const handleEdit = (resident: any) => {
    setEditingId(resident.id);
    setFormData({
      user_id: resident.user_id,
      unit_id: resident.unit_id,
      resident_type: resident.resident_type,
      contract_start_date: resident.contract_start_date || "",
      contract_end_date: resident.contract_end_date || "",
      is_active: resident.is_active,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("residents").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Morador excluído!" });
      fetchData();
    }
    setDeleteConfirm(null);
  };

  const handleRenewContract = async (resident: any) => {
    const newEndDate = prompt("Nova data de término do contrato (YYYY-MM-DD):");
    if (!newEndDate) return;

    const { error } = await supabase
      .from("residents")
      .update({ contract_end_date: newEndDate })
      .eq("id", resident.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Contrato renovado!" });
      fetchData();
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setShowCreateUser(false);
    setFormData({
      user_id: "",
      unit_id: "",
      resident_type: "proprietario",
      contract_start_date: "",
      contract_end_date: "",
      is_active: true,
    });
    setIsOpen(true);
  };

  const handleUserCreated = async (userId: string) => {
    // Refresh users list and select the new user
    const { data: usersData } = await supabase.from("profiles").select("*").order("full_name");
    if (usersData) {
      setUsers(usersData);
    }
    setFormData({ ...formData, user_id: userId });
    setShowCreateUser(false);
    toast({
      title: "Usuário selecionado",
      description: "O novo usuário foi criado e selecionado automaticamente.",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando moradores..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Moradores"
          description="Gerencie os moradores das unidades"
          count={stats.total}
          countLabel="moradores"
          actions={
            <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
              <ResponsiveDialogTrigger asChild>
                <Button variant="gradient" onClick={handleOpenNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Morador
                </Button>
              </ResponsiveDialogTrigger>
              <ResponsiveDialogContent>
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {editingId ? "Editar" : "Novo"} Morador
                  </ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="user">Usuário</Label>
                      {!editingId && !showCreateUser && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary hover:text-primary"
                          onClick={() => setShowCreateUser(true)}
                        >
                          <UserPlus className="mr-1 h-3 w-3" />
                          Criar novo
                        </Button>
                      )}
                    </div>
                    
                    {showCreateUser ? (
                      <CreateUserInline
                        onUserCreated={handleUserCreated}
                        onCancel={() => setShowCreateUser(false)}
                      />
                    ) : (
                      <Select
                        value={formData.user_id}
                        onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um usuário..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidade</Label>
                    <Select
                      value={formData.unit_id}
                      onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
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
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={formData.resident_type}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, resident_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proprietario">Proprietário</SelectItem>
                        <SelectItem value="inquilino">Inquilino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.resident_type === "inquilino" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Início Contrato</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.contract_start_date}
                          onChange={(e) =>
                            setFormData({ ...formData, contract_start_date: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_date">Término Contrato</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={formData.contract_end_date}
                          onChange={(e) =>
                            setFormData({ ...formData, contract_end_date: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}
                  <Button type="submit" variant="gradient" className="w-full">
                    {editingId ? "Atualizar" : "Criar"}
                  </Button>
                </form>
              </ResponsiveDialogContent>
            </ResponsiveDialog>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {isLoading ? (
            <StatsCardSkeleton count={4} />
          ) : (
            <>
              <StatsCard
                title="Total de Moradores"
                value={stats.total}
                icon={Users}
                variant="primary"
              />
              <StatsCard
                title="Proprietários"
                value={stats.owners}
                icon={Crown}
                variant="warning"
              />
              <StatsCard
                title="Inquilinos"
                value={stats.tenants}
                icon={Key}
                variant="info"
              />
              <StatsCard
                title="Ativos"
                value={stats.active}
                icon={UserCheck}
                variant="success"
              />
            </>
          )}
        </div>

        {/* Data Table */}
        <Card>
          <DataTableHeader
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por nome, unidade ou condomínio..."
            onRefresh={fetchData}
            isRefreshing={isLoading}
            resultCount={filteredResidents.length}
            resultLabel="moradores encontrados"
            filters={
              <div className="flex items-center gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="proprietario">Proprietário</SelectItem>
                    <SelectItem value="inquilino">Inquilino</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton columns={6} rows={5} />
            ) : filteredResidents.length === 0 ? (
              <EmptyState
                icon={Users}
                title={
                  searchQuery || filterType !== "all" || filterStatus !== "all"
                    ? "Nenhum morador encontrado"
                    : "Nenhum morador cadastrado"
                }
                description={
                  searchQuery || filterType !== "all" || filterStatus !== "all"
                    ? "Tente alterar os filtros de busca"
                    : "Comece adicionando o primeiro morador ao sistema"
                }
                actionLabel={
                  !searchQuery && filterType === "all" && filterStatus === "all"
                    ? "Novo Morador"
                    : undefined
                }
                onAction={
                  !searchQuery && filterType === "all" && filterStatus === "all"
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
                        <TableHead>Nome</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Veículos</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResidents.map((resident) => (
                        <TableRow 
                          key={resident.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/dashboard/residents/${resident.id}/vehicles`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                                {resident.profile_name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <span className="font-medium">{resident.profile_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {resident.units?.condominiums?.name} - {resident.units?.unit_number}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                resident.resident_type === "proprietario" ? "gold" : "info"
                              }
                            >
                              {resident.resident_type === "proprietario" ? (
                                <Crown className="mr-1 h-3 w-3" />
                              ) : (
                                <Key className="mr-1 h-3 w-3" />
                              )}
                              {resident.resident_type === "proprietario"
                                ? "Proprietário"
                                : "Inquilino"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <span>{vehicleCounts[resident.id] || 0} veículo(s)</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={resident.is_active ? "success" : "muted"}>
                              {resident.is_active ? (
                                <UserCheck className="mr-1 h-3 w-3" />
                              ) : (
                                <UserX className="mr-1 h-3 w-3" />
                              )}
                              {resident.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {resident.resident_type === "inquilino" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRenewContract(resident)}
                                  title="Renovar Contrato"
                                  className="h-8 w-8"
                                >
                                  <RotateCw className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(resident)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm(resident.id)}
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
                  <div className="p-4 space-y-3">
                    {filteredResidents.map((resident) => (
                      <MobileDataCard
                        key={resident.id}
                        onClick={() => navigate(`/dashboard/residents/${resident.id}/vehicles`)}
                      >
                        <MobileDataHeader
                          avatar={
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary shrink-0">
                              {resident.profile_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          }
                          title={resident.profile_name}
                          subtitle={`${resident.units?.condominiums?.name} - ${resident.units?.unit_number}`}
                          badge={
                            <Badge variant={resident.is_active ? "success" : "muted"} className="text-xs">
                              {resident.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          }
                        />
                        
                        <div className="space-y-1">
                          <MobileDataRow
                            label="Tipo"
                            value={
                              <Badge
                                variant={resident.resident_type === "proprietario" ? "gold" : "info"}
                                className="text-xs"
                              >
                                {resident.resident_type === "proprietario" ? (
                                  <Crown className="mr-1 h-3 w-3" />
                                ) : (
                                  <Key className="mr-1 h-3 w-3" />
                                )}
                                {resident.resident_type === "proprietario" ? "Proprietário" : "Inquilino"}
                              </Badge>
                            }
                          />
                          <MobileDataRow
                            label="Veículos"
                            value={
                              <div className="flex items-center gap-1">
                                <Car className="h-3 w-3 text-muted-foreground" />
                                <span>{vehicleCounts[resident.id] || 0}</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              </div>
                            }
                          />
                        </div>

                        <MobileDataActions>
                          {resident.resident_type === "inquilino" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRenewContract(resident)}
                              className="text-xs"
                            >
                              <RotateCw className="h-3 w-3 mr-1" />
                              Renovar
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(resident)}
                            className="text-xs"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirm(resident.id)}
                            className="text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </MobileDataActions>
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
          title="Excluir Morador"
          description="Tem certeza que deseja excluir este morador? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
          variant="destructive"
        />
      </div>
    </DashboardLayout>
  );
};

export default Residents;
