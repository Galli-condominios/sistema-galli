import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import {
  AlertCircle,
  Calendar,
  Clock,
  Home,
  MessageSquare,
  Plus,
  Scale,
  Send,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useNeighborMediations, NeighborMediation, MediationStatus } from "@/hooks/useNeighborMediations";
import { useUnits } from "@/hooks/useUnits";
import { useUserRoleContext } from "@/contexts/UserRoleContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_CONFIG: Record<MediationStatus, { label: string; color: string; icon: any }> = {
  pending_response: { label: "Aguardando Resposta", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500", icon: Clock },
  responded: { label: "Respondido", color: "bg-blue-500/10 text-blue-500 border-blue-500", icon: MessageSquare },
  awaiting_resolution: { label: "Em Negociação", color: "bg-purple-500/10 text-purple-500 border-purple-500", icon: Scale },
  mediation_requested: { label: "Síndico Acionado", color: "bg-orange-500/10 text-orange-500 border-orange-500", icon: AlertTriangle },
  mediation_in_progress: { label: "Mediação em Andamento", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500", icon: Scale },
  resolved: { label: "Resolvido", color: "bg-green-500/10 text-green-500 border-green-500", icon: CheckCircle2 },
  closed: { label: "Encerrado", color: "bg-gray-500/10 text-gray-500 border-gray-500", icon: XCircle },
};

export const MediationTab = () => {
  const { mediations, isLoading, createMediation, addResponse, requestSyndicIntervention, updateStatus, isCreating } = useNeighborMediations();
  const { units } = useUnits();
  const { userId, isAdmin } = useUserRoleContext();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [resident, setResident] = useState<any>(null);
  const [formData, setFormData] = useState({
    target_unit_id: "",
    occurrence_datetime: "",
    complaint_reason: "",
    requested_action: "",
  });

  useEffect(() => {
    if (userId) {
      fetchResident();
    }
  }, [userId]);

  const fetchResident = async () => {
    const { data } = await supabase
      .from("residents")
      .select("*, units(id, unit_number, block, condominium_id)")
      .eq("user_id", userId)
      .maybeSingle();
    setResident(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const residentCondominiumId = resident?.units?.condominium_id;
    
    if (!resident || !residentCondominiumId) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar seu condomínio.",
        variant: "destructive",
      });
      return;
    }

    createMediation({
      condominium_id: residentCondominiumId,
      requester_resident_id: resident.id,
      target_unit_id: formData.target_unit_id,
      occurrence_datetime: new Date(formData.occurrence_datetime).toISOString(),
      complaint_reason: formData.complaint_reason,
      requested_action: formData.requested_action,
    });

    setIsOpen(false);
    setFormData({
      target_unit_id: "",
      occurrence_datetime: "",
      complaint_reason: "",
      requested_action: "",
    });
  };

  // Filter units to exclude user's own unit
  const availableUnits = units?.filter(u => u.id !== resident?.unit_id) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="border-border">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h3 className="text-lg font-semibold">Mediação entre Vizinhos</h3>
          <p className="text-sm text-muted-foreground">
            Resolva conflitos diretamente com seus vizinhos
          </p>
        </div>
        
        {!isAdmin() && resident && (
          <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
            <ResponsiveDialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nova Mediação
              </Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent className="max-w-lg">
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Solicitar Mediação
                </ResponsiveDialogTitle>
              </ResponsiveDialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="target_unit">Unidade do Vizinho</Label>
                  <Select
                    value={formData.target_unit_id}
                    onValueChange={(value) => setFormData({ ...formData, target_unit_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.block ? `Bloco ${unit.block} - ` : ""}Unidade {unit.unit_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occurrence_datetime">Data e Hora da Ocorrência</Label>
                  <Input
                    id="occurrence_datetime"
                    type="datetime-local"
                    value={formData.occurrence_datetime}
                    onChange={(e) => setFormData({ ...formData, occurrence_datetime: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complaint_reason">Motivo da Reclamação</Label>
                  <Textarea
                    id="complaint_reason"
                    value={formData.complaint_reason}
                    onChange={(e) => setFormData({ ...formData, complaint_reason: e.target.value })}
                    placeholder="Descreva o que aconteceu..."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requested_action">Providência Solicitada</Label>
                  <Textarea
                    id="requested_action"
                    value={formData.requested_action}
                    onChange={(e) => setFormData({ ...formData, requested_action: e.target.value })}
                    placeholder="O que você espera que seja feito?"
                    rows={2}
                    required
                  />
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  O vizinho terá <strong>5 dias</strong> para responder. Se não houver resolução em <strong>10 dias</strong>, você poderá acionar o síndico.
                </div>

                <ResponsiveDialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Enviar Solicitação
                  </Button>
                </ResponsiveDialogFooter>
              </form>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        )}
      </div>

      {/* Mediations List */}
      {!mediations?.length ? (
        <EmptyState
          icon={Scale}
          title="Nenhuma mediação"
          description="Não há mediações registradas no momento"
          actionLabel={!isAdmin() && resident ? "Iniciar Mediação" : undefined}
          onAction={!isAdmin() && resident ? () => setIsOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-4">
          {mediations.map((mediation) => (
            <MediationCard
              key={mediation.id}
              mediation={mediation}
              currentResident={resident}
              isAdmin={isAdmin()}
              onAddResponse={(content) => 
                addResponse({ 
                  mediationId: mediation.id, 
                  content,
                  responderResidentId: resident?.id 
                })
              }
              onRequestSyndic={() => requestSyndicIntervention(mediation.id)}
              onUpdateStatus={(status, notes) => 
                updateStatus({ mediationId: mediation.id, status, syndicNotes: notes })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface MediationCardProps {
  mediation: NeighborMediation;
  currentResident: any;
  isAdmin: boolean;
  onAddResponse: (content: string) => void;
  onRequestSyndic: () => void;
  onUpdateStatus: (status: MediationStatus, notes?: string) => void;
}

const MediationCard = ({ 
  mediation, 
  currentResident, 
  isAdmin,
  onAddResponse,
  onRequestSyndic,
  onUpdateStatus,
}: MediationCardProps) => {
  const [responseContent, setResponseContent] = useState("");
  const [syndicNotes, setSyndicNotes] = useState("");
  const [showResponseForm, setShowResponseForm] = useState(false);
  
  const statusConfig = STATUS_CONFIG[mediation.status];
  const StatusIcon = statusConfig.icon;
  
  const isRequester = currentResident?.id === mediation.requester_resident_id;
  const isTargetUnit = currentResident?.unit_id === mediation.target_unit_id;
  const canRespond = isTargetUnit && mediation.status === "pending_response";
  const canRequestSyndic = isRequester && 
    isPast(new Date(mediation.mediation_available_at)) && 
    !mediation.syndic_intervention_requested &&
    mediation.status !== "resolved" &&
    mediation.status !== "closed";
  
  const daysUntilDeadline = differenceInDays(new Date(mediation.response_deadline), new Date());
  const daysUntilSyndic = differenceInDays(new Date(mediation.mediation_available_at), new Date());

  const handleSubmitResponse = () => {
    if (!responseContent.trim()) return;
    onAddResponse(responseContent.trim());
    setResponseContent("");
    setShowResponseForm(false);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                Unidade {mediation.target_unit?.unit_number}
                {mediation.target_unit?.block && ` - Bloco ${mediation.target_unit.block}`}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {format(new Date(mediation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={statusConfig.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Occurrence Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Ocorrência em: {format(new Date(mediation.occurrence_datetime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
          
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Motivo:</p>
              <p className="text-sm">{mediation.complaint_reason}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Providência solicitada:</p>
              <p className="text-sm">{mediation.requested_action}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex flex-wrap gap-3 text-xs">
          {mediation.status === "pending_response" && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full",
              daysUntilDeadline <= 1 ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"
            )}>
              <Clock className="h-3 w-3" />
              {daysUntilDeadline > 0 
                ? `${daysUntilDeadline} dias para responder`
                : "Prazo vencido"}
            </div>
          )}
          
          {!mediation.syndic_intervention_requested && daysUntilSyndic > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
              <User className="h-3 w-3" />
              Síndico em {daysUntilSyndic} dias
            </div>
          )}
        </div>

        {/* Responses */}
        {mediation.responses && mediation.responses.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Respostas:</p>
            <ScrollArea className="max-h-40">
              <div className="space-y-2">
                {mediation.responses.map((response) => (
                  <div key={response.id} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm">{response.response_content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(response.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Syndic Notes */}
        {mediation.syndic_notes && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <p className="text-xs font-medium text-orange-500 mb-1">Parecer do Síndico:</p>
            <p className="text-sm">{mediation.syndic_notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {/* Target unit can respond */}
          {canRespond && (
            <>
              {showResponseForm ? (
                <div className="w-full space-y-2">
                  <Textarea
                    value={responseContent}
                    onChange={(e) => setResponseContent(e.target.value)}
                    placeholder="Escreva sua resposta..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSubmitResponse} disabled={!responseContent.trim()}>
                      <Send className="h-4 w-4 mr-1" />
                      Enviar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowResponseForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" onClick={() => setShowResponseForm(true)}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Responder
                </Button>
              )}
            </>
          )}

          {/* Requester can request syndic intervention */}
          {canRequestSyndic && (
            <Button size="sm" variant="outline" onClick={onRequestSyndic}>
              <User className="h-4 w-4 mr-1" />
              Acionar Síndico
            </Button>
          )}

          {/* Admin controls */}
          {isAdmin && mediation.syndic_intervention_requested && mediation.status !== "resolved" && mediation.status !== "closed" && (
            <div className="w-full space-y-2">
              <Textarea
                value={syndicNotes}
                onChange={(e) => setSyndicNotes(e.target.value)}
                placeholder="Parecer do síndico (opcional)..."
                rows={2}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => onUpdateStatus("mediation_in_progress", syndicNotes)}
                >
                  Iniciar Mediação
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => onUpdateStatus("resolved", syndicNotes)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Resolver
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onUpdateStatus("closed", syndicNotes)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Encerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MediationTab;
