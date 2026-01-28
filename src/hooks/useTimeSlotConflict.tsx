import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ConflictResult {
  hasConflict: boolean;
  conflictingReservations: Array<{
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    resident_name?: string;
  }>;
  isChecking: boolean;
  dayNotAvailable: boolean;
  timeOutOfRange: boolean;
  availableDays: number[];
  openingTime: string;
  closingTime: string;
}

export const useTimeSlotConflict = (
  commonAreaId: string | null,
  reservationDate: string | null,
  startTime: string | null,
  endTime: string | null
): ConflictResult => {
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictingReservations, setConflictingReservations] = useState<ConflictResult["conflictingReservations"]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [dayNotAvailable, setDayNotAvailable] = useState(false);
  const [timeOutOfRange, setTimeOutOfRange] = useState(false);
  const [availableDays, setAvailableDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [openingTime, setOpeningTime] = useState("08:00");
  const [closingTime, setClosingTime] = useState("22:00");

  useEffect(() => {
    const checkConflict = async () => {
      // Reset se dados insuficientes
      if (!commonAreaId || !reservationDate || !startTime || !endTime) {
        setHasConflict(false);
        setConflictingReservations([]);
        setDayNotAvailable(false);
        setTimeOutOfRange(false);
        return;
      }

      setIsChecking(true);

      try {
        // Primeiro, busca as configurações da área comum
        const { data: areaData, error: areaError } = await supabase
          .from("common_areas")
          .select("available_days, opening_time, closing_time")
          .eq("id", commonAreaId)
          .single();

        if (areaError) {
          console.error("Erro ao buscar configurações da área:", areaError);
        }

        // Parse das configurações
        const areaDays = (areaData?.available_days as number[]) || [0, 1, 2, 3, 4, 5, 6];
        const areaOpeningTime = (areaData?.opening_time as string)?.slice(0, 5) || "08:00";
        const areaClosingTime = (areaData?.closing_time as string)?.slice(0, 5) || "22:00";

        setAvailableDays(areaDays);
        setOpeningTime(areaOpeningTime);
        setClosingTime(areaClosingTime);

        // Verifica se o dia da semana está disponível
        const date = new Date(reservationDate + "T12:00:00");
        const dayOfWeek = date.getDay();
        const isDayAvailable = areaDays.includes(dayOfWeek);
        setDayNotAvailable(!isDayAvailable);

        // Verifica se o horário está dentro do funcionamento
        const isTimeInRange = startTime >= areaOpeningTime && endTime <= areaClosingTime;
        setTimeOutOfRange(!isTimeInRange);

        // Busca reservas ativas (aprovadas ou pendentes) para a mesma área e data
        const { data, error } = await supabase
          .from("reservations")
          .select(`
            id,
            start_time,
            end_time,
            status,
            residents!fk_reservations_residents(
              user_id,
              profiles!fk_residents_profiles(full_name)
            )
          `)
          .eq("common_area_id", commonAreaId)
          .eq("reservation_date", reservationDate)
          .in("status", ["aprovada", "pendente"]);

        if (error) {
          console.error("Erro ao verificar conflitos:", error);
          setHasConflict(false);
          setConflictingReservations([]);
          return;
        }

        // Verifica sobreposição de horários
        const conflicts = (data || []).filter((reservation: any) => {
          const existingStart = reservation.start_time;
          const existingEnd = reservation.end_time;
          
          // Verifica se há sobreposição
          // Conflito existe se: novo_inicio < existente_fim AND novo_fim > existente_inicio
          return startTime < existingEnd && endTime > existingStart;
        });

        const formattedConflicts = conflicts.map((r: any) => ({
          id: r.id,
          start_time: r.start_time,
          end_time: r.end_time,
          status: r.status,
          resident_name: r.residents?.profiles?.full_name,
        }));

        setHasConflict(formattedConflicts.length > 0);
        setConflictingReservations(formattedConflicts);
      } catch (error) {
        console.error("Erro ao verificar conflitos:", error);
        setHasConflict(false);
        setConflictingReservations([]);
      } finally {
        setIsChecking(false);
      }
    };

    // Debounce para não fazer muitas requisições
    const timeoutId = setTimeout(checkConflict, 300);
    return () => clearTimeout(timeoutId);
  }, [commonAreaId, reservationDate, startTime, endTime]);

  return { 
    hasConflict, 
    conflictingReservations, 
    isChecking, 
    dayNotAvailable, 
    timeOutOfRange,
    availableDays,
    openingTime,
    closingTime
  };
};
