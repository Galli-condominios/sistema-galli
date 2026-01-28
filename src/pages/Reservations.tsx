import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import StatsCard from "@/components/StatsCard";
import DataTableHeader from "@/components/DataTableHeader";
import TableSkeleton from "@/components/TableSkeleton";
import EmptyState from "@/components/EmptyState";
import CommonAreaCard from "@/components/CommonAreaCard";
import GuestListForm from "@/components/GuestListForm";
import ReservationGuestsDialog from "@/components/ReservationGuestsDialog";
import ResponsiveDataView from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataRow, MobileDataHeader, MobileDataActions } from "@/components/MobileDataCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Plus, CheckCircle, XCircle, Clock, CalendarCheck, CalendarX, Users, AlertTriangle, Loader2, MapPin, Eye } from "lucide-react";
import { useReservations } from "@/hooks/useReservations";
import { useUserRole } from "@/hooks/useUserRole";
import { useTimeSlotConflict } from "@/hooks/useTimeSlotConflict";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Guest } from "@/hooks/useReservationGuests";

const Reservations = () => {
  const { reservations, isLoading, createReservation, updateReservationStatus, isCreating } = useReservations();
  const { isAdmin, userId } = useUserRole();
  const [isOpen, setIsOpen] = useState(false);
  const [commonAreas, setCommonAreas] = useState<any[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(true);
  const [resident, setResident] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [isGuestsDialogOpen, setIsGuestsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    common_area_id: "",
    reservation_date: "",
    start_time: "",
    end_time: "",
    guests_count: "",
    notes: "",
  });

  // Hook para verificar conflitos de horário
  const { 
    hasConflict, 
    conflictingReservations, 
    isChecking,
    dayNotAvailable,
    timeOutOfRange,
    availableDays,
    openingTime,
    closingTime
  } = useTimeSlotConflict(
    formData.common_area_id || null,
    formData.reservation_date || null,
    formData.start_time || null,
    formData.end_time || null
  );

  const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  useEffect(() => {
    if (userId) {
      fetchResident();
    }
  }, [userId]);

  // Buscar áreas comuns após ter o resident (para filtrar por condomínio)
  useEffect(() => {
    // Para admin, buscar imediatamente
    // Para morador, aguardar o resident estar carregado
    if (isAdmin()) {
      fetchCommonAreas();
    } else if (resident?.units?.condominium_id) {
      fetchCommonAreas();
    }
  }, [resident]);

  const fetchCommonAreas = async () => {
    setIsLoadingAreas(true);
    let query = supabase.from("common_areas").select("*, condominiums(name)").order("name");
    
    // Se for morador, filtrar pelo condomínio da unidade
    if (!isAdmin() && resident?.units?.condominium_id) {
      query = query.eq("condominium_id", resident.units.condominium_id);
    }
    
    const { data } = await query;
    setCommonAreas(data || []);
    setIsLoadingAreas(false);
  };

  const fetchResident = async () => {
    const { data } = await supabase
      .from("residents")
      .select("*, units(*)")
      .eq("user_id", userId)
      .single();
    setResident(data);
  };

  // Handler para reservar diretamente do card
  const handleReserveFromCard = (area: any, selectedDate?: Date) => {
    setFormData({
      ...formData,
      common_area_id: area.id,
      reservation_date: selectedDate ? selectedDate.toISOString().split('T')[0] : "",
      start_time: "",
      end_time: "",
      guests_count: "",
      notes: "",
    });
    setGuests([]);
    setIsOpen(true);
  };

  // Atualiza lista de convidados quando o número muda
  const handleGuestsCountChange = (value: string) => {
    const count = parseInt(value) || 0;
    setFormData({ ...formData, guests_count: value });
    
    // Ajusta o array de convidados para o novo tamanho
    if (count > guests.length) {
      // Adiciona novos convidados vazios
      const newGuests = [...guests];
      for (let i = guests.length; i < count; i++) {
        newGuests.push({ name: "", phone: "" });
      }
      setGuests(newGuests);
    } else if (count < guests.length) {
      // Remove convidados excedentes
      setGuests(guests.slice(0, count));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resident) {
      const { toast } = await import("sonner");
      toast.error("Você precisa estar vinculado a uma unidade para fazer reservas. Entre em contato com a administração.");
      return;
    }

    // Bloqueia envio se houver conflito, dia ou horário inválido
    if (hasConflict || dayNotAvailable || timeOutOfRange) {
      const { toast } = await import("sonner");
      if (dayNotAvailable) {
        toast.error("Esta área não funciona no dia selecionado.");
      } else if (timeOutOfRange) {
        toast.error(`O horário deve estar entre ${openingTime} e ${closingTime}.`);
      } else {
        toast.error("O horário selecionado já está reservado. Por favor, escolha outro horário.");
      }
      return;
    }

    // Valida se todos os convidados têm nome preenchido
    const guestsCount = parseInt(formData.guests_count) || 0;
    if (guestsCount > 0) {
      const invalidGuests = guests.filter(g => !g.name.trim());
      if (invalidGuests.length > 0) {
        const { toast } = await import("sonner");
        toast.error("Preencha o nome de todos os convidados.");
        return;
      }
    }

    createReservation({
      ...formData,
      unit_id: resident.unit_id,
      resident_id: resident.id,
      guests_count: guestsCount,
      guests: guestsCount > 0 ? guests.filter(g => g.name.trim()) : undefined,
    });
    
    setIsOpen(false);
    setFormData({
      common_area_id: "",
      reservation_date: "",
      start_time: "",
      end_time: "",
      guests_count: "",
      notes: "",
    });
    setGuests([]);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Stats calculations
  const stats = useMemo(() => {
    if (!reservations) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    return {
      total: reservations.length,
      pending: reservations.filter((r: any) => r.status === "pendente").length,
      approved: reservations.filter((r: any) => r.status === "aprovada").length,
      rejected: reservations.filter((r: any) => r.status === "rejeitada").length,
    };
  }, [reservations]);

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    if (!reservations) return [];
    return reservations.filter((reservation: any) => {
      const matchesSearch = 
        reservation.common_areas?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.residents?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.units?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || reservation.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [reservations, searchTerm, filterStatus]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { text: string; variant: "warning" | "success" | "destructive" | "muted" }> = {
      pendente: { text: "Pendente", variant: "warning" },
      aprovada: { text: "Aprovada", variant: "success" },
      rejeitada: { text: "Rejeitada", variant: "destructive" },
      cancelada: { text: "Cancelada", variant: "muted" },
    };
    const variant = variants[status] || variants.pendente;
    return <Badge variant={variant.variant}>{variant.text}</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando reservas..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Reservas de Áreas Comuns"
          description={isAdmin() ? "Gerencie as reservas do condomínio" : "Faça suas reservas de áreas comuns"}
          count={stats.total}
          countLabel="reservas"
          actions={
            !isAdmin() && (
              <Button onClick={() => setIsOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Reserva
              </Button>
            )
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Total de Reservas"
            value={stats.total}
            icon={Calendar}
            variant="default"
          />
          <StatsCard
            title="Pendentes"
            value={stats.pending}
            icon={Clock}
            variant="warning"
            description="Aguardando aprovação"
          />
          <StatsCard
            title="Aprovadas"
            value={stats.approved}
            icon={CalendarCheck}
            variant="success"
          />
          <StatsCard
            title="Rejeitadas"
            value={stats.rejected}
            icon={CalendarX}
            variant="info"
          />
        </div>

        {/* Filters */}
        <DataTableHeader
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por área, morador ou unidade..."
          filters={
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovada">Aprovada</SelectItem>
                <SelectItem value="rejeitada">Rejeitada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          }
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          resultCount={filteredReservations.length}
        />

        {/* Table */}
        <Card className="border-border">
          <CardContent className="p-0 md:p-0 p-4">
            {isLoading ? (
              <TableSkeleton columns={isAdmin() ? 7 : 5} rows={5} />
            ) : filteredReservations.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={searchTerm || filterStatus !== "all" ? "Nenhuma reserva encontrada" : "Nenhuma reserva cadastrada"}
                description={
                  searchTerm || filterStatus !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : isAdmin()
                    ? "As reservas dos moradores aparecerão aqui"
                    : "Faça sua primeira reserva de área comum"
                }
                actionLabel={!isAdmin() && !searchTerm && filterStatus === "all" ? "Nova Reserva" : undefined}
                onAction={!isAdmin() && !searchTerm && filterStatus === "all" ? () => setIsOpen(true) : undefined}
                compact
              />
            ) : (
              <ResponsiveDataView
                desktopView={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Área</TableHead>
                        {isAdmin() && <TableHead>Morador</TableHead>}
                        {isAdmin() && <TableHead>Unidade</TableHead>}
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Convidados</TableHead>
                        <TableHead>Status</TableHead>
                        {isAdmin() && <TableHead className="text-right">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReservations.map((reservation: any) => (
                        <TableRow key={reservation.id} className="group hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Calendar className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium">{reservation.common_areas?.name}</span>
                            </div>
                          </TableCell>
                          {isAdmin() && (
                            <TableCell>{reservation.residents?.profiles?.full_name || "-"}</TableCell>
                          )}
                          {isAdmin() && (
                            <TableCell>
                              <Badge variant="outline">{reservation.units?.unit_number}</Badge>
                            </TableCell>
                          )}
                          <TableCell>
                            {format(new Date(reservation.reservation_date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {reservation.start_time?.slice(0, 5)} - {reservation.end_time?.slice(0, 5)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReservation(reservation);
                                setIsGuestsDialogOpen(true);
                              }}
                              className="flex items-center gap-1 hover:bg-primary/10"
                            >
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span>{reservation.guests_count || 0}</span>
                              <Eye className="h-3 w-3 ml-1 text-muted-foreground" />
                            </Button>
                          </TableCell>
                          <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                          {isAdmin() && (
                            <TableCell className="text-right">
                              {reservation.status === "pendente" && (
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" onClick={() => updateReservationStatus({ id: reservation.id, status: "aprovada" })} className="text-green-500 hover:text-green-600 hover:bg-green-500/10">
                                    <CheckCircle className="h-4 w-4 mr-1" />Aprovar
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => updateReservationStatus({ id: reservation.id, status: "rejeitada" })} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                    <XCircle className="h-4 w-4 mr-1" />Rejeitar
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                }
                mobileView={
                  <div className="space-y-3">
                    {filteredReservations.map((reservation: any) => (
                      <MobileDataCard key={reservation.id}>
                        <MobileDataHeader
                          avatar={<div className="p-2 rounded-lg bg-primary/10"><Calendar className="h-4 w-4 text-primary" /></div>}
                          title={reservation.common_areas?.name}
                          subtitle={isAdmin() ? reservation.residents?.profiles?.full_name : undefined}
                          badge={getStatusBadge(reservation.status)}
                        />
                        {isAdmin() && <MobileDataRow label="Unidade" value={reservation.units?.unit_number} />}
                        <MobileDataRow label="Data" value={format(new Date(reservation.reservation_date), "dd/MM/yyyy", { locale: ptBR })} />
                        <MobileDataRow label="Horário" value={`${reservation.start_time?.slice(0, 5)} - ${reservation.end_time?.slice(0, 5)}`} />
                        <MobileDataRow label="Convidados" value={reservation.guests_count || 0} />
                        {isAdmin() && reservation.status === "pendente" && (
                          <MobileDataActions>
                            <Button variant="outline" size="sm" onClick={() => updateReservationStatus({ id: reservation.id, status: "aprovada" })} className="flex-1 text-green-500">
                              <CheckCircle className="h-4 w-4 mr-1" />Aprovar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => updateReservationStatus({ id: reservation.id, status: "rejeitada" })} className="flex-1 text-red-500">
                              <XCircle className="h-4 w-4 mr-1" />Rejeitar
                            </Button>
                          </MobileDataActions>
                        )}
                      </MobileDataCard>
                    ))}
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Mural de Áreas Comuns - Apenas para moradores */}
        {!isAdmin() && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Áreas Disponíveis</h2>
              <p className="text-muted-foreground text-sm">Conheça as áreas comuns do seu condomínio e faça sua reserva</p>
            </div>
            
            {isLoadingAreas ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-5 space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-16 w-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : commonAreas.length === 0 ? (
              <Card className="p-8">
                <EmptyState
                  icon={MapPin}
                  title="Nenhuma área comum disponível"
                  description="Não há áreas comuns cadastradas para o seu condomínio"
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {commonAreas.map((area) => (
                  <CommonAreaCard
                    key={area.id}
                    area={area}
                    onReserve={handleReserveFromCard}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* New Reservation Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Reserva</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="common_area_id">Área Comum</Label>
                <Select
                  value={formData.common_area_id}
                  onValueChange={(value) => setFormData({ ...formData, common_area_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonAreas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reservation_date">Data</Label>
                  <Input
                    id="reservation_date"
                    type="date"
                    value={formData.reservation_date}
                    onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_time">Início</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time">Término</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Indicador de verificação e alerta de conflito */}
              {isChecking && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando disponibilidade...
                </div>
              )}

              {/* Alerta de dia não disponível */}
              {dayNotAvailable && !isChecking && formData.reservation_date && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium">Dia não disponível!</p>
                    <p className="text-sm">
                      Esta área não funciona neste dia da semana. Dias disponíveis: {availableDays.map(d => DAY_NAMES[d]).join(", ")}.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Alerta de horário fora do funcionamento */}
              {timeOutOfRange && !isChecking && !dayNotAvailable && formData.start_time && formData.end_time && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium">Horário fora do funcionamento!</p>
                    <p className="text-sm">
                      Esta área funciona das {openingTime} às {closingTime}. Ajuste o horário da sua reserva.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {hasConflict && !isChecking && !dayNotAvailable && !timeOutOfRange && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Horário indisponível!</p>
                      <p className="text-sm">
                        Já existe(m) reserva(s) neste horário:
                      </p>
                      <ul className="text-sm list-disc list-inside">
                        {conflictingReservations.map((conflict) => (
                          <li key={conflict.id}>
                            {conflict.start_time?.slice(0, 5)} - {conflict.end_time?.slice(0, 5)}
                            {conflict.resident_name && ` (${conflict.resident_name})`}
                            {" - "}
                            <Badge variant={conflict.status === "aprovada" ? "success" : "warning"} className="ml-1">
                              {conflict.status === "aprovada" ? "Aprovada" : "Pendente"}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="guests_count">Número de Convidados</Label>
                <Input
                  id="guests_count"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.guests_count}
                  onChange={(e) => handleGuestsCountChange(e.target.value)}
                  placeholder="Quantidade de convidados"
                />
              </div>

              {/* Lista dinâmica de convidados */}
              <GuestListForm
                guestsCount={parseInt(formData.guests_count) || 0}
                guests={guests}
                onGuestsChange={setGuests}
              />

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

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating || hasConflict || dayNotAvailable || timeOutOfRange || isChecking}>
                  {isCreating ? "Solicitando..." : (hasConflict || dayNotAvailable || timeOutOfRange) ? "Verificar Dados" : "Solicitar Reserva"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para visualizar lista de convidados */}
        <ReservationGuestsDialog
          open={isGuestsDialogOpen}
          onOpenChange={setIsGuestsDialogOpen}
          reservation={selectedReservation}
        />
      </div>
    </DashboardLayout>
  );
};

export default Reservations;
