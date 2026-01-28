import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Car, Gauge, User, Plus, Pencil, Trash2, AlertCircle, Bell, Package, Calendar, Wrench, DollarSign, Users } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResponsiveDataView } from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataRow, MobileDataHeader, MobileDataActions } from "@/components/MobileDataCard";

interface ResidentData {
  id: string;
  unit_id: string;
  unit_number: string;
  floor: string | null;
  condominium_name: string;
  resident_type: string;
  contract_end_date: string | null;
  max_vehicles: number;
}

interface Vehicle {
  id: string;
  model: string;
  plate: string;
  color: string | null;
}

interface GasReading {
  id: string;
  reading_month: number;
  reading_year: number;
  reading_value: number;
}

const ResidentDashboard = () => {
  const { userId } = useUserRole();
  const { toast } = useToast();
  const { notifications, markAsRead } = useNotifications();
  const [residentData, setResidentData] = useState<ResidentData | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [gasReadings, setGasReadings] = useState<GasReading[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Vehicle form state
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ model: "", plate: "", color: "" });
  const [deleteVehicleConfirm, setDeleteVehicleConfirm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Notification detail state
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const fetchResidentData = async () => {
    if (!userId) return;

    try {
      // Fetch resident info with unit and condominium
      const { data: resident, error: residentError } = await supabase
        .from("residents")
        .select(`
          id,
          resident_type,
          contract_end_date,
          unit_id,
          units (
            unit_number,
            floor,
            max_vehicles,
            condominiums (
              name
            )
          )
        `)
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (residentError) throw residentError;

      if (resident) {
        const unit = resident.units as any;
        const condominium = unit?.condominiums as any;
        
        setResidentData({
          id: resident.id,
          unit_id: resident.unit_id,
          unit_number: unit?.unit_number || "",
          floor: unit?.floor || null,
          condominium_name: condominium?.name || "",
          resident_type: resident.resident_type,
          contract_end_date: resident.contract_end_date,
          max_vehicles: unit?.max_vehicles ?? 2,
        });

        // Fetch vehicles for this unit
        const { data: vehiclesData, error: vehiclesError } = await supabase
          .from("vehicles")
          .select("id, model, plate, color")
          .eq("unit_id", resident.unit_id);

        if (!vehiclesError && vehiclesData) {
          setVehicles(vehiclesData);
        }

        // Fetch gas readings for this unit
        const { data: gasData, error: gasError } = await supabase
          .from("gas_readings")
          .select("id, reading_month, reading_year, reading_value")
          .eq("unit_id", resident.unit_id)
          .order("reading_year", { ascending: false })
          .order("reading_month", { ascending: false })
          .limit(6);

        if (!gasError && gasData) {
          setGasReadings(gasData);
        }
      }
    } catch (error) {
      console.error("Error fetching resident data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidentData();
  }, [userId]);

  const getResidentTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary"> = {
      proprietario: "default",
      inquilino: "secondary",
    };
    return variants[type] || "default";
  };

  const getMonthName = (month: number) => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[month - 1] || "";
  };

  const canAddVehicle = residentData ? vehicles.length < residentData.max_vehicles : false;

  const handleOpenVehicleDialog = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setVehicleForm({ model: vehicle.model, plate: vehicle.plate, color: vehicle.color || "" });
    } else {
      setEditingVehicle(null);
      setVehicleForm({ model: "", plate: "", color: "" });
    }
    setVehicleDialogOpen(true);
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentData) return;

    setSubmitting(true);
    try {
      if (editingVehicle) {
        // Update vehicle
        const { error } = await supabase
          .from("vehicles")
          .update({
            model: vehicleForm.model,
            plate: vehicleForm.plate.toUpperCase(),
            color: vehicleForm.color || null,
          })
          .eq("id", editingVehicle.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Veículo atualizado!" });
      } else {
        // Create vehicle with resident_id
        const { error } = await supabase.from("vehicles").insert({
          unit_id: residentData.unit_id,
          resident_id: residentData.id,
          model: vehicleForm.model,
          plate: vehicleForm.plate.toUpperCase(),
          color: vehicleForm.color || null,
        });

        if (error) throw error;
        toast({ title: "Sucesso", description: "Veículo cadastrado!" });
      }

      setVehicleDialogOpen(false);
      setVehicleForm({ model: "", plate: "", color: "" });
      setEditingVehicle(null);
      fetchResidentData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Veículo excluído!" });
      fetchResidentData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setDeleteVehicleConfirm(null);
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      package: <Package className="h-4 w-4" />,
      reservation: <Calendar className="h-4 w-4" />,
      visitor: <Users className="h-4 w-4" />,
      maintenance: <Wrench className="h-4 w-4" />,
      financial: <DollarSign className="h-4 w-4" />,
    };
    return icons[type] || <Bell className="h-4 w-4" />;
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      package: "bg-blue-500/10 text-blue-500",
      reservation: "bg-green-500/10 text-green-500",
      visitor: "bg-purple-500/10 text-purple-500",
      maintenance: "bg-orange-500/10 text-orange-500",
      financial: "bg-red-500/10 text-red-500",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando área do morador..." />
      </DashboardLayout>
    );
  }

  if (!residentData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">
            Nenhum dado de morador encontrado. Entre em contato com a administração.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Área do Morador</h2>
          <p className="text-muted-foreground">Gerencie suas informações e acompanhe as novidades</p>
        </div>

        {/* Compact Notifications Board */}
        {notifications && notifications.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border overflow-x-auto">
            <Bell className="h-4 w-4 text-primary shrink-0" />
            <div className="flex items-center gap-3 overflow-x-auto">
              {notifications.slice(0, 3).map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => {
                    setSelectedNotification(notification);
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap shrink-0 transition-colors hover:bg-muted cursor-pointer ${
                    notification.read ? "bg-background/50" : "bg-primary/10 border border-primary/20"
                  }`}
                >
                  <span className={getNotificationColor(notification.type)}>
                    {getNotificationIcon(notification.type)}
                  </span>
                  <span className="font-medium max-w-[200px] truncate">{notification.title}</span>
                  {!notification.read && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="minha-area" className="space-y-4">
          <TabsList className="w-full md:w-auto grid grid-cols-2 md:flex">
            <TabsTrigger value="minha-area" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Building2 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">Minha Área</span>
              <span className="md:hidden">Área</span>
            </TabsTrigger>
            <TabsTrigger value="veiculos" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Car className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">Veículos</span>
              <span className="md:hidden">Veículos</span>
              <Badge variant="secondary" className="ml-1 text-[10px] md:text-xs h-4 md:h-5 px-1 md:px-1.5">
                {vehicles.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Minha Área Tab */}
          <TabsContent value="minha-area" className="space-y-6">
            {/* Info Cards */}
            <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Condomínio</CardTitle>
                  <Building2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-lg md:text-2xl font-bold truncate">{residentData.condominium_name}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Unidade</CardTitle>
                  <Building2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-lg md:text-2xl font-bold">{residentData.unit_number}</div>
                  {residentData.floor && (
                    <p className="text-[10px] md:text-xs text-muted-foreground">Andar: {residentData.floor}</p>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-2 md:col-span-1 lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Tipo</CardTitle>
                  <User className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <Badge variant={getResidentTypeBadge(residentData.resident_type)}>
                    {residentData.resident_type === "proprietario" ? "Proprietário" : "Inquilino"}
                  </Badge>
                  {residentData.contract_end_date && (
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-2">
                      Contrato até: {format(new Date(residentData.contract_end_date), "dd/MM/yyyy")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gas Readings Section */}
            <Card>
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Gauge className="h-4 w-4 md:h-5 md:w-5" />
                  Leituras de Gás
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">Últimas 6 leituras de consumo de gás</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                {gasReadings.length === 0 ? (
                  <p className="text-xs md:text-sm text-muted-foreground">Nenhuma leitura disponível.</p>
                ) : (
                  <ResponsiveDataView
                    desktopView={
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead className="text-right">Leitura (m³)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gasReadings.map((reading) => (
                            <TableRow key={reading.id}>
                              <TableCell className="font-medium">
                                {getMonthName(reading.reading_month)} {reading.reading_year}
                              </TableCell>
                              <TableCell className="text-right">
                                {reading.reading_value.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    }
                    mobileView={
                      <div className="space-y-2">
                        {gasReadings.map((reading) => (
                          <div key={reading.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <span className="text-sm font-medium">
                              {getMonthName(reading.reading_month)} {reading.reading_year}
                            </span>
                            <span className="text-sm font-bold">
                              {reading.reading_value.toFixed(2)} m³
                            </span>
                          </div>
                        ))}
                      </div>
                    }
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Veículos Tab */}
          <TabsContent value="veiculos" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 md:p-6">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Car className="h-4 w-4 md:h-5 md:w-5" />
                    Meus Veículos
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {vehicles.length} de {residentData.max_vehicles} vagas utilizadas
                  </CardDescription>
                </div>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={() => handleOpenVehicleDialog()}
                  disabled={!canAddVehicle}
                  className="w-full md:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Veículo
                </Button>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                {!canAddVehicle && vehicles.length >= residentData.max_vehicles && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs md:text-sm">
                      Limite de veículos atingido ({residentData.max_vehicles}). 
                      Entre em contato com a administração se precisar cadastrar mais veículos.
                    </AlertDescription>
                  </Alert>
                )}
                {vehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => handleOpenVehicleDialog()}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Cadastrar Primeiro Veículo
                    </Button>
                  </div>
                ) : (
                  <ResponsiveDataView
                    desktopView={
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Modelo</TableHead>
                            <TableHead>Placa</TableHead>
                            <TableHead>Cor</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vehicles.map((vehicle) => (
                            <TableRow key={vehicle.id}>
                              <TableCell className="font-medium">{vehicle.model}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono">
                                  {vehicle.plate}
                                </Badge>
                              </TableCell>
                              <TableCell>{vehicle.color || "-"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenVehicleDialog(vehicle)}
                                    className="h-8 w-8"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteVehicleConfirm(vehicle.id)}
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
                      <div className="space-y-3">
                        {vehicles.map((vehicle) => (
                          <MobileDataCard key={vehicle.id}>
                            <MobileDataHeader
                              title={vehicle.model}
                              subtitle={vehicle.color || "Cor não informada"}
                              badge={
                                <Badge variant="outline" className="font-mono text-xs">
                                  {vehicle.plate}
                                </Badge>
                              }
                              actions={
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenVehicleDialog(vehicle)}
                                    className="h-8 w-8"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteVehicleConfirm(vehicle.id)}
                                    className="h-8 w-8 text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              }
                            />
                          </MobileDataCard>
                        ))}
                      </div>
                    }
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Vehicle Dialog */}
        <ResponsiveDialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                {editingVehicle ? "Editar Veículo" : "Cadastrar Veículo"}
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <form onSubmit={handleVehicleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                  required
                  placeholder="Ex: Honda Civic, Fiat Uno"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate">Placa</Label>
                <Input
                  id="plate"
                  value={vehicleForm.plate}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value.toUpperCase() })}
                  required
                  placeholder="Ex: ABC1D23"
                  maxLength={7}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Cor (opcional)</Label>
                <Input
                  id="color"
                  value={vehicleForm.color}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                  placeholder="Ex: Prata, Preto, Branco"
                />
              </div>
              <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
                {submitting ? "Salvando..." : editingVehicle ? "Atualizar" : "Cadastrar"}
              </Button>
            </form>
          </ResponsiveDialogContent>
        </ResponsiveDialog>

        {/* Delete Vehicle Confirm */}
        <ConfirmDialog
          open={!!deleteVehicleConfirm}
          onOpenChange={(open) => !open && setDeleteVehicleConfirm(null)}
          title="Excluir Veículo"
          description="Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          onConfirm={() => deleteVehicleConfirm && handleDeleteVehicle(deleteVehicleConfirm)}
        />

        {/* Notification Detail Dialog */}
        <ResponsiveDialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle className="flex items-center gap-2">
                <span className={`p-2 rounded-full ${selectedNotification ? getNotificationColor(selectedNotification.type) : ""}`}>
                  {selectedNotification && getNotificationIcon(selectedNotification.type)}
                </span>
                {selectedNotification?.title}
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <div className="space-y-4">
              <p className="text-foreground">{selectedNotification?.message}</p>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {selectedNotification?.created_at && formatDistanceToNow(new Date(selectedNotification.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
                <Badge variant="outline" className="capitalize">
                  {selectedNotification?.type}
                </Badge>
              </div>
            </div>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>
    </DashboardLayout>
  );
};

export default ResidentDashboard;
