import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCondominium } from "@/contexts/CondominiumContext";

export interface Unit {
  id: string;
  unit_number: string;
  block: string | null;
  floor: string | null;
  condominium_id: string;
  block_group_id: string | null;
  max_vehicles?: number | null;
  created_at: string;
  updated_at: string;
}

export const useUnits = () => {
  const { selectedCondominiumId, isAdmin } = useCondominium();
  const shouldFilter = isAdmin && !!selectedCondominiumId;

  const { data: units, isLoading } = useQuery({
    queryKey: ["units", selectedCondominiumId],
    queryFn: async () => {
      let query = supabase
        .from("units")
        .select("*")
        .order("unit_number", { ascending: true });

      if (shouldFilter && selectedCondominiumId) {
        query = query.eq("condominium_id", selectedCondominiumId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Unit[];
    },
  });

  return { units, isLoading };
};
