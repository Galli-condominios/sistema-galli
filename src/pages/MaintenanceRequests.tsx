import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Wrench, Trash2, MessageSquare, User, Building2, MapPin, Scale } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { useUserRole } from "@/hooks/useUserRole";
import { useCondominium } from "@/contexts/CondominiumContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MediationTab } from "@/components/mediation/MediationTab";

const MaintenanceRequests = () => {
  const { requests, isLoading, createRequest, updateRequestStatus, deleteRequest } =
    useMaintenanceRequests();
  const { isAdmin, isDoorkeeper, hasRole, userId } = useUserRole();
  const { selectedCondominiumId, condominiums } = useCondominium();
  const selectedCondominium = condominiums.find(c => c.id === selectedCondominiumId);
  
  const [isOpen, setIsOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [updateComment, setUpdateComment] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [resident, setResident] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    priority: "media",
    is_public: true,
  });

  useEffect(() => {
    if (userId) {
      fetchResident();
    }
  }, [userId]);

  const fetchResident = async () => {
    const { data } = await supabase
      .from("residents")
      .select("*, units(*)")
      .eq("user_id", userId)
      .maybeSingle();
    setResident(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resident && !isAdmin()) {
      const { toast } = await import("sonner");
      toast.error("Você precisa estar vinculado a uma unidade para abrir ocorrências. Entre em contato com a administração.");
      return;
    }

    // Para morador: usa o condomínio da unidade dele
    // Para admin/síndico: usa o condomínio selecionado globalmente
    const condominiumId = resident?.units?.condominium_id || selectedCondominiumId;

    if (!condominiumId) {
      const { toast } = await import("sonner");
      toast.error(isAdmin() 
        ? "Selecione um condomínio no menu lateral antes de criar uma ocorrência."
        : "Nenhum condomínio encontrado. Entre em contato com a administração."
      );
      return;
    }

    createRequest({
      ...formData,
      condominium_id: condominiumId,
      unit_id: resident?.unit_id || null,
      resident_id: resident?.id || null,
    });

    setIsOpen(false);
    setFormData({
      title: "",
      description: "",
      category: "",
      location: "",
      priority: "media",
      is_public: true,
    });
  };

  const handleUpdateStatus = () => {
    if (!selectedRequest) return;

    updateRequestStatus({
      id: selectedRequest.id,
      status: newStatus,
      comment: updateComment,
    });

    setUpdateDialogOpen(false);
    setUpdateComment("");
    setNewStatus("");
    setSelectedRequest(null);
  };

  const openUpdateDialog = (request: any) => {
    setSelectedRequest(request);
    setNewStatus(request.status);
    setUpdateDialogOpen(true);
  };

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, { text: string; className: string }> = {
      reclamacao: {
        text: "Reclamação",
        className: "bg-red-500/10 text-red-500 border-red-500",
      },
      sugestao: {
        text: "Sugestão",
        className: "bg-blue-500/10 text-blue-500 border-blue-500",
      },
      manutencao: {
        text: "Manutenção",
        className: "bg-orange-500/10 text-orange-500 border-orange-500",
      },
      limpeza: {
        text: "Limpeza",
        className: "bg-cyan-500/10 text-cyan-500 border-cyan-500",
      },
      seguranca: {
        text: "Segurança",
        className: "bg-purple-500/10 text-purple-500 border-purple-500",
      },
      outros: {
        text: "Outros",
        className: "bg-gray-500/10 text-gray-500 border-gray-500",
      },
    };
    const variant = variants[category] || variants.outros;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.text}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { text: string; className: string }> = {
      aberto: {
        text: "Aberto",
        className: "bg-yellow-500/10 text-yellow-500 border-yellow-500",
      },
      em_andamento: {
        text: "Em Andamento",
        className: "bg-blue-500/10 text-blue-500 border-blue-500",
      },
      concluido: {
        text: "Concluído",
        className: "bg-green-500/10 text-green-500 border-green-500",
      },
      cancelado: {
        text: "Cancelado",
        className: "bg-gray-500/10 text-gray-500 border-gray-500",
      },
    };
    const variant = variants[status] || variants.aberto;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.text}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { text: string; className: string }> = {
      baixa: {
        text: "Baixa",
        className: "bg-gray-500/10 text-gray-500 border-gray-500",
      },
      media: {
        text: "Média",
        className: "bg-yellow-500/10 text-yellow-500 border-yellow-500",
      },
      alta: {
        text: "Alta",
        className: "bg-orange-500/10 text-orange-500 border-orange-500",
      },
      urgente: {
        text: "Urgente",
        className: "bg-red-500/10 text-red-500 border-red-500",
      },
    };
    const variant = variants[priority] || variants.media;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando ocorrências..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 animate-fade-in px-4 md:px-0">
        {/* Header */}
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Ocorrências e Manutenção</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Mural de solicitações e ocorrências do condomínio
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="maintenance" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="maintenance" className="gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Ocorrências</span>
              <span className="sm:hidden">Ocorrências</span>
            </TabsTrigger>
            <TabsTrigger value="mediation" className="gap-2">
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Mediação entre Vizinhos</span>
              <span className="sm:hidden">Mediação</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="maintenance" className="space-y-4">
            {/* Existing maintenance content */}
            <div className="flex justify-end">
              <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
            <ResponsiveDialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Abrir Ocorrência
              </Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent className="max-w-2xl">
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>Nova Ocorrência</ResponsiveDialogTitle>
              </ResponsiveDialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Breve descrição do problema"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição Detalhada</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Descreva a situação..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2"
                      required
                    >
                      <option value="">Selecione...</option>
                      <option value="reclamacao">Reclamação</option>
                      <option value="sugestao">Sugestão</option>
                      <option value="manutencao">Manutenção</option>
                      <option value="limpeza">Limpeza</option>
                      <option value="seguranca">Segurança</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade</Label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Ex: Portaria, Garagem, Área de Lazer..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_public: checked })
                    }
                  />
                  <Label htmlFor="is_public">
                    Tornar pública no mural (visível para todos)
                  </Label>
                </div>

                <ResponsiveDialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">Criar Ocorrência</Button>
                </ResponsiveDialogFooter>
              </form>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
            </div>

            {/* Grid de cards responsivo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {isLoading ? (
            <Card className="border-border">
              <CardContent className="p-6 text-center">
                Carregando...
              </CardContent>
            </Card>
          ) : requests?.length === 0 ? (
            <Card className="border-border col-span-full">
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma ocorrência registrada
              </CardContent>
            </Card>
          ) : (
            requests?.map((request: any) => (
              <Card
                key={request.id}
                className="border-border hover:border-primary transition-colors"
              >
                <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                  <div className="space-y-2">
                    {/* Status badge no topo para mobile */}
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm sm:text-base md:text-lg line-clamp-2 flex-1">
                        {request.title}
                      </CardTitle>
                      <div className="shrink-0">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                    {/* Badges em linha com scroll horizontal no mobile */}
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                      <span className="[&>span]:text-[10px] sm:[&>span]:text-xs">
                        {getCategoryBadge(request.category)}
                      </span>
                      <span className="[&>span]:text-[10px] sm:[&>span]:text-xs">
                        {getPriorityBadge(request.priority)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <p className="text-muted-foreground line-clamp-2 sm:line-clamp-3">
                    {request.description}
                  </p>

                  {/* Localização para moradores (sem info do solicitante) */}
                  {!isAdmin() && !isDoorkeeper() && request.location && (
                    <div className="text-muted-foreground text-[10px] sm:text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{request.location}</span>
                    </div>
                  )}

                  <div className="text-[10px] sm:text-xs text-muted-foreground pt-2 border-t border-border">
                    Aberto em{" "}
                    {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </div>

                  {request.completed_at && (
                    <div className="text-[10px] sm:text-xs text-green-500">
                      ✓ Concluído em{" "}
                      {format(new Date(request.completed_at), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </div>
                  )}

                  {request.maintenance_request_updates?.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <div className="text-[10px] sm:text-xs font-medium mb-1">Histórico:</div>
                      <div className="space-y-1">
                        {request.maintenance_request_updates
                          .slice(-2)
                          .map((update: any) => (
                            <div
                              key={update.id}
                              className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1"
                            >
                              {update.comment && `"${update.comment}"`}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Botão para ver detalhes do solicitante - visível para admin/síndico/porteiro */}
                  {(isAdmin() || isDoorkeeper()) && (request.residents?.profiles?.full_name || request.units?.condominiums?.name) && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full text-[10px] sm:text-xs h-8">
                          <User className="h-3 w-3 mr-1" />
                          Ver Solicitante
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 sm:w-72 bg-card border-border" align="start">
                        <div className="space-y-3">
                          <h4 className="font-medium text-xs sm:text-sm">Detalhes da Solicitação</h4>
                          <div className="space-y-2 text-xs sm:text-sm">
                            {request.units?.condominiums?.name && (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-muted-foreground text-[10px] sm:text-xs">Condomínio</p>
                                  <p className="font-medium truncate">{request.units.condominiums.name}</p>
                                </div>
                              </div>
                            )}
                            {request.residents?.profiles?.full_name && (
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-muted-foreground text-[10px] sm:text-xs">Solicitante</p>
                                  <p className="font-medium truncate">{request.residents.profiles.full_name}</p>
                                </div>
                              </div>
                            )}
                            {request.units?.unit_number && (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-muted-foreground text-[10px] sm:text-xs">Unidade</p>
                                  <p className="font-medium">{request.units.unit_number}</p>
                                </div>
                              </div>
                            )}
                            {request.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-muted-foreground text-[10px] sm:text-xs">Localização</p>
                                  <p className="font-medium truncate">{request.location}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}

                  {isAdmin() && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-[10px] sm:text-xs h-8"
                        onClick={() => openUpdateDialog(request)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Atualizar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(
                              "Tem certeza que deseja excluir esta ocorrência?"
                            )
                          ) {
                            deleteRequest(request.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-600 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <ResponsiveDialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Atualizar Ocorrência</ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_status">Novo Status</Label>
                <select
                  id="new_status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                >
                  <option value="aberto">Aberto</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="update_comment">Comentário</Label>
                <Textarea
                  id="update_comment"
                  value={updateComment}
                  onChange={(e) => setUpdateComment(e.target.value)}
                  placeholder="Adicione um comentário sobre a atualização..."
                  rows={3}
                />
              </div>

              <ResponsiveDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUpdateDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button onClick={handleUpdateStatus} className="w-full sm:w-auto">Salvar</Button>
              </ResponsiveDialogFooter>
            </div>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
          </TabsContent>

          <TabsContent value="mediation">
            <MediationTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default MaintenanceRequests;
