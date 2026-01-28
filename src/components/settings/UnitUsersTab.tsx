import { useState } from "react";
import { Users, UserPlus, Trash2, Edit, Loader2, Crown, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useUnitUsers } from "@/hooks/useUnitUsers";
import EmptyState from "@/components/EmptyState";

export const UnitUsersTab = () => {
  const { userUnit } = useUnitUsers();
  const unitId = userUnit?.unitId;
  
  const { 
    unitUsers, 
    isLoading, 
    isPrimaryUser,
    canAddMoreUsers,
    additionalUsersCount,
    maxAdditionalUsers,
    addUnitUser, 
    updateUnitUser,
    removeUnitUser 
  } = useUnitUsers(unitId);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; nickname: string } | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    nickname: "",
  });

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      nickname: "",
    });
  };

  const handleAddUser = async () => {
    if (formData.password !== formData.confirmPassword) {
      return;
    }

    await addUnitUser.mutateAsync({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
      nickname: formData.nickname || undefined,
    });

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    await updateUnitUser.mutateAsync({
      unitUserId: editingUser.id,
      nickname: editingUser.nickname,
    });

    setIsEditDialogOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;

    await removeUnitUser.mutateAsync(deleteConfirmUser.id);
    setDeleteConfirmUser(null);
  };

  const openEditDialog = (user: { id: string; nickname: string | null }) => {
    setEditingUser({ id: user.id, nickname: user.nickname || "" });
    setIsEditDialogOpen(true);
  };

  if (!userUnit) {
    return (
      <EmptyState
        icon={Users}
        title="Sem unidade vinculada"
        description="Você não está vinculado a nenhuma unidade no momento."
      />
    );
  }

  const usagePercentage = (additionalUsersCount / maxAdditionalUsers) * 100;

  return (
    <div className="space-y-6">
      {/* Unit Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Usuários da Unidade {userUnit.unit?.unit_number}
            {userUnit.unit?.block && ` - Bloco ${userUnit.unit.block}`}
          </CardTitle>
          <CardDescription>
            {isPrimaryUser 
              ? "Como titular, você pode adicionar até 4 usuários adicionais à sua unidade"
              : "Visualize os usuários vinculados à sua unidade"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Usuários adicionais</span>
              <span className="font-medium">{additionalUsersCount} / {maxAdditionalUsers}</span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Membros da Unidade</CardTitle>
            <CardDescription>
              Todos os usuários com acesso a esta unidade
            </CardDescription>
          </div>
          {isPrimaryUser && canAddMoreUsers && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : unitUsers && unitUsers.length > 0 ? (
            <div className="space-y-4">
              {unitUsers.map((unitUser) => (
                <div
                  key={unitUser.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={unitUser.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {unitUser.profile?.full_name?.charAt(0) || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{unitUser.profile?.full_name || "Usuário"}</span>
                        {unitUser.is_primary && (
                          <Badge variant="secondary" className="gap-1">
                            <Crown className="h-3 w-3" />
                            Titular
                          </Badge>
                        )}
                      </div>
                      {unitUser.nickname && (
                        <span className="text-sm text-muted-foreground">
                          "{unitUser.nickname}"
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isPrimaryUser && !unitUser.is_primary && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(unitUser)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmUser({
                          id: unitUser.id,
                          name: unitUser.profile?.full_name || "este usuário"
                        })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Nenhum usuário"
              description="Nenhum usuário vinculado a esta unidade ainda."
            />
          )}

          {isPrimaryUser && !canAddMoreUsers && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Limite de {maxAdditionalUsers} usuários adicionais atingido
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <ResponsiveDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Adicionar Usuário</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Crie um novo usuário para sua unidade. Ele terá acesso independente ao sistema.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Nome do novo usuário"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Apelido (opcional)</Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="Ex: Filho, Esposa, Funcionária"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Repita a senha"
              />
              {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-sm text-destructive">As senhas não coincidem</p>
              )}
            </div>
          </div>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={
                addUnitUser.isPending ||
                !formData.email ||
                !formData.password ||
                !formData.fullName ||
                formData.password !== formData.confirmPassword ||
                formData.password.length < 6
              }
            >
              {addUnitUser.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Usuário
                </>
              )}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Edit Dialog */}
      <ResponsiveDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Editar Apelido</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Altere o apelido do usuário para facilitar a identificação.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="editNickname">Apelido</Label>
              <Input
                id="editNickname"
                value={editingUser?.nickname || ""}
                onChange={(e) => setEditingUser(prev => prev ? { ...prev, nickname: e.target.value } : null)}
                placeholder="Ex: Filho, Esposa, Funcionária"
              />
            </div>
          </div>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditUser} disabled={updateUnitUser.isPending}>
              {updateUnitUser.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmUser}
        onOpenChange={(open) => !open && setDeleteConfirmUser(null)}
        title="Remover Usuário"
        description={`Tem certeza que deseja remover ${deleteConfirmUser?.name} da unidade? Esta ação não pode ser desfeita e o usuário perderá acesso ao sistema.`}
        confirmText="Remover"
        variant="destructive"
        onConfirm={handleDeleteUser}
      />
    </div>
  );
};
