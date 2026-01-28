import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Building2, Users, CheckCircle, MapPin, LayoutGrid, List, Eye } from "lucide-react";
import { useCommonAreas } from "@/hooks/useCommonAreas";
import { useUserRole } from "@/hooks/useUserRole";
import { useCondominium } from "@/contexts/CondominiumContext";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import StatsCard from "@/components/StatsCard";
import DataTableHeader from "@/components/DataTableHeader";
import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
import StatsCardSkeleton from "@/components/StatsCardSkeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import ResponsiveDataView from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataRow, MobileDataHeader, MobileDataActions } from "@/components/MobileDataCard";
import CommonAreaCard from "@/components/CommonAreaCard";
import CommonAreaMultiImageUpload from "@/components/CommonAreaMultiImageUpload";

const CommonAreas = () => {
  const navigate = useNavigate();
  const { isAdmin, isResident } = useUserRole();
  const { selectedCondominiumId, condominiums } = useCondominium();
  const { commonAreas, isLoading, createCommonArea, updateCommonArea, deleteCommonArea } =
    useCommonAreas();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    condominium_id: selectedCondominiumId || "",
    name: "",
    description: "",
    capacity: "",
    rules: "",
    requires_approval: true,
    cancellation_policy: "",
    image_urls: [] as string[],
    available_days: [0, 1, 2, 3, 4, 5, 6] as number[],
    opening_time: "08:00",
    closing_time: "22:00",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterApproval, setFilterApproval] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">(isResident() ? "cards" : "table");
  const [previewArea, setPreviewArea] = useState<any | null>(null);

  // Update form condominium when selection changes
  useEffect(() => {
    if (selectedCondominiumId && !editingId) {
      setFormData(prev => ({ ...prev, condominium_id: selectedCondominiumId }));
    }
  }, [selectedCondominiumId, editingId]);

  // Atualiza o modo de visualização quando o role muda
  useEffect(() => {
    if (isResident()) {
      setViewMode("cards");
    }
  }, [isResident]);

  const filteredAreas = useMemo(() => {
    let filtered = commonAreas || [];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a: any) =>
          a.name?.toLowerCase().includes(query) ||
          a.condominiums?.name?.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query)
      );
    }
    if (filterApproval && filterApproval !== "all") {
      const requiresApproval = filterApproval === "yes";
      filtered = filtered.filter((a: any) => a.requires_approval === requiresApproval);
    }
    return filtered;
  }, [commonAreas, searchQuery, filterApproval]);

  const stats = useMemo(() => {
    const total = commonAreas?.length || 0;
    const requiresApproval = commonAreas?.filter((a: any) => a.requires_approval).length || 0;
    const totalCapacity = commonAreas?.reduce((acc: number, a: any) => acc + (a.capacity || 0), 0) || 0;
    return { total, requiresApproval, totalCapacity };
  }, [commonAreas]);

  const resetForm = () => {
    setFormData({
      condominium_id: selectedCondominiumId || "",
      name: "",
      description: "",
      capacity: "",
      rules: "",
      requires_approval: true,
      cancellation_policy: "",
      image_urls: [],
      available_days: [0, 1, 2, 3, 4, 5, 6],
      opening_time: "08:00",
      closing_time: "22:00",
    });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
    };

    if (editingId) {
      updateCommonArea({ id: editingId, updates: data });
    } else {
      createCommonArea(data);
    }

    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (area: any) => {
    // Parse image_urls do JSONB
    let imageUrls: string[] = [];
    if (area.image_urls && Array.isArray(area.image_urls)) {
      imageUrls = area.image_urls;
    } else if (area.image_url) {
      imageUrls = [area.image_url];
    }

    // Parse available_days do JSONB
    let availableDays: number[] = [0, 1, 2, 3, 4, 5, 6];
    if (area.available_days && Array.isArray(area.available_days)) {
      availableDays = area.available_days;
    }

    setFormData({
      condominium_id: area.condominium_id,
      name: area.name,
      description: area.description || "",
      capacity: area.capacity?.toString() || "",
      rules: area.rules || "",
      requires_approval: area.requires_approval ?? true,
      cancellation_policy: area.cancellation_policy || "",
      image_urls: imageUrls,
      available_days: availableDays,
      opening_time: area.opening_time?.slice(0, 5) || "08:00",
      closing_time: area.closing_time?.slice(0, 5) || "22:00",
    });
    setEditingId(area.id);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteCommonArea(id);
    setDeleteConfirm(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleReserve = (area: any, selectedDate?: Date) => {
    // Navega para a página de reservas com o ID da área pré-selecionada
    let url = `/dashboard/reservations?area=${area.id}`;
    if (selectedDate) {
      url += `&date=${selectedDate.toISOString().split('T')[0]}`;
    }
    navigate(url);
  };

  const showAdminControls = isAdmin();

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando áreas comuns..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Áreas Comuns"
          description={isResident() ? "Conheça e reserve as áreas comuns do condomínio" : "Gerencie as áreas comuns do condomínio"}
          count={stats.total}
          countLabel="áreas"
          actions={
            <div className="flex items-center gap-2">
              {/* Toggle de visualização (apenas para admin) */}
              {showAdminControls && (
                <div className="flex items-center bg-muted rounded-lg p-1">
                  <Button
                    variant={viewMode === "cards" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cards")}
                    className="h-8 px-3"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-8 px-3"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {showAdminControls && (
                <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
                  <ResponsiveDialogTrigger asChild>
                    <Button 
                      variant="gradient" 
                      onClick={handleOpenNew}
                      disabled={!selectedCondominiumId}
                      title={!selectedCondominiumId ? "Selecione um condomínio primeiro" : undefined}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Área Comum
                    </Button>
                  </ResponsiveDialogTrigger>
                  <ResponsiveDialogContent className="max-w-2xl">
                    <ResponsiveDialogHeader>
                      <ResponsiveDialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        {editingId ? "Editar Área Comum" : "Nova Área Comum"}
                      </ResponsiveDialogTitle>
                    </ResponsiveDialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Upload de Múltiplas Imagens */}
                      <CommonAreaMultiImageUpload
                        currentUrls={formData.image_urls}
                        onUploadComplete={(urls) => setFormData({ ...formData, image_urls: urls })}
                        maxImages={10}
                      />

                      {/* Visual indicator do condomínio selecionado */}
                      {selectedCondominiumId && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="text-sm">
                            Criando para: <strong>{condominiums.find(c => c.id === selectedCondominiumId)?.name}</strong>
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome da Área</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Salão de Festas"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="capacity">Capacidade (pessoas)</Label>
                          <Input
                            id="capacity"
                            type="number"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                            placeholder="Ex: 50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Descreva a área comum..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rules">Regras de Uso</Label>
                        <Textarea
                          id="rules"
                          value={formData.rules}
                          onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                          placeholder="Descreva as regras de uso..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cancellation_policy">Política de Cancelamento</Label>
                        <Textarea
                          id="cancellation_policy"
                          value={formData.cancellation_policy}
                          onChange={(e) =>
                            setFormData({ ...formData, cancellation_policy: e.target.value })
                          }
                          placeholder="Ex: Cancelamento com 48h de antecedência..."
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="requires_approval"
                          checked={formData.requires_approval}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, requires_approval: checked })
                          }
                        />
                        <Label htmlFor="requires_approval">Requer aprovação do síndico</Label>
                      </div>

                      {/* Dias Disponíveis */}
                      <div className="space-y-3">
                        <Label>Dias Disponíveis</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 0, label: "Dom" },
                            { value: 1, label: "Seg" },
                            { value: 2, label: "Ter" },
                            { value: 3, label: "Qua" },
                            { value: 4, label: "Qui" },
                            { value: 5, label: "Sex" },
                            { value: 6, label: "Sáb" },
                          ].map((day) => (
                            <Button
                              key={day.value}
                              type="button"
                              variant={formData.available_days.includes(day.value) ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                const newDays = formData.available_days.includes(day.value)
                                  ? formData.available_days.filter((d) => d !== day.value)
                                  : [...formData.available_days, day.value].sort((a, b) => a - b);
                                setFormData({ ...formData, available_days: newDays });
                              }}
                              className="w-12"
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ ...formData, available_days: [0, 1, 2, 3, 4, 5, 6] })}
                          >
                            Todos
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ ...formData, available_days: [1, 2, 3, 4, 5] })}
                          >
                            Dias úteis
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ ...formData, available_days: [0, 6] })}
                          >
                            Fins de semana
                          </Button>
                        </div>
                      </div>

                      {/* Horários de Funcionamento */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="opening_time">Horário de Abertura</Label>
                          <Input
                            id="opening_time"
                            type="time"
                            value={formData.opening_time}
                            onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="closing_time">Horário de Fechamento</Label>
                          <Input
                            id="closing_time"
                            type="time"
                            value={formData.closing_time}
                            onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                          />
                        </div>
                      </div>

                      <ResponsiveDialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
                          Cancelar
                        </Button>
                        <Button type="submit" variant="gradient" className="w-full sm:w-auto">
                          {editingId ? "Salvar" : "Criar"}
                        </Button>
                      </ResponsiveDialogFooter>
                    </form>
                  </ResponsiveDialogContent>
                </ResponsiveDialog>
              )}
            </div>
          }
        />

        {/* Stats Cards (apenas para admin) */}
        {showAdminControls && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {isLoading ? (
              <StatsCardSkeleton count={3} />
            ) : (
              <>
                <StatsCard
                  title="Total de Áreas"
                  value={stats.total}
                  icon={MapPin}
                  variant="primary"
                />
                <StatsCard
                  title="Requerem Aprovação"
                  value={stats.requiresApproval}
                  icon={CheckCircle}
                  variant="warning"
                />
                <StatsCard
                  title="Capacidade Total"
                  value={`${stats.totalCapacity} pessoas`}
                  icon={Users}
                  variant="info"
                  description="Soma de todas as capacidades"
                />
              </>
            )}
          </div>
        )}

        {/* Busca e Filtros */}
        <Card>
          <DataTableHeader
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por nome, condomínio ou descrição..."
            isRefreshing={isLoading}
            resultCount={filteredAreas.length}
            resultLabel="áreas encontradas"
            filters={
              <Select value={filterApproval} onValueChange={setFilterApproval}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Aprovação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="yes">Requer aprovação</SelectItem>
                  <SelectItem value="no">Sem aprovação</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          {/* Conteúdo - Cards ou Tabela */}
          {viewMode === "cards" ? (
            <CardContent className="p-6">
              {isLoading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[4/3] rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : filteredAreas.length === 0 ? (
                <EmptyState
                  icon={MapPin}
                  title={
                    searchQuery || filterApproval !== "all"
                      ? "Nenhuma área encontrada"
                      : "Nenhuma área comum disponível"
                  }
                  description={
                    searchQuery || filterApproval !== "all"
                      ? "Tente alterar os filtros de busca"
                      : "Ainda não há áreas comuns cadastradas"
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredAreas.map((area: any) => (
                    <CommonAreaCard
                      key={area.id}
                      area={area}
                      onReserve={handleReserve}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          ) : (
            <CardContent className="p-0">
              {isLoading ? (
                <TableSkeleton columns={5} rows={5} />
              ) : filteredAreas.length === 0 ? (
                <EmptyState
                  icon={MapPin}
                  title={
                    searchQuery || filterApproval !== "all"
                      ? "Nenhuma área encontrada"
                      : "Nenhuma área comum cadastrada"
                  }
                  description={
                    searchQuery || filterApproval !== "all"
                      ? "Tente alterar os filtros de busca"
                      : "Comece adicionando a primeira área comum"
                  }
                  actionLabel={
                    !searchQuery && filterApproval === "all" ? "Nova Área Comum" : undefined
                  }
                  onAction={
                    !searchQuery && filterApproval === "all" ? handleOpenNew : undefined
                  }
                />
              ) : (
                <ResponsiveDataView
                  desktopView={
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[35%]">Nome</TableHead>
                          <TableHead className="w-[25%]">Condomínio</TableHead>
                          <TableHead className="w-[15%]">Capacidade</TableHead>
                          <TableHead className="w-[15%]">Aprovação</TableHead>
                          <TableHead className="w-[10%] text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAreas.map((area: any) => (
                          <TableRow key={area.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {area.image_url ? (
                                  <img 
                                    src={area.image_url} 
                                    alt={area.name}
                                    className="h-9 w-9 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                    <MapPin className="h-4 w-4 text-primary" />
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium">{area.name}</span>
                                  {area.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {area.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {area.condominiums?.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {area.capacity ? (
                                <Badge variant="secondary">
                                  <Users className="mr-1 h-3 w-3" />
                                  {area.capacity} pessoas
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground/50">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {area.requires_approval ? (
                                <Badge variant="warning">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Requer Aprovação
                                </Badge>
                              ) : (
                                <Badge variant="success">Livre</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPreviewArea(area)}
                                  className="h-8 w-8"
                                  title="Visualizar como morador"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(area)}
                                  className="h-8 w-8"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteConfirm(area.id)}
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
                      {filteredAreas.map((area: any) => (
                        <MobileDataCard key={area.id}>
                          <MobileDataHeader
                            avatar={
                              area.image_url ? (
                                <img src={area.image_url} alt={area.name} className="h-9 w-9 rounded-lg object-cover" />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                  <MapPin className="h-4 w-4 text-primary" />
                                </div>
                              )
                            }
                            title={area.name}
                            subtitle={area.condominiums?.name}
                            badge={
                              area.requires_approval ? (
                                <Badge variant="warning" className="text-[10px]">Aprovação</Badge>
                              ) : (
                                <Badge variant="success" className="text-[10px]">Livre</Badge>
                              )
                            }
                            actions={
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewArea(area)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(area)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(area.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            }
                          />
                          <MobileDataRow label="Capacidade" value={area.capacity ? `${area.capacity} pessoas` : "-"} />
                          {area.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{area.description}</p>
                          )}
                        </MobileDataCard>
                      ))}
                    </div>
                  }
                />
              )}
            </CardContent>
          )}
        </Card>

        <ConfirmDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          title="Excluir Área Comum"
          description="Tem certeza que deseja excluir esta área comum? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
          variant="destructive"
        />

        {/* Preview Dialog */}
        <Dialog open={!!previewArea} onOpenChange={(open) => !open && setPreviewArea(null)}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-0">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Preview - Visão do Morador
              </DialogTitle>
            </DialogHeader>
            <div className="p-4">
              {previewArea && (
                <CommonAreaCard
                  area={previewArea}
                  onReserve={() => {}}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CommonAreas;
