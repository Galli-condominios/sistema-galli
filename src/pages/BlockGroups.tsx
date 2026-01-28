import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
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
import { Plus, Pencil, Trash2, Users2, Building2, Home, MessageSquare, Shield, AlertTriangle, UserCheck } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import DataTableHeader from "@/components/DataTableHeader";
import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ResponsiveDataView } from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataHeader, MobileDataRow, MobileDataActions } from "@/components/MobileDataCard";
import { GroupUnitsManager } from "@/components/groups/GroupUnitsManager";
import { useBlockGroups, BlockGroup, BlockGroupInsert, MessagePermission } from "@/hooks/useBlockGroups";
import { useCondominiumFilter } from "@/hooks/useCondominiumFilter";
import { useCondominium } from "@/contexts/CondominiumContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

const BlockGroups = () => {
  const navigate = useNavigate();
  const { condominiumId, shouldFilter } = useCondominiumFilter();
  const { condominiums } = useCondominium();
  const {
    blockGroups,
    isLoading,
    createBlockGroup,
    updateBlockGroup,
    deleteBlockGroup,
    assignUnitsToGroup,
    removeUnitsFromGroup,
    isCreating,
    isUpdating,
    isDeleting,
    isAssigning,
  } = useBlockGroups();

  const [isOpen, setIsOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<BlockGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [condominiumUsers, setCondominiumUsers] = useState<{ id: string; full_name: string; unit_number?: string }[]>([]);
  const [selectedCondominiumId, setSelectedCondominiumId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    block: "",
    is_default: false,
    message_permission: "members" as MessagePermission,
    condominium_id: "",
  });

  const filteredGroups = useMemo(() => {
    if (!blockGroups) return [];
    if (!searchQuery) return blockGroups;
    const query = searchQuery.toLowerCase();
    return blockGroups.filter(
      (g) =>
        g.name?.toLowerCase().includes(query) ||
        g.block?.toLowerCase().includes(query)
    );
  }, [blockGroups, searchQuery]);

  const stats = useMemo(() => {
    if (!blockGroups) return { total: 0, totalUnits: 0, defaultGroups: 0, groupsWithoutUnits: 0 };
    const totalUnits = blockGroups.reduce((acc, g) => acc + (g.units_count || 0), 0);
    const defaultGroups = blockGroups.filter((g) => g.is_default).length;
    const groupsWithoutUnits = blockGroups.filter((g) => (g.units_count || 0) === 0).length;
    return { total: blockGroups.length, totalUnits, defaultGroups, groupsWithoutUnits };
  }, [blockGroups]);

  // Fetch users from the selected condominium
  const fetchCondominiumUsers = async (condoId: string) => {
    if (!condoId) {
      setCondominiumUsers([]);
      return;
    }

    const { data, error } = await supabase
      .from("residents")
      .select(`
        user_id,
        profiles!fk_residents_profiles(id, full_name),
        units!inner(unit_number, condominium_id)
      `)
      .eq("units.condominium_id", condoId)
      .eq("is_active", true);

    if (!error && data) {
      const users = data.map((r: any) => ({
        id: r.user_id,
        full_name: r.profiles?.full_name || "Usuário",
        unit_number: r.units?.unit_number,
      }));
      // Remove duplicates by user_id
      const uniqueUsers = users.filter((user, index, self) =>
        index === self.findIndex((u) => u.id === user.id)
      );
      setCondominiumUsers(uniqueUsers);
    }
  };

  // Fetch existing group members when editing
  const fetchGroupMembers = async (groupId: string) => {
    const { data, error } = await supabase
      .from("block_group_members")
      .select("user_id")
      .eq("block_group_id", groupId);

    if (!error && data) {
      setSelectedUsers(data.map((m) => m.user_id));
    }
  };

  useEffect(() => {
    if (selectedCondominiumId) {
      fetchCondominiumUsers(selectedCondominiumId);
    } else {
      setCondominiumUsers([]);
    }
  }, [selectedCondominiumId]);

  const handleOpenNew = () => {
    setEditingGroup(null);
    setSelectedUsers([]);
    const newCondoId = condominiumId || "";
    setSelectedCondominiumId(newCondoId);
    setFormData({
      name: "",
      block: "",
      is_default: false,
      message_permission: "members",
      condominium_id: newCondoId,
    });
    setIsOpen(true);
  };

  const handleEdit = async (group: BlockGroup) => {
    setEditingGroup(group);
    setSelectedCondominiumId(group.condominium_id);
    setEditingGroup(group);
    setFormData({
      name: group.name,
      block: group.block || "",
      is_default: group.is_default,
      message_permission: group.message_permission,
      condominium_id: group.condominium_id,
    });
    
    // Fetch existing members if specific_users permission
    if (group.message_permission === "specific_users") {
      await fetchGroupMembers(group.id);
    } else {
      setSelectedUsers([]);
    }
    
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingGroup) {
      updateBlockGroup({
        id: editingGroup.id,
        updates: {
          name: formData.name,
          block: formData.block || null,
          is_default: formData.is_default,
          message_permission: formData.message_permission,
        },
      });
      
      // Update group members if specific_users permission
      if (formData.message_permission === "specific_users") {
        // Delete existing members
        await supabase
          .from("block_group_members")
          .delete()
          .eq("block_group_id", editingGroup.id);
        
        // Insert new members
        if (selectedUsers.length > 0) {
          await supabase
            .from("block_group_members")
            .insert(
              selectedUsers.map((userId) => ({
                block_group_id: editingGroup.id,
                user_id: userId,
              }))
            );
        }
      }
    } else {
      // For new groups, we need to create the group first, then add members
      const { data: newGroup, error } = await supabase
        .from("block_groups")
        .insert({
          condominium_id: formData.condominium_id,
          name: formData.name,
          block: formData.block || null,
          is_default: formData.is_default,
          message_permission: formData.message_permission,
        })
        .select()
        .single();
      
      if (!error && newGroup && formData.message_permission === "specific_users" && selectedUsers.length > 0) {
        await supabase
          .from("block_group_members")
          .insert(
            selectedUsers.map((userId) => ({
              block_group_id: newGroup.id,
              user_id: userId,
            }))
          );
      }
    }
    
    setIsOpen(false);
    setEditingGroup(null);
    setSelectedUsers([]);
  };

  const handleDelete = (id: string) => {
    deleteBlockGroup(id);
    setDeleteConfirm(null);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const getPermissionLabel = (permission: string) => {
    if (permission === "members") return "Membros podem enviar";
    if (permission === "specific_users") return "Usuários específicos";
    return "Apenas admins";
  };

  const getPermissionBadge = (permission: string) => {
    if (permission === "members") {
      return <Badge variant="secondary" className="gap-1"><MessageSquare className="h-3 w-3" />Aberto</Badge>;
    }
    if (permission === "specific_users") {
      return <Badge variant="default" className="gap-1"><UserCheck className="h-3 w-3" />Específico</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Shield className="h-3 w-3" />Restrito</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Grupos"
          description="Organize as unidades em grupos para comunicação segmentada"
          count={stats.total}
          countLabel="grupos"
          actions={
              <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
                <ResponsiveDialogTrigger asChild>
                  <Button variant="gradient" onClick={handleOpenNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Grupo
                  </Button>
                </ResponsiveDialogTrigger>
              <ResponsiveDialogContent>
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle className="flex items-center gap-2">
                    <Users2 className="h-5 w-5 text-primary" />
                    {editingGroup ? "Editar" : "Novo"} Grupo
                  </ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!shouldFilter && (
                    <div className="space-y-2">
                      <Label htmlFor="condominium">Condomínio</Label>
                      <Select
                        value={formData.condominium_id}
                        onValueChange={(value) => {
                          setFormData({ ...formData, condominium_id: value });
                          setSelectedCondominiumId(value);
                        }}
                        disabled={!!editingGroup}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o condomínio" />
                        </SelectTrigger>
                        <SelectContent>
                          {condominiums?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Grupo</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Ex: Bloco A, Torre Norte, Geral..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="block">Identificador do Bloco (opcional)</Label>
                    <Input
                      id="block"
                      value={formData.block}
                      onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                      placeholder="Ex: A, B, 1, 2..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="permission">Permissão de Mensagens</Label>
                    <Select
                      value={formData.message_permission}
                      onValueChange={(value: MessagePermission) => 
                        setFormData({ ...formData, message_permission: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="members">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Membros podem enviar mensagens
                          </div>
                        </SelectItem>
                        <SelectItem value="admins_only">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Apenas administradores
                          </div>
                        </SelectItem>
                        <SelectItem value="specific_users">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            Usuários específicos
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* User selection when specific_users is selected */}
                  {formData.message_permission === "specific_users" && (
                    <div className="space-y-2">
                      <Label>Selecione os Usuários ({selectedUsers.length} selecionados)</Label>
                      <ScrollArea className="h-48 rounded-md border p-2">
                        {condominiumUsers.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {selectedCondominiumId 
                              ? "Nenhum morador encontrado neste condomínio"
                              : "Selecione um condomínio primeiro"
                            }
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {condominiumUsers.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted"
                              >
                                <Checkbox
                                  checked={selectedUsers.includes(user.id)}
                                  onCheckedChange={(checked) => {
                                    // Prevent double-toggle loops by handling selection only here
                                    if (checked) {
                                      setSelectedUsers((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]));
                                    } else {
                                      setSelectedUsers((prev) => prev.filter((id) => id !== user.id));
                                    }
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{user.full_name}</p>
                                  {user.unit_number && (
                                    <p className="text-xs text-muted-foreground">Unidade {user.unit_number}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_default">Grupo Padrão</Label>
                      <p className="text-xs text-muted-foreground">
                        Grupo padrão para condomínios horizontais
                      </p>
                    </div>
                    <Switch
                      id="is_default"
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    variant="gradient" 
                    className="w-full"
                    disabled={isCreating || isUpdating}
                  >
                    {editingGroup ? "Atualizar" : "Criar"} Grupo
                  </Button>
                </form>
              </ResponsiveDialogContent>
            </ResponsiveDialog>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsCard
            title="Total de Grupos"
            value={stats.total}
            icon={Users2}
            variant="primary"
          />
          <StatsCard
            title="Unidades Atribuídas"
            value={stats.totalUnits}
            icon={Home}
            variant="success"
            description="Unidades em grupos"
          />
          <StatsCard
            title="Grupos Padrão"
            value={stats.defaultGroups}
            icon={Building2}
            variant="info"
          />
        </div>

        {/* Data Table */}
        <Card>
          <DataTableHeader
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por nome ou bloco..."
            resultCount={filteredGroups.length}
            resultLabel="grupos encontrados"
          />
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton columns={5} rows={5} />
            ) : filteredGroups.length === 0 ? (
              <EmptyState
                icon={Users2}
                title={searchQuery ? "Nenhum grupo encontrado" : "Nenhum grupo cadastrado"}
                description={
                  searchQuery
                    ? "Tente alterar os termos da busca"
                    : "Comece criando o primeiro grupo para organizar as unidades"
                }
                actionLabel={!searchQuery ? "Novo Grupo" : undefined}
                onAction={!searchQuery ? handleOpenNew : undefined}
              />
            ) : (
              <ResponsiveDataView
                desktopView={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Bloco</TableHead>
                        <TableHead>Condomínio</TableHead>
                        <TableHead>Unidades</TableHead>
                        <TableHead>Permissões</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <Users2 className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">{group.name}</span>
                                {group.is_default && (
                                  <Badge variant="outline" className="w-fit text-xs">Padrão</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.block || <span className="italic text-muted-foreground/50">-</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.condominiums?.name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {group.units_count || 0} unidades
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getPermissionBadge(group.message_permission)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(group)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm(group.id)}
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
                    {filteredGroups.map((group) => (
                      <MobileDataCard key={group.id}>
                        <MobileDataHeader
                          avatar={
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                              <Users2 className="h-5 w-5 text-primary" />
                            </div>
                          }
                          title={group.name}
                          subtitle={group.condominiums?.name}
                          badge={
                            group.is_default ? (
                              <Badge variant="outline" className="text-xs">Padrão</Badge>
                            ) : null
                          }
                        />
                        
                        <div className="space-y-1">
                          <MobileDataRow
                            label="Bloco"
                            value={group.block || <span className="text-muted-foreground/50 italic">-</span>}
                          />
                          <MobileDataRow
                            label="Unidades"
                            value={
                              <Badge variant="secondary">
                                {group.units_count || 0} unidades
                              </Badge>
                            }
                          />
                          <MobileDataRow
                            label="Permissões"
                            value={getPermissionBadge(group.message_permission)}
                          />
                        </div>

                        <MobileDataActions>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(group)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirm(group.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
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

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteConfirm}
          onOpenChange={() => setDeleteConfirm(null)}
          title="Excluir Grupo"
          description="Tem certeza que deseja excluir este grupo? As unidades serão desassociadas mas não serão excluídas."
          confirmText="Excluir"
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
          variant="destructive"
        />
      </div>
    </DashboardLayout>
  );
};

export default BlockGroups;
