import { useState, useEffect, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Briefcase, Phone, Building2 } from "lucide-react";
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

const Employees = () => {
  const { selectedCondominiumId, selectedCondominium, isAdmin } = useCondominium();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    contact: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    
    let employeesQuery = supabase.from("employees").select("*, condominiums(name)").order("name");
    
    if (isAdmin && selectedCondominiumId) {
      employeesQuery = employeesQuery.eq("condominium_id", selectedCondominiumId);
    }

    const { data, error } = await employeesQuery;

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setEmployees(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedCondominiumId, isAdmin]);

  const positions = useMemo(() => {
    const uniquePositions = new Set(employees.map((e) => e.position).filter(Boolean));
    return Array.from(uniquePositions).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let filtered = employees;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name?.toLowerCase().includes(query) ||
          e.position?.toLowerCase().includes(query) ||
          e.contact?.toLowerCase().includes(query) ||
          e.condominiums?.name?.toLowerCase().includes(query)
      );
    }
    if (filterPosition && filterPosition !== "all") {
      filtered = filtered.filter((e) => e.position === filterPosition);
    }
    return filtered;
  }, [employees, searchQuery, filterPosition]);

  const stats = useMemo(() => {
    const total = employees.length;
    const withContact = employees.filter((e) => e.contact).length;
    const positionCount = positions.length;
    return { total, withContact, positionCount };
  }, [employees, positions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCondominiumId && !editingId) {
      toast({ title: "Erro", description: "Selecione um condomínio primeiro", variant: "destructive" });
      return;
    }

    if (editingId) {
      const { error } = await supabase.from("employees").update(formData).eq("id", editingId);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Funcionário atualizado!" });
      }
    } else {
      const { error } = await supabase.from("employees").insert([{
        ...formData,
        condominium_id: selectedCondominiumId,
      }]);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Funcionário criado!" });
      }
    }

    setIsOpen(false);
    setFormData({ name: "", position: "", contact: "" });
    setEditingId(null);
    fetchData();
  };

  const handleEdit = (employee: any) => {
    setEditingId(employee.id);
    setFormData({
      name: employee.name,
      position: employee.position,
      contact: employee.contact || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Funcionário excluído!" });
      fetchData();
    }
    setDeleteConfirm(null);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ name: "", position: "", contact: "" });
    setIsOpen(true);
  };

  const canCreateNew = isAdmin && selectedCondominiumId;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Funcionários"
          description="Gerencie os funcionários dos condomínios"
          count={stats.total}
          countLabel="funcionários"
          actions={
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="gradient" 
                  onClick={handleOpenNew}
                  disabled={!canCreateNew}
                  title={!canCreateNew ? "Selecione um condomínio primeiro" : undefined}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Funcionário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {editingId ? "Editar" : "Novo"} Funcionário
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {selectedCondominium && !editingId && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        Criando para: {selectedCondominium.name}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Cargo</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      required
                      placeholder="Ex: Porteiro, Zelador"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contato</Label>
                    <Input
                      id="contact"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="Ex: (11) 98765-4321"
                    />
                  </div>
                  <Button type="submit" variant="gradient" className="w-full">
                    {editingId ? "Atualizar" : "Criar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsCard
            title="Total de Funcionários"
            value={stats.total}
            icon={Users}
            variant="primary"
          />
          <StatsCard
            title="Cargos Diferentes"
            value={stats.positionCount}
            icon={Briefcase}
            variant="info"
          />
          <StatsCard
            title="Com Contato"
            value={stats.withContact}
            icon={Phone}
            variant="success"
            description="Funcionários com telefone cadastrado"
          />
        </div>

        {/* Data Table */}
        <Card>
          <DataTableHeader
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por nome, cargo, contato ou condomínio..."
            onRefresh={fetchData}
            isRefreshing={isLoading}
            resultCount={filteredEmployees.length}
            resultLabel="funcionários encontrados"
            filters={
              positions.length > 0 && (
                <Select value={filterPosition} onValueChange={setFilterPosition}>
                  <SelectTrigger className="w-[150px]">
                    <Briefcase className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os cargos</SelectItem>
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }
          />
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton columns={5} rows={5} />
            ) : filteredEmployees.length === 0 ? (
              <EmptyState
                icon={Users}
                title={
                  searchQuery || filterPosition !== "all"
                    ? "Nenhum funcionário encontrado"
                    : "Nenhum funcionário cadastrado"
                }
                description={
                  searchQuery || filterPosition !== "all"
                    ? "Tente alterar os filtros de busca"
                    : "Comece adicionando o primeiro funcionário ao sistema"
                }
                actionLabel={
                  !searchQuery && filterPosition === "all" ? "Novo Funcionário" : undefined
                }
                onAction={
                  !searchQuery && filterPosition === "all" ? handleOpenNew : undefined
                }
              />
            ) : (
              <ResponsiveDataView
                desktopView={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Condomínio</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                                {employee.name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <span className="font-medium">{employee.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {employee.condominiums?.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="info">{employee.position}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {employee.contact ? (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                {employee.contact}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(employee)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm(employee.id)}
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
                    {filteredEmployees.map((employee) => (
                      <MobileDataCard key={employee.id}>
                        <MobileDataHeader
                          avatar={
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                              {employee.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          }
                          title={employee.name}
                          subtitle={employee.condominiums?.name}
                          badge={<Badge variant="info">{employee.position}</Badge>}
                          actions={
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(employee)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm(employee.id)}
                                className="h-8 w-8 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          }
                        />
                        <MobileDataRow label="Contato" value={employee.contact || "-"} />
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
          title="Excluir Funcionário"
          description="Tem certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
          variant="destructive"
        />
      </div>
    </DashboardLayout>
  );
};

export default Employees;
