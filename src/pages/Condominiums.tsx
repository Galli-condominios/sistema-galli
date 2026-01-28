import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building2, Home, MapPin, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import DataTableHeader from "@/components/DataTableHeader";
import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ResponsiveDataView } from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataHeader, MobileDataRow, MobileDataActions } from "@/components/MobileDataCard";
import { useOrganization } from "@/contexts/OrganizationContext";

const Condominiums = () => {
  const navigate = useNavigate();
  const { selectedOrganizationId } = useOrganization();
  const [condominiums, setCondominiums] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    total_units: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCondominiums = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("condominiums")
        .select("*")
        .order("name");

      // Filter by organization if selected
      if (selectedOrganizationId) {
        query = query.eq("organization_id", selectedOrganizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCondominiums(data || []);
    } catch (error) {
      console.error("Error fetching condominiums:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao carregar condomínios",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCondominiums();
  }, [selectedOrganizationId]);

  const filteredCondominiums = useMemo(() => {
    if (!searchQuery) return condominiums;
    const query = searchQuery.toLowerCase();
    return condominiums.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.address?.toLowerCase().includes(query)
    );
  }, [condominiums, searchQuery]);

  const stats = useMemo(() => {
    const totalUnits = condominiums.reduce(
      (acc, c) => acc + (c.total_units || 0),
      0
    );
    const withAddress = condominiums.filter((c) => c.address).length;
    return { total: condominiums.length, totalUnits, withAddress };
  }, [condominiums]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const submitData = {
        ...formData,
        total_units: formData.total_units ? parseInt(formData.total_units) : null,
        organization_id: selectedOrganizationId, // Link to organization
      };

      if (editingId) {
        const { organization_id, ...updateData } = submitData; // Don't update organization_id
        const { error } = await supabase
          .from("condominiums")
          .update(updateData)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Condomínio atualizado!" });
      } else {
        const { data, error } = await supabase
          .from("condominiums")
          .insert([submitData])
          .select();

        if (error) throw error;

        // Criar unidades automaticamente se total_units foi informado
        if (submitData.total_units && data && data[0]) {
          const condominiumId = data[0].id;
          const units = Array.from({ length: submitData.total_units }, (_, i) => ({
            condominium_id: condominiumId,
            unit_number: String(i + 1),
            block: null,
            floor: null,
          }));

          const { error: unitsError } = await supabase.from("units").insert(units);

          if (unitsError) {
            console.error("Error creating units:", unitsError);
            toast({
              title: "Atenção",
              description: `Condomínio criado, mas houve erro ao criar as unidades: ${unitsError.message}`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sucesso",
              description: `Condomínio criado com ${submitData.total_units} unidades!`,
            });
          }
        } else {
          toast({ title: "Sucesso", description: "Condomínio criado!" });
        }
      }

      setIsOpen(false);
      setFormData({ name: "", address: "", total_units: "" });
      setEditingId(null);
      await fetchCondominiums();
    } catch (error) {
      console.error("Error submitting condominium:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao salvar condomínio",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (condo: any) => {
    setEditingId(condo.id);
    setFormData({
      name: condo.name,
      address: condo.address || "",
      total_units: condo.total_units?.toString() || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("condominiums")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Condomínio excluído!" });
      await fetchCondominiums();
    } catch (error) {
      console.error("Error deleting condominium:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao excluir condomínio",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ name: "", address: "", total_units: "" });
    setIsOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Condomínios"
          description="Gerencie os condomínios cadastrados no sistema"
          count={stats.total}
          countLabel="condomínios"
          actions={
            <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
              <ResponsiveDialogTrigger asChild>
                <Button variant="gradient" onClick={handleOpenNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Condomínio
                </Button>
              </ResponsiveDialogTrigger>
              <ResponsiveDialogContent>
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {editingId ? "Editar" : "Novo"} Condomínio
                  </ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      placeholder="Nome do condomínio"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Endereço completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total_units">Número de Unidades</Label>
                    <Input
                      id="total_units"
                      type="number"
                      value={formData.total_units}
                      onChange={(e) =>
                        setFormData({ ...formData, total_units: e.target.value })
                      }
                      placeholder="Ex: 10, 15, 20..."
                    />
                  </div>
                  <Button type="submit" variant="gradient" className="w-full">
                    {editingId ? "Atualizar" : "Criar"}
                  </Button>
                </form>
              </ResponsiveDialogContent>
            </ResponsiveDialog>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsCard
            title="Total de Condomínios"
            value={stats.total}
            icon={Building2}
            variant="primary"
          />
          <StatsCard
            title="Total de Unidades"
            value={stats.totalUnits}
            icon={Home}
            variant="success"
            description="Soma de todas as unidades"
          />
          <StatsCard
            title="Com Endereço"
            value={stats.withAddress}
            icon={MapPin}
            variant="info"
            description="Condomínios com endereço cadastrado"
          />
        </div>

        {/* Data Table */}
        <Card>
          <DataTableHeader
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por nome ou endereço..."
            onRefresh={fetchCondominiums}
            isRefreshing={isLoading}
            resultCount={filteredCondominiums.length}
            resultLabel="condomínios encontrados"
          />
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton columns={4} rows={5} />
            ) : filteredCondominiums.length === 0 ? (
              <EmptyState
                icon={Building2}
                title={
                  searchQuery
                    ? "Nenhum condomínio encontrado"
                    : "Nenhum condomínio cadastrado"
                }
                description={
                  searchQuery
                    ? "Tente alterar os termos da busca"
                    : "Comece adicionando o primeiro condomínio ao sistema"
                }
                actionLabel={!searchQuery ? "Novo Condomínio" : undefined}
                onAction={!searchQuery ? handleOpenNew : undefined}
              />
            ) : (
              <ResponsiveDataView
                desktopView={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Endereço</TableHead>
                        <TableHead>Nº de Unidades</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredCondominiums.map((condo) => (
                        <TableRow 
                          key={condo.id} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/dashboard/condominiums/${condo.id}/units`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <Building2 className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">{condo.name}</span>
                                <span className="text-xs text-muted-foreground">Clique para ver unidades</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {condo.address || (
                              <span className="italic text-muted-foreground/50">
                                Não informado
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {condo.total_units ? (
                              <Badge variant="secondary" className="cursor-pointer">
                                {condo.total_units} unidades
                                <ChevronRight className="ml-1 h-3 w-3" />
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(condo);
                                }}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm(condo.id);
                                }}
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
                    {filteredCondominiums.map((condo) => (
                      <MobileDataCard
                        key={condo.id}
                        onClick={() => navigate(`/dashboard/condominiums/${condo.id}/units`)}
                      >
                        <MobileDataHeader
                          avatar={
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                          }
                          title={condo.name}
                          subtitle="Toque para ver unidades"
                          badge={
                            condo.total_units ? (
                              <Badge variant="secondary" className="text-xs">
                                {condo.total_units} un.
                              </Badge>
                            ) : null
                          }
                        />
                        
                        <div className="space-y-1">
                          <MobileDataRow
                            label="Endereço"
                            value={condo.address || <span className="text-muted-foreground/50 italic">Não informado</span>}
                          />
                          <MobileDataRow
                            label="Unidades"
                            value={
                              <div className="flex items-center gap-1">
                                <Home className="h-3 w-3 text-muted-foreground" />
                                <span>{condo.total_units || 0}</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              </div>
                            }
                          />
                        </div>

                        <MobileDataActions>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(condo)}
                            className="text-xs flex-1"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirm(condo.id)}
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

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          title="Excluir Condomínio"
          description="Tem certeza que deseja excluir este condomínio? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
          variant="destructive"
        />
      </div>
    </DashboardLayout>
  );
};

export default Condominiums;
