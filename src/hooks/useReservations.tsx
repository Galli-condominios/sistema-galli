import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "./useUserRole";
import { useCondominiumFilter } from "./useCondominiumFilter";
import type { Database } from "@/integrations/supabase/types";
import type { Guest } from "./useReservationGuests";

type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
type ReservationInsert = Database["public"]["Tables"]["reservations"]["Insert"];

interface CreateReservationWithGuests extends ReservationInsert {
  guests?: Guest[];
}

export const useReservations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const { condominiumId, shouldFilter } = useCondominiumFilter();

  const { data: reservations, isLoading } = useQuery({
    queryKey: ["reservations", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("reservations")
        .select(`
          *,
          common_areas(name, condominium_id),
          units(unit_number, condominium_id, condominiums(name)),
          residents!fk_reservations_residents(user_id, profiles!fk_residents_profiles(full_name))
        `)
        .order("reservation_date", { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by condominium on client side (units.condominium_id)
      if (shouldFilter && condominiumId) {
        return data?.filter(r => r.units?.condominium_id === condominiumId) || [];
      }
      
      return data;
    },
  });

  const createReservation = useMutation({
    mutationFn: async (newReservation: CreateReservationWithGuests) => {
      const { guests, ...reservationData } = newReservation;
      
      // Verificar se a área comum requer aprovação
      const { data: commonArea } = await supabase
        .from("common_areas")
        .select("requires_approval")
        .eq("id", reservationData.common_area_id)
        .single();
      
      // Define o status baseado na configuração da área
      const status = commonArea?.requires_approval === false ? "aprovada" : "pendente";
      
      // Create the reservation with the correct status
      const { data: reservation, error: reservationError } = await supabase
        .from("reservations")
        .insert({ ...reservationData, status })
        .select()
        .single();
      
      if (reservationError) throw reservationError;
      
      // If there are guests, insert them
      if (guests && guests.length > 0) {
        const guestsToInsert = guests.map((guest) => ({
          reservation_id: reservation.id,
          guest_name: guest.name,
          guest_phone: guest.phone || null,
          companion_count: 0,
        }));
        
        const { error: guestsError } = await supabase
          .from("reservation_guests")
          .insert(guestsToInsert);
        
        if (guestsError) {
          console.error("Error inserting guests:", guestsError);
          // Don't throw - reservation was created successfully
        }
      }
      
      return { ...reservation, requiresApproval: commonArea?.requires_approval !== false };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["reservation-guests"] });
      toast({
        title: data.requiresApproval ? "Reserva enviada" : "Reserva confirmada",
        description: data.requiresApproval 
          ? "Sua reserva foi enviada para aprovação do síndico."
          : "Sua reserva foi aprovada automaticamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar reserva",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateReservationStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("reservations")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      const statusText = variables.status === "aprovada" ? "aprovada" : "rejeitada";
      toast({
        title: "Status atualizado",
        description: `A reserva foi ${statusText}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    reservations,
    isLoading,
    createReservation: createReservation.mutate,
    updateReservationStatus: updateReservationStatus.mutate,
    isCreating: createReservation.isPending,
    isUpdating: updateReservationStatus.isPending,
  };
};
