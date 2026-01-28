import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
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
import { Plus, UserCheck, Clock } from "lucide-react";
import { useVisitorAuth } from "@/hooks/useVisitorAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { DocumentUpload } from "@/components/DocumentUpload";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const VisitorAuthorization = () => {
  const { authorizations, isLoading, createAuthorization } = useVisitorAuth();
  const { userId } = useUserRole();
  const [isOpen, setIsOpen] = useState(false);
  const [resident, setResident] = useState<any>(null);
  const [documentUrl, setDocumentUrl] = useState("");
  const [formData, setFormData] = useState({
    visitor_name: "",
    visitor_document: "",
    visitor_phone: "",
    service_type: "",
    authorization_date: "",
    valid_from: "",
    valid_until: "",
    notes: "",
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
      .single();
    setResident(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resident) return;

    createAuthorization({
      ...formData,
      unit_id: resident.unit_id,
      resident_id: resident.id,
      document_url: documentUrl || null,
    });
    
    setIsOpen(false);
    setFormData({
      visitor_name: "",
      visitor_document: "",
      visitor_phone: "",
      service_type: "",
      authorization_date: "",
      valid_from: "",
      valid_until: "",
      notes: "",
    });
    setDocumentUrl("");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { text: string; className: string }> = {
      ativa: { text: "Ativa", className: "bg-green-500/10 text-green-500 border-green-500" },
      utilizada: { text: "Utilizada", className: "bg-blue-500/10 text-blue-500 border-blue-500" },
      expirada: { text: "Expirada", className: "bg-gray-500/10 text-gray-500 border-gray-500" },
      cancelada: { text: "Cancelada", className: "bg-red-500/10 text-red-500 border-red-500" },
    };
    const variant = variants[status] || variants.ativa;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.text}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Autorizar Visitantes</h2>
            <p className="text-muted-foreground">
              Pré-autorize a entrada de visitantes e prestadores
            </p>
          </div>
          <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
            <ResponsiveDialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Autorização
              </Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent className="max-w-2xl">
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>Nova Autorização de Visitante</ResponsiveDialogTitle>
              </ResponsiveDialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visitor_name">Nome do Visitante</Label>
                    <Input
                      id="visitor_name"
                      value={formData.visitor_name}
                      onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                      placeholder="Nome completo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visitor_document">Documento (CPF/RG)</Label>
                    <Input
                      id="visitor_document"
                      value={formData.visitor_document}
                      onChange={(e) => setFormData({ ...formData, visitor_document: e.target.value })}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visitor_phone">Telefone</Label>
                    <Input
                      id="visitor_phone"
                      value={formData.visitor_phone}
                      onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service_type">Tipo de Serviço (opcional)</Label>
                    <Input
                      id="service_type"
                      value={formData.service_type}
                      onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                      placeholder="Ex: Entrega, Manutenção..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="authorization_date">Data da Visita</Label>
                    <Input
                      id="authorization_date"
                      type="date"
                      value={formData.authorization_date}
                      onChange={(e) => setFormData({ ...formData, authorization_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valid_from">Válido de</Label>
                    <Input
                      id="valid_from"
                      type="datetime-local"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valid_until">Até</Label>
                    <Input
                      id="valid_until"
                      type="datetime-local"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Documento (Foto)</Label>
                  <DocumentUpload onUploadComplete={setDocumentUrl} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Informações adicionais..."
                    rows={3}
                  />
                </div>

                <ResponsiveDialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">Criar Autorização</Button>
                </ResponsiveDialogFooter>
              </form>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <Card className="border-border">
              <CardContent className="p-6 text-center">
                Carregando...
              </CardContent>
            </Card>
          ) : authorizations?.length === 0 ? (
            <Card className="border-border col-span-full">
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma autorização cadastrada
              </CardContent>
            </Card>
          ) : (
            authorizations?.map((auth: any) => (
              <Card key={auth.id} className="border-border hover:border-primary transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{auth.visitor_name}</CardTitle>
                    {getStatusBadge(auth.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserCheck className="h-4 w-4" />
                    <span>{auth.visitor_document}</span>
                  </div>
                  {auth.visitor_phone && (
                    <div className="text-muted-foreground">
                      📱 {auth.visitor_phone}
                    </div>
                  )}
                  {auth.service_type && (
                    <div className="text-muted-foreground">
                      🔧 {auth.service_type}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t border-border">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(new Date(auth.valid_from), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {auth.document_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => window.open(auth.document_url, "_blank")}
                    >
                      Ver Documento
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VisitorAuthorization;
