import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCommonAreaReservations = (commonAreaId?: string) => {
  return useQuery({
    queryKey: ["common-area-reservations", commonAreaId],
    queryFn: async () => {
      let query = supabase
        .from("reservations")
        .select(`
          id,
          reservation_date,
          start_time,
          end_time,
          status,
          guests_count,
          residents!fk_reservations_residents(
            user_id,
            profiles!fk_residents_profiles(full_name)
          ),
          units(unit_number)
        `)
        .in("status", ["aprovada", "pendente"])
        .order("reservation_date", { ascending: true });

      if (commonAreaId) {
        query = query.eq("common_area_id", commonAreaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!commonAreaId,
  });
};
