import { useState, useMemo, useCallback, memo } from "react";
import { useUserRoleContext } from "@/contexts/UserRoleContext";
import { useUsers, useCreateUser, useDeleteUser, useUpdateUser } from "@/hooks/useUsers";
import type { Database } from "@/integrations/supabase/types";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import StatsCard from "@/components/StatsCard";
import DataTableHeader from "@/components/DataTableHeader";
import TableSkeleton from "@/components/TableSkeleton";
import EmptyState from "@/components/EmptyState";
import ResponsiveDataView from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataRow, MobileDataHeader, MobileDataActions } from "@/components/MobileDataCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserRoleSelect } from "@/components/UserRoleSelect";
import { Users, UserCheck, Shield, Plus, Trash2, Pencil, UserCog, Circle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  administrador: "Administrador",
  sindico: "Síndico",
  porteiro: "Porteiro",
  morador: "Morador",
};

const ROLE_COLORS: Record<AppRole, "gold" | "default" | "info" | "muted"> = {
  owner: "gold",
  administrador: "gold",
  sindico: "default",
  porteiro: "info",
  morador: "muted",
};

// Online status indicator component
const OnlineIndicator = memo(({ 
  isOnline, 
  lastSeenAt 
}: { 
  isOnline: boolean; 
  lastSeenAt: string | null;
}) => {
  const timeAgo = lastSeenAt 
    ? formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true, locale: ptBR })
    : "Nunca";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2">
          <Circle 
            className={`h-2.5 w-2.5 ${isOnline ? "fill-green-500 text-green-500" : "fill-muted-foreground/50 text-muted-foreground/50"}`}
          />
          <span className="text-xs text-muted-foreground">
            {isOnline ? "Online" : timeAgo}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {isOnline 
          ? "Usuário está online agora" 
          : `Último acesso: ${lastSeenAt ? new Date(lastSeenAt).toLocaleString("pt-BR") : "Nunca"}`
        }
      </TooltipContent>
    </Tooltip>
  );
});

OnlineIndicator.displayName = "OnlineIndicator";

// Memoized table row component
const UserRow = memo(({ 
  user, 
  onDelete,
  onEdit,
}: { 
  user: { 
    id: string; 
    full_name: string; 
    role: string; 
    created_at: string;
    last_seen_at: string | null;
    is_online: boolean;
  };
  onDelete: (id: string) => void;
  onEdit: (user: { id: string; full_name: string; role: string }) => void;
}) => (
  <TableRow>
    <TableCell>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          {user.is_online && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
          )}
        </div>
        <span className="font-medium">{user.full_name}</span>
      </div>
    </TableCell>
    <TableCell>
      <Badge variant={ROLE_COLORS[user.role as AppRole] || "muted"}>
        {ROLE_LABELS[user.role as AppRole] || user.role}
      </Badge>
    </TableCell>
    <TableCell>
      <OnlineIndicator isOnline={user.is_online} lastSeenAt={user.last_seen_at} />
    </TableCell>
    <TableCell className="text-muted-foreground">
      {new Date(user.created_at).toLocaleDateString("pt-BR")}
    </TableCell>
    <TableCell className="text-right">
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit({ id: user.id, full_name: user.full_name, role: user.role })}
          className="text-muted-foreground hover:text-primary"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(user.id)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </TableCell>
  </TableRow>
));

UserRow.displayName = "UserRow";

const UserManagement = () => {
  const { role: currentUserRole, loading: roleLoading } = useUserRoleContext();
  const { data: users = [], isLoading: usersLoading, refetch } = useUsers();
  const createUserMutation = useCreateUser();
  const deleteUserMutation = useDeleteUser();
  const updateUserMutation = useUpdateUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<{ id: string; full_name: string; role: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "morador" as AppRole,
  });

  const [editFormData, setEditFormData] = useState({
    fullName: "",
    role: "morador" as AppRole,
  });

  const ITEMS_PER_PAGE = 10;

  // Stats calculations
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.role === "administrador" || u.role === "sindico").length;
    const porteiros = users.filter(u => u.role === "porteiro").length;
    const moradores = users.filter(u => u.role === "morador").length;
    return { total, admins, porteiros, moradores };
  }, [users]);

  // Memoized filtered users
  const filteredUsers = useMemo(() => {
    let result = users;
    
    if (filterRole !== "all") {
      result = result.filter(user => user.role === filterRole);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.full_name.toLowerCase().includes(query) ||
        ROLE_LABELS[user.role as AppRole]?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [users, searchQuery, filterRole]);

  // Memoized paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createUserMutation.mutateAsync({
      email: formData.email,
      password: formData.password,
      full_name: formData.fullName,
      role: formData.role,
    });

    setDialogOpen(false);
    setFormData({
      fullName: "",
      email: "",
      password: "",
      role: "morador",
    });
    refetch();
  }, [formData, createUserMutation, refetch]);

  const handleEditSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    
    await updateUserMutation.mutateAsync({
      userId: userToEdit.id,
      full_name: editFormData.fullName,
      role: editFormData.role,
    });

    setEditDialogOpen(false);
    setUserToEdit(null);
    refetch();
  }, [editFormData, userToEdit, updateUserMutation, refetch]);

  const handleEditClick = useCallback((user: { id: string; full_name: string; role: string }) => {
    setUserToEdit(user);
    setEditFormData({
      fullName: user.full_name,
      role: user.role as AppRole,
    });
    setEditDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!userToDelete) return;

    await deleteUserMutation.mutateAsync(userToDelete);
    setDeleteDialogOpen(false);
    setUserToDelete(null);
    refetch();
  }, [userToDelete, deleteUserMutation, refetch]);

  if (roleLoading || usersLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando usuários..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Gerenciamento de Usuários"
          description="Gerencie os usuários e permissões do sistema"
          count={users.length}
          countLabel="usuários"
          actions={
            <Button variant="gradient" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="Total de Usuários"
            value={stats.total}
            icon={Users}
            variant="primary"
          />
          <StatsCard
            title="Administradores"
            value={stats.admins}
            icon={Shield}
            variant="warning"
            description="Admin + Síndico"
          />
          <StatsCard
            title="Porteiros"
            value={stats.porteiros}
            icon={UserCog}
            variant="info"
          />
          <StatsCard
            title="Moradores"
            value={stats.moradores}
            icon={UserCheck}
            variant="success"
          />
        </div>

        {/* Data Table */}
        <DataTableHeader
          searchValue={searchQuery}
          onSearchChange={(value) => {
            setSearchQuery(value);
            setCurrentPage(1);
          }}
          searchPlaceholder="Buscar por nome ou perfil..."
          resultCount={filteredUsers.length}
          resultLabel="usuários"
          onRefresh={() => refetch()}
          isRefreshing={usersLoading}
          filters={
            <Select value={filterRole} onValueChange={(value) => {
              setFilterRole(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filtrar por perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Perfis</SelectItem>
                <SelectItem value="administrador">Administrador</SelectItem>
                <SelectItem value="sindico">Síndico</SelectItem>
                <SelectItem value="porteiro">Porteiro</SelectItem>
                <SelectItem value="morador">Morador</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {usersLoading ? (
          <TableSkeleton columns={5} rows={5} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={searchQuery || filterRole !== "all" ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
            description={
              searchQuery || filterRole !== "all"
                ? "Tente ajustar os filtros ou termo de busca"
                : "Comece adicionando o primeiro usuário do sistema"
            }
            actionLabel={!searchQuery && filterRole === "all" ? "Adicionar Usuário" : undefined}
            onAction={!searchQuery && filterRole === "all" ? () => setDialogOpen(true) : undefined}
          />
        ) : (
          <>
            <ResponsiveDataView
              desktopView={
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Nome</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((user) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          onDelete={handleDeleteClick}
                          onEdit={handleEditClick}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              }
              mobileView={
                <div className="space-y-3">
                  {paginatedUsers.map((user) => (
                    <MobileDataCard key={user.id}>
                      <MobileDataHeader
                        avatar={
                          <div className="relative">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                              {user.full_name.charAt(0).toUpperCase()}
                            </div>
                            {user.is_online && (
                              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                            )}
                          </div>
                        }
                        title={user.full_name}
                        badge={
                          <Badge variant={ROLE_COLORS[user.role as AppRole] || "muted"}>
                            {ROLE_LABELS[user.role as AppRole] || user.role}
                          </Badge>
                        }
                        actions={
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick({ id: user.id, full_name: user.full_name, role: user.role })}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(user.id)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        }
                      />
                      <MobileDataRow 
                        label="Status" 
                        value={
                          <OnlineIndicator isOnline={user.is_online} lastSeenAt={user.last_seen_at} />
                        } 
                      />
                      <MobileDataRow 
                        label="Criado em" 
                        value={new Date(user.created_at).toLocaleDateString("pt-BR")} 
                      />
                    </MobileDataCard>
                  ))}
                </div>
              }
            />

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length} usuários
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo usuário
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Perfil</Label>
                <UserRoleSelect
                  currentUserRole={currentUserRole}
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                />
              </div>
              <Button type="submit" className="w-full" variant="gradient" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize os dados do usuário
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editFullName">Nome Completo</Label>
                <Input
                  id="editFullName"
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRole">Perfil</Label>
                <UserRoleSelect
                  currentUserRole={currentUserRole}
                  value={editFormData.role}
                  onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
                />
              </div>
              <Button type="submit" className="w-full" variant="gradient" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteUserMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;