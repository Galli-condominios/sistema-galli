import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCondominium } from "@/contexts/CondominiumContext";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import StatsCard from "@/components/StatsCard";
import DataTableHeader from "@/components/DataTableHeader";
import TableSkeleton from "@/components/TableSkeleton";
import StatsCardSkeleton from "@/components/StatsCardSkeleton";
import EmptyState from "@/components/EmptyState";
import ResponsiveDataView from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataRow, MobileDataHeader, MobileDataActions } from "@/components/MobileDataCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useVisitorAuth } from "@/hooks/useVisitorAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { 
  Plus, 
  LogOut as ExitIcon, 
  DoorOpen, 
  Users, 
  Briefcase, 
  Clock, 
  User,
  UserCheck,
  CheckCircle,
  XCircle,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AccessControl = () => {
  const { selectedCondominiumId, isAdmin: isCondoAdmin } = useCondominium();
  const { isAdmin, isDoorkeeper } = useUserRole();
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("entries");
  
  // Authorization states
  const [authSearchTerm, setAuthSearchTerm] = useState("");
  const [authFilterStatus, setAuthFilterStatus] = useState("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    id: string;
    action: "utilizada" | "cancelada";
  }>({ open: false, id: "", action: "utilizada" });

  const { authorizations, isLoading: isAuthLoading, updateAuthStatus, isUpdating } = useVisitorAuth(
    isCondoAdmin ? { condominiumId: selectedCondominiumId } : undefined
  );

  const [formData, setFormData] = useState({
    unit_id: "none" as string,
    visitor_name: "",
    visitor_document: "",
    visitor_type: "visitante" as "visitante" | "prestador_servico",
    service_company: "",
    service_type: "",
  });
  const { toast } = useToast();

  const fetchData = async () => {
    if (!selectedCondominiumId && isCondoAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    let logsQuery = supabase
      .from("access_logs")
      .select("*, condominiums(name), units(unit_number)")
      .order("entry_time", { ascending: false })
      .limit(100);
    
    let unitsQuery = supabase
      .from("units")
      .select("*, condominiums(name)")
      .order("unit_number");

    if (isCondoAdmin && selectedCondominiumId) {
      logsQuery = logsQuery.eq("condominium_id", selectedCondominiumId);
      unitsQuery = unitsQuery.eq("condominium_id", selectedCondominiumId);
    }

    const [logsRes, unitsRes] = await Promise.all([logsQuery, unitsQuery]);

    if (logsRes.error) {
      toast({ title: "Erro", description: logsRes.error.message, variant: "destructive" });
    } else {
      setAccessLogs(logsRes.data || []);
    }

    if (!unitsRes.error) setUnits(unitsRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedCondominiumId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCondominiumId) {
      toast({ title: "Erro", description: "Selecione um condomínio primeiro", variant: "destructive" });
      return;
    }

    const data = {
      condominium_id: selectedCondominiumId,
      unit_id: formData.unit_id === "none" ? null : formData.unit_id,
      visitor_name: formData.visitor_name,
      visitor_document: formData.visitor_document || "Não informado",
      visitor_type: formData.visitor_type,
      service_company: formData.service_company || null,
      service_type: formData.service_type || null,
    };

    const { error } = await supabase.from("access_logs").insert([data]);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Entrada registrada!" });
    }

    setIsOpen(false);
    setFormData({
      unit_id: "none",
      visitor_name: "",
      visitor_document: "",
      visitor_type: "visitante",
      service_company: "",
      service_type: "",
    });
    fetchData();
  };

  const handleExit = async (id: string) => {
    const { error } = await supabase
      .from("access_logs")
      .update({ exit_time: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Saída registrada!" });
      fetchData();
    }
  };

  const handleReEntry = (log: any) => {
    setFormData({
      unit_id: log.unit_id || "none",
      visitor_name: log.visitor_name,
      visitor_document: log.visitor_document,
      visitor_type: log.visitor_type,
      service_company: log.service_company || "",
      service_type: log.service_type || "",
    });
    setIsOpen(true);
  };

  // Register entry from authorization
  const handleRegisterFromAuth = (auth: any) => {
    setFormData({
      unit_id: auth.unit_id || "none",
      visitor_name: auth.visitor_name,
      visitor_document: auth.visitor_document,
      visitor_type: auth.service_type ? "prestador_servico" : "visitante",
      service_company: "",
      service_type: auth.service_type || "",
    });
    setIsOpen(true);
    setActiveTab("entries");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData().finally(() => setIsRefreshing(false));
  };

  // Stats calculations for entries
  const entryStats = useMemo(() => {
    const total = accessLogs.length;
    const visitors = accessLogs.filter((l) => l.visitor_type === "visitante").length;
    const providers = accessLogs.filter((l) => l.visitor_type === "prestador_servico").length;
    const stillInside = accessLogs.filter((l) => !l.exit_time).length;
    return { total, visitors, providers, stillInside };
  }, [accessLogs]);

  // Stats calculations for authorizations
  const authStats = useMemo(() => {
    if (!authorizations) return { total: 0, ativas: 0, utilizadas: 0, expiradas: 0 };
    return {
      total: authorizations.length,
      ativas: authorizations.filter((a: any) => a.status === "ativa").length,
      utilizadas: authorizations.filter((a: any) => a.status === "utilizada").length,
      expiradas: authorizations.filter((a: any) => a.status === "expirada").length,
    };
  }, [authorizations]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return accessLogs.filter((log) => {
      const matchesSearch =
        log.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.visitor_document?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.condominiums?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.units?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || log.visitor_type === filterType;
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "inside" && !log.exit_time) ||
        (filterStatus === "exited" && log.exit_time);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [accessLogs, searchTerm, filterType, filterStatus]);

  // Filtered authorizations
  const filteredAuths = useMemo(() => {
    return authorizations?.filter((auth: any) => {
      const matchesSearch =
        auth.visitor_name.toLowerCase().includes(authSearchTerm.toLowerCase()) ||
        auth.visitor_document.includes(authSearchTerm) ||
        auth.residents?.profiles?.full_name?.toLowerCase().includes(authSearchTerm.toLowerCase()) ||
        auth.units?.unit_number?.toLowerCase().includes(authSearchTerm.toLowerCase());

      // Porteiros só veem ativas
      if (isDoorkeeper() && !isAdmin()) {
        return auth.status === "ativa" && matchesSearch;
      }

      const matchesStatus = authFilterStatus === "all" || auth.status === authFilterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [authorizations, authSearchTerm, authFilterStatus, isAdmin, isDoorkeeper]);

  const handleAuthAction = (id: string, action: "utilizada" | "cancelada") => {
    setConfirmDialog({ open: true, id, action });
  };

  const confirmAuthAction = () => {
    updateAuthStatus({ id: confirmDialog.id, status: confirmDialog.action });
    setConfirmDialog({ open: false, id: "", action: "utilizada" });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { text: string; className: string }> = {
      ativa: { text: "Ativa", className: "bg-green-500/10 text-green-500 border-green-500" },
      utilizada: { text: "Utilizada", className: "bg-blue-500/10 text-blue-500 border-blue-500" },
      expirada: { text: "Expirada", className: "bg-muted text-muted-foreground border-muted" },
      cancelada: { text: "Cancelada", className: "bg-destructive/10 text-destructive border-destructive" },
    };
    const variant = variants[status] || variants.ativa;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.text}
      </Badge>
    );
  };

  const showAdminFeatures = isAdmin();
  const filteredUnits = units;

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando portaria..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Portaria"
          description="Controle de entradas, saídas e autorizações de visitantes"
          count={entryStats.stillInside}
          countLabel="no local"
          actions={
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Entrada
            </Button>
          }
        />

        {/* Combined Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {isLoading ? (
            <StatsCardSkeleton count={6} />
          ) : (
            <>
              <StatsCard
                title="No Local"
                value={entryStats.stillInside}
                icon={Clock}
                variant="warning"
              />
              <StatsCard
                title="Entradas Hoje"
                value={entryStats.total}
                icon={DoorOpen}
                variant="default"
              />
              <StatsCard
                title="Visitantes"
                value={entryStats.visitors}
                icon={Users}
                variant="info"
              />
              <StatsCard
                title="Prestadores"
                value={entryStats.providers}
                icon={Briefcase}
                variant="primary"
              />
              <StatsCard
                title="Autoriz. Ativas"
                value={authStats.ativas}
                icon={CheckCircle}
                variant="success"
              />
              <StatsCard
                title="Autoriz. Usadas"
                value={authStats.utilizadas}
                icon={UserCheck}
                variant="default"
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="entries" className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Entradas/Saídas</span>
              <span className="sm:hidden">Entradas</span>
            </TabsTrigger>
            <TabsTrigger value="authorizations" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Autorizações</span>
              <span className="sm:hidden">Autoriz.</span>
            </TabsTrigger>
          </TabsList>

          {/* Entries Tab */}
          <TabsContent value="entries" className="space-y-4">
            <DataTableHeader
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por nome, documento, condomínio..."
              filters={
                <>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="visitante">Visitante</SelectItem>
                      <SelectItem value="prestador_servico">Prestador</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="inside">No local</SelectItem>
                      <SelectItem value="exited">Saiu</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              }
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              resultCount={filteredLogs.length}
            />

            <Card className="border-border">
              <CardContent className="p-0 md:p-0 p-4">
                {isLoading ? (
                  <TableSkeleton columns={7} rows={5} />
                ) : filteredLogs.length === 0 ? (
                  <EmptyState
                    icon={DoorOpen}
                    title={searchTerm || filterType !== "all" || filterStatus !== "all" ? "Nenhum registro encontrado" : "Nenhum registro de acesso"}
                    description={
                      searchTerm || filterType !== "all" || filterStatus !== "all"
                        ? "Tente ajustar os filtros de busca"
                        : "Registre a primeira entrada de visitante"
                    }
                    actionLabel={!searchTerm && filterType === "all" && filterStatus === "all" ? "Registrar Entrada" : undefined}
                    onAction={!searchTerm && filterType === "all" && filterStatus === "all" ? () => setIsOpen(true) : undefined}
                  />
                ) : (
                  <ResponsiveDataView
                    desktopView={
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Visitante</TableHead>
                            <TableHead>Condomínio</TableHead>
                            <TableHead>Unidade</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Entrada</TableHead>
                            <TableHead>Saída</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLogs.map((log) => (
                            <TableRow key={log.id} className="group hover:bg-muted/50">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{log.visitor_name}</p>
                                    <p className="text-sm text-muted-foreground">{log.visitor_document}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{log.condominiums?.name}</TableCell>
                              <TableCell>
                                {log.units?.unit_number ? (
                                  <Badge variant="outline">{log.units.unit_number}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={log.visitor_type === "visitante" ? "info" : "gold"}>
                                  {log.visitor_type === "visitante" ? "Visitante" : "Prestador"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {format(new Date(log.entry_time), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </span>
                              </TableCell>
                              <TableCell>
                                {log.exit_time ? (
                                  <span className="text-sm">
                                    {format(new Date(log.exit_time), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </span>
                                ) : (
                                  <Badge variant="warning">No local</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {!log.exit_time ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExit(log.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Registrar Saída"
                                  >
                                    <ExitIcon className="h-4 w-4 mr-1" />
                                    Saída
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReEntry(log)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-primary"
                                    title="Registrar Nova Entrada"
                                  >
                                    <DoorOpen className="h-4 w-4 mr-1" />
                                    Nova Entrada
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    }
                    mobileView={
                      <div className="space-y-3">
                        {filteredLogs.map((log) => (
                          <MobileDataCard key={log.id}>
                            <MobileDataHeader
                              avatar={
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                              }
                              title={log.visitor_name}
                              subtitle={log.visitor_document}
                              badge={
                                <Badge variant={log.visitor_type === "visitante" ? "info" : "gold"}>
                                  {log.visitor_type === "visitante" ? "Visitante" : "Prestador"}
                                </Badge>
                              }
                            />
                            <MobileDataRow label="Condomínio" value={log.condominiums?.name || "-"} />
                            <MobileDataRow label="Unidade" value={log.units?.unit_number || "-"} />
                            <MobileDataRow 
                              label="Entrada" 
                              value={format(new Date(log.entry_time), "dd/MM/yyyy HH:mm", { locale: ptBR })} 
                            />
                            <MobileDataRow 
                              label="Saída" 
                              value={log.exit_time 
                                ? format(new Date(log.exit_time), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                : <Badge variant="warning">No local</Badge>
                              } 
                            />
                            <MobileDataActions>
                              {!log.exit_time ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleExit(log.id)}
                                  className="flex-1"
                                >
                                  <ExitIcon className="h-4 w-4 mr-1" />
                                  Saída
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReEntry(log)}
                                  className="flex-1 text-primary"
                                >
                                  <DoorOpen className="h-4 w-4 mr-1" />
                                  Nova Entrada
                                </Button>
                              )}
                            </MobileDataActions>
                          </MobileDataCard>
                        ))}
                      </div>
                    }
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authorizations Tab */}
          <TabsContent value="authorizations" className="space-y-4">
            <DataTableHeader
              searchValue={authSearchTerm}
              onSearchChange={setAuthSearchTerm}
              searchPlaceholder="Buscar por nome, documento, morador ou unidade..."
              resultCount={filteredAuths?.length || 0}
              filters={
                showAdminFeatures ? (
                  <Select value={authFilterStatus} onValueChange={setAuthFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ativa">Ativas</SelectItem>
                      <SelectItem value="utilizada">Utilizadas</SelectItem>
                      <SelectItem value="expirada">Expiradas</SelectItem>
                      <SelectItem value="cancelada">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                ) : undefined
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isAuthLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border-border animate-pulse">
                    <CardContent className="p-6 h-48" />
                  </Card>
                ))
              ) : filteredAuths?.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    icon={UserCheck}
                    title="Nenhuma autorização encontrada"
                    description={
                      authSearchTerm || authFilterStatus !== "all"
                        ? "Tente ajustar os filtros de busca"
                        : showAdminFeatures
                        ? "As autorizações criadas pelos moradores aparecerão aqui"
                        : "Nenhuma autorização ativa no momento"
                    }
                  />
                </div>
              ) : (
                filteredAuths?.map((auth: any) => (
                  <Card
                    key={auth.id}
                    className="border-border hover:border-primary transition-colors group"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{auth.visitor_name}</CardTitle>
                        {getStatusBadge(auth.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="space-y-2">
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
                          <div>
                            <div>
                              {format(new Date(auth.valid_from), "dd/MM HH:mm", {
                                locale: ptBR,
                              })}
                            </div>
                            <div className="text-xs">
                              até{" "}
                              {format(new Date(auth.valid_until), "dd/MM HH:mm", {
                                locale: ptBR,
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="text-muted-foreground">
                          <span className="font-medium">Unidade:</span>{" "}
                          {auth.units?.unit_number}
                        </div>
                        <div className="text-muted-foreground">
                          <span className="font-medium">Morador:</span>{" "}
                          {auth.residents?.profiles?.full_name}
                        </div>
                        {auth.notes && (
                          <div className="text-muted-foreground text-xs border-t border-border pt-2">
                            <span className="font-medium">Obs:</span> {auth.notes}
                          </div>
                        )}
                      </div>

                      {auth.document_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(auth.document_url, "_blank")}
                        >
                          Ver Documento
                        </Button>
                      )}

                      {auth.status === "ativa" && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleRegisterFromAuth(auth)}
                          >
                            <DoorOpen className="h-4 w-4 mr-2" />
                            Entrada
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleAuthAction(auth.id, "utilizada")}
                            disabled={isUpdating}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Usada
                          </Button>
                          {showAdminFeatures && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleAuthAction(auth.id, "cancelada")}
                              disabled={isUpdating}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* New Entry Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Entrada</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Authorization Selector */}
              {authorizations && authorizations.filter((a: any) => a.status === "ativa").length > 0 && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
                  <Label className="flex items-center gap-2 text-primary">
                    <UserCheck className="h-4 w-4" />
                    Selecionar Visitante Autorizado
                  </Label>
                  <Select
                    value=""
                    onValueChange={(authId) => {
                      const auth = authorizations.find((a: any) => a.id === authId);
                      if (auth) {
                        setFormData({
                          unit_id: auth.unit_id || "none",
                          visitor_name: auth.visitor_name,
                          visitor_document: auth.visitor_document,
                          visitor_type: auth.service_type ? "prestador_servico" : "visitante",
                          service_company: "",
                          service_type: auth.service_type || "",
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolher autorização ativa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {authorizations
                        .filter((a: any) => a.status === "ativa")
                        .map((auth: any) => (
                          <SelectItem key={auth.id} value={auth.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{auth.visitor_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {auth.units?.unit_number} • {auth.visitor_document}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Ou preencha manualmente abaixo
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="unit">Unidade</Label>
                <Select
                  value={formData.unit_id}
                  onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {filteredUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.unit_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.visitor_type}
                  onValueChange={(value: any) => setFormData({ ...formData, visitor_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visitante">Visitante</SelectItem>
                    <SelectItem value="prestador_servico">Prestador de Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.visitor_name}
                  onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document">RG/CPF <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  id="document"
                  value={formData.visitor_document}
                  onChange={(e) => setFormData({ ...formData, visitor_document: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              {formData.visitor_type === "prestador_servico" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa</Label>
                    <Input
                      id="company"
                      value={formData.service_company}
                      onChange={(e) => setFormData({ ...formData, service_company: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service">Serviço</Label>
                    <Input
                      id="service"
                      value={formData.service_type}
                      onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                      placeholder="Ex: Entrega, Manutenção"
                    />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Entrada</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Confirm Dialog for Authorization Actions */}
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
          title={confirmDialog.action === "utilizada" ? "Marcar como Utilizada" : "Cancelar Autorização"}
          description={
            confirmDialog.action === "utilizada"
              ? "Confirma que o visitante entrou e a autorização foi utilizada?"
              : "Tem certeza que deseja cancelar esta autorização? Esta ação não pode ser desfeita."
          }
          confirmText={confirmDialog.action === "utilizada" ? "Confirmar" : "Cancelar Autorização"}
          onConfirm={confirmAuthAction}
        />
      </div>
    </DashboardLayout>
  );
};

export default AccessControl;
