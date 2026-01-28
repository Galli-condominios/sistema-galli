import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, LogOut, Mail, Shield, Loader2, Save, Bot, Users, Building2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useChangePassword } from "@/hooks/useChangePassword";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";
import { AIConfigurationTab } from "@/components/settings/AIConfigurationTab";
import { UnitMembersTab } from "@/components/settings/UnitMembersTab";
import { useToast } from "@/hooks/use-toast";
import { useCondominium } from "@/contexts/CondominiumContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const roleLabels: Record<string, string> = {
  administrador: "Administrador",
  sindico: "Síndico",
  morador: "Morador",
  porteiro: "Porteiro",
};

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId, role, hasRole, refetch: refetchRole } = useUserRole();
  const { profile, isLoading, updateProfile, uploadAvatar, deleteAvatar, refetch } = useProfile(userId);
  const { changePassword, isLoading: isChangingPassword } = useChangePassword();
  const { selectedCondominiumId, condominiums, setSelectedCondominiumId, refreshCondominiums } = useCondominium();
  
  const isAdmin = hasRole(["administrador", "sindico"]);
  const isResident = hasRole(["morador"]);
  
  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteCondoDialogOpen, setIsDeleteCondoDialogOpen] = useState(false);
  const [isDeletingCondo, setIsDeletingCondo] = useState(false);

  const selectedCondominium = condominiums.find(c => c.id === selectedCondominiumId);

  useEffect(() => {
    const fetchEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    };
    fetchEmail();
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({ fullName, avatarUrl });
      await refetchRole();
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    const url = await uploadAvatar(file);
    await updateProfile.mutateAsync({ avatarUrl: url });
    await refetch();
    return url;
  };

  const handleAvatarDelete = async () => {
    await deleteAvatar();
    await refetch();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDeleteCondominium = async () => {
    if (!selectedCondominiumId) return;
    
    setIsDeletingCondo(true);
    try {
      const { error } = await supabase
        .from("condominiums")
        .delete()
        .eq("id", selectedCondominiumId);

      if (error) throw error;

      toast({
        title: "Condomínio excluído",
        description: "O condomínio foi excluído permanentemente.",
      });

      // Select another condominium if available
      const remainingCondos = condominiums.filter(c => c.id !== selectedCondominiumId);
      if (remainingCondos.length > 0) {
        setSelectedCondominiumId(remainingCondos[0].id);
      } else {
        setSelectedCondominiumId(null);
      }
      
      await refreshCondominiums();
      setIsDeleteCondoDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o condomínio.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingCondo(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando configurações..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        <PageHeader
          title="Configurações"
          description="Gerencie suas preferências e informações pessoais"
        />

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? "grid-cols-3" : isResident ? "grid-cols-3" : "grid-cols-2"} h-auto`}>
            <TabsTrigger value="profile" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
              <span className="sm:hidden">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Segurança</span>
              <span className="sm:hidden">Segurança</span>
            </TabsTrigger>
            {isResident && (
              <TabsTrigger value="unit-members" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Membros da Unidade</span>
                <span className="sm:hidden">Membros</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="ai" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
                <Bot className="h-4 w-4" />
                <span className="hidden sm:inline">Configuração IA</span>
                <span className="sm:hidden">IA</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Foto de Perfil
                </CardTitle>
                <CardDescription>
                  Sua foto será exibida no cabeçalho do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AvatarUpload
                  avatarUrl={avatarUrl}
                  userName={fullName}
                  onUpload={handleAvatarUpload}
                  onDelete={handleAvatarDelete}
                  onAvatarChange={setAvatarUrl}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize suas informações de perfil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O e-mail não pode ser alterado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Papel no Sistema</Label>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary" className="text-sm">
                      {role ? roleLabels[role] || role : "Carregando..."}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || updateProfile.isPending}
                >
                  {isSaving || updateProfile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>
                  Defina uma nova senha para sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PasswordChangeForm
                  onSubmit={changePassword}
                  isLoading={isChangingPassword}
                />
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-5 w-5" />
                  Encerrar Sessão
                </CardTitle>
                <CardDescription>
                  Sair da sua conta em todos os dispositivos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair do Sistema
                </Button>
              </CardContent>
            </Card>

            {isAdmin && selectedCondominium && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Building2 className="h-5 w-5" />
                    Excluir Condomínio
                  </CardTitle>
                  <CardDescription>
                    Remover permanentemente o condomínio selecionado e todos os seus dados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">Condomínio selecionado:</p>
                      <p className="text-muted-foreground">{selectedCondominium.name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Esta ação é <strong>irreversível</strong>. Todos os dados relacionados serão excluídos permanentemente, incluindo unidades, moradores, reservas, documentos, cobranças e mais.
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={() => setIsDeleteCondoDialogOpen(true)}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Excluir Condomínio
                  </Button>
                </CardContent>
              </Card>
            )}

            <ConfirmDialog
              open={isDeleteCondoDialogOpen}
              onOpenChange={setIsDeleteCondoDialogOpen}
              title="Excluir Condomínio"
              description={`Tem certeza que deseja excluir permanentemente o condomínio "${selectedCondominium?.name}"? Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.`}
              confirmText={isDeletingCondo ? "Excluindo..." : "Sim, Excluir"}
              cancelText="Cancelar"
              onConfirm={handleDeleteCondominium}
              variant="destructive"
            />
          </TabsContent>

          {/* Unit Members Tab - Residents only */}
          {isResident && (
            <TabsContent value="unit-members" className="space-y-6">
              <UnitMembersTab />
            </TabsContent>
          )}

          {/* AI Configuration Tab - Admin only */}
          {isAdmin && (
            <TabsContent value="ai" className="space-y-6">
              <AIConfigurationTab />
            </TabsContent>
          )}

        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
