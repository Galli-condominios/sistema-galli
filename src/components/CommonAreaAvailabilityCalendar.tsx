import { useState, useMemo, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Reservation {
  id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: string;
  guests_count?: number;
  residents?: {
    profiles?: {
      full_name?: string;
    };
  };
  units?: {
    unit_number?: string;
  };
}

interface CommonAreaAvailabilityCalendarProps {
  commonAreaId: string;
  commonAreaName: string;
  reservations: Reservation[];
  onDateSelect?: (date: Date) => void;
}

const DAY_NAMES_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const formatAvailableDays = (days: number[]): string => {
  if (days.length === 7) return "Todos os dias";
  if (JSON.stringify([...days].sort()) === JSON.stringify([1, 2, 3, 4, 5])) return "Seg-Sex";
  if (JSON.stringify([...days].sort()) === JSON.stringify([0, 6])) return "Fins de semana";
  return days.map(d => DAY_NAMES_SHORT[d]).join(", ");
};

export default function CommonAreaAvailabilityCalendar({
  commonAreaId,
  commonAreaName,
  reservations,
  onDateSelect,
}: CommonAreaAvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableDays, setAvailableDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [openingTime, setOpeningTime] = useState<string>("08:00");
  const [closingTime, setClosingTime] = useState<string>("22:00");

  // Buscar configurações da área comum
  useEffect(() => {
    const fetchAreaSettings = async () => {
      if (!commonAreaId) return;
      
      const { data } = await supabase
        .from("common_areas")
        .select("available_days, opening_time, closing_time")
        .eq("id", commonAreaId)
        .single();
      
      if (data) {
        setAvailableDays((data.available_days as number[]) || [0, 1, 2, 3, 4, 5, 6]);
        setOpeningTime((data.opening_time as string)?.slice(0, 5) || "08:00");
        setClosingTime((data.closing_time as string)?.slice(0, 5) || "22:00");
      }
    };

    fetchAreaSettings();
  }, [commonAreaId]);

  // Filter reservations for this common area and approved/pending status
  const relevantReservations = useMemo(() => {
    return reservations.filter(
      (r) => r.status === "aprovada" || r.status === "pendente"
    );
  }, [reservations]);

  // Get dates that have reservations
  const bookedDates = useMemo(() => {
    const dates = new Map<string, { count: number; status: string }>();
    relevantReservations.forEach((r) => {
      const dateKey = r.reservation_date;
      const existing = dates.get(dateKey);
      if (existing) {
        dates.set(dateKey, { 
          count: existing.count + 1, 
          status: r.status === "aprovada" ? "aprovada" : existing.status 
        });
      } else {
        dates.set(dateKey, { count: 1, status: r.status });
      }
    });
    return dates;
  }, [relevantReservations]);

  // Get reservations for selected date
  const selectedDateReservations = useMemo(() => {
    if (!selectedDate) return [];
    return relevantReservations.filter((r) =>
      isSameDay(parseISO(r.reservation_date), selectedDate)
    );
  }, [selectedDate, relevantReservations]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  // Custom day render to show availability status
  const modifiers = useMemo(() => {
    const booked: Date[] = [];
    const pending: Date[] = [];
    
    bookedDates.forEach((value, dateKey) => {
      const date = parseISO(dateKey);
      if (value.status === "aprovada") {
        booked.push(date);
      } else {
        pending.push(date);
      }
    });

    return { booked, pending };
  }, [bookedDates]);

  const modifiersStyles = {
    booked: {
      backgroundColor: "hsl(var(--destructive) / 0.15)",
      color: "hsl(var(--destructive))",
      fontWeight: "600",
    },
    pending: {
      backgroundColor: "hsl(var(--warning) / 0.15)",
      color: "hsl(var(--warning))",
      fontWeight: "600",
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar */}
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Calendário de Disponibilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              locale={ptBR}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              disabled={(date) => {
                // Desabilita datas passadas
                if (isBefore(startOfDay(date), startOfDay(new Date()))) return true;
                // Desabilita dias que não estão nos dias disponíveis
                const dayOfWeek = date.getDay();
                return !availableDays.includes(dayOfWeek);
              }}
              className="rounded-md border pointer-events-auto"
            />
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/20 border border-destructive/50" />
                <span className="text-muted-foreground">Reservado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning/20 border border-warning/50" />
                <span className="text-muted-foreground">Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted border border-border line-through" />
                <span className="text-muted-foreground">Indisponível</span>
              </div>
            </div>
            
            {/* Horário de funcionamento */}
            <div className="pt-2 text-xs text-muted-foreground border-t">
              <p><strong>Funcionamento:</strong> {formatAvailableDays(availableDays)}</p>
              <p><strong>Horário:</strong> {openingTime} - {closingTime}</p>
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card className="flex-1 min-w-[280px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                : "Selecione uma data"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">
                Clique em uma data no calendário para ver os horários reservados.
              </p>
            ) : selectedDateReservations.length === 0 ? (
              <div className="text-center py-6">
                <CalendarCheck className="h-10 w-10 mx-auto text-success/50 mb-2" />
                <p className="text-sm font-medium text-success">Dia disponível!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Não há reservas para esta data.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      reservation.status === "aprovada"
                        ? "bg-destructive/5 border-destructive/20"
                        : "bg-warning/5 border-warning/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {reservation.start_time?.slice(0, 5)} - {reservation.end_time?.slice(0, 5)}
                      </span>
                      <Badge
                        variant={reservation.status === "aprovada" ? "destructive" : "warning"}
                        className="text-xs"
                      >
                        {reservation.status === "aprovada" ? "Reservado" : "Pendente"}
                      </Badge>
                    </div>
                    {reservation.residents?.profiles?.full_name && (
                      <p className="text-xs text-muted-foreground">
                        Por: {reservation.residents.profiles.full_name}
                      </p>
                    )}
                    {reservation.units?.unit_number && (
                      <p className="text-xs text-muted-foreground">
                        Unidade: {reservation.units.unit_number}
                      </p>
                    )}
                    {reservation.guests_count && reservation.guests_count > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{reservation.guests_count} convidados</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
