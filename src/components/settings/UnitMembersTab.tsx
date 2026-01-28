import { useState } from "react";
import { Users, UserPlus, Trash2, Edit, Loader2, User, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useUnitMembers } from "@/hooks/useUnitMembers";
import EmptyState from "@/components/EmptyState";

export const UnitMembersTab = () => {
  const { 
    members, 
    isLoading, 
    userUnit,
    isPrimaryUser,
    canAddMore,
    membersCount,
    maxMembers,
    addMember, 
    updateMember,
    removeMember 
  } = useUnitMembers();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<{ id: string; fullName: string; nickname: string; phone: string } | null>(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    nickname: "",
    phone: "",
  });

  const resetForm = () => {
    setFormData({
      fullName: "",
      nickname: "",
      phone: "",
    });
  };

  const handleAddMember = async () => {
    if (!formData.fullName.trim()) return;

    await addMember.mutateAsync({
      fullName: formData.fullName,
      nickname: formData.nickname || undefined,
      phone: formData.phone || undefined,
    });

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEditMember = async () => {
    if (!editingMember) return;

    await updateMember.mutateAsync({
      memberId: editingMember.id,
      fullName: editingMember.fullName,
      nickname: editingMember.nickname,
      phone: editingMember.phone,
    });

    setIsEditDialogOpen(false);
    setEditingMember(null);
  };

  const handleDeleteMember = async () => {
    if (!deleteConfirmMember) return;

    await removeMember.mutateAsync(deleteConfirmMember.id);
    setDeleteConfirmMember(null);
  };

  const openEditDialog = (member: { id: string; full_name: string; nickname: string | null; phone: string | null }) => {
    setEditingMember({ 
      id: member.id, 
      fullName: member.full_name,
      nickname: member.nickname || "", 
      phone: member.phone || "" 
    });
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

  const usagePercentage = (membersCount / maxMembers) * 100;

  return (
    <div className="space-y-6">
      {/* Unit Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Membros da Unidade {userUnit.unit?.unit_number}
            {userUnit.unit?.block && ` - Bloco ${userUnit.unit.block}`}
          </CardTitle>
          <CardDescription>
            {isPrimaryUser 
              ? "Como titular, você pode adicionar até 4 pessoas à sua unidade"
              : "Visualize as pessoas cadastradas na sua unidade"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Membros cadastrados</span>
              <span className="font-medium">{membersCount} / {maxMembers}</span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Pessoas da Unidade</CardTitle>
            <CardDescription>
              Familiares e outras pessoas que moram na unidade
            </CardDescription>
          </div>
          {isPrimaryUser && canAddMore && (
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
          ) : members && members.length > 0 ? (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {member.full_name?.charAt(0) || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.full_name}</span>
                        {member.nickname && (
                          <span className="text-sm text-muted-foreground">
                            ({member.nickname})
                          </span>
                        )}
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isPrimaryUser && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmMember({
                          id: member.id,
                          name: member.full_name
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
              title="Nenhum membro cadastrado"
              description={isPrimaryUser 
                ? "Adicione familiares ou outras pessoas que moram com você." 
                : "Nenhum membro adicional cadastrado nesta unidade."
              }
            />
          )}

          {isPrimaryUser && !canAddMore && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Limite de {maxMembers} membros atingido
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <ResponsiveDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Adicionar Membro</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Cadastre uma pessoa que mora na sua unidade (não é necessário criar login).
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Nome da pessoa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Relação (opcional)</Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="Ex: Filho, Esposa, Mãe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={addMember.isPending || !formData.fullName.trim()}
            >
              {addMember.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar
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
            <ResponsiveDialogTitle>Editar Membro</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Altere os dados do membro.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Nome Completo</Label>
              <Input
                id="editFullName"
                value={editingMember?.fullName || ""}
                onChange={(e) => setEditingMember(prev => prev ? { ...prev, fullName: e.target.value } : null)}
                placeholder="Nome da pessoa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editNickname">Relação</Label>
              <Input
                id="editNickname"
                value={editingMember?.nickname || ""}
                onChange={(e) => setEditingMember(prev => prev ? { ...prev, nickname: e.target.value } : null)}
                placeholder="Ex: Filho, Esposa, Mãe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPhone">Telefone</Label>
              <Input
                id="editPhone"
                value={editingMember?.phone || ""}
                onChange={(e) => setEditingMember(prev => prev ? { ...prev, phone: e.target.value } : null)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditMember} disabled={updateMember.isPending}>
              {updateMember.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmMember}
        onOpenChange={(open) => !open && setDeleteConfirmMember(null)}
        title="Remover Membro"
        description={`Tem certeza que deseja remover ${deleteConfirmMember?.name} da unidade?`}
        confirmText="Remover"
        variant="destructive"
        onConfirm={handleDeleteMember}
      />
    </div>
  );
};
