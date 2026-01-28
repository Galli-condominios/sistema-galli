import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCondominiumFilter } from "./useCondominiumFilter";

export interface WaterReading {
  id: string;
  unit_id: string;
  condominium_id: string;
  reading_month: number;
  reading_year: number;
  previous_reading: number;
  current_reading: number;
  consumption_m3: number;
  rate_per_m3: number;
  calculated_amount: number;
  financial_charge_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  units?: {
    unit_number: string;
    block: string | null;
    floor: string | null;
  };
}

export const useWaterReadings = () => {
  const queryClient = useQueryClient();
  const { condominiumId, shouldFilter } = useCondominiumFilter();

  const { data: readings, isLoading } = useQuery({
    queryKey: ["water-readings", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("water_readings")
        .select(`
          *,
          units (
            unit_number,
            block,
            floor
          )
        `)
        .order("reading_year", { ascending: false })
        .order("reading_month", { ascending: false });

      if (shouldFilter && condominiumId) {
        query = query.eq("condominium_id", condominiumId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WaterReading[];
    },
  });

  const createReading = useMutation({
    mutationFn: async (reading: {
      unit_id: string;
      condominium_id: string;
      reading_month: number;
      reading_year: number;
      previous_reading: number;
      current_reading: number;
      rate_per_m3: number;
      created_by?: string;
    }) => {
      const { data, error } = await supabase
        .from("water_readings")
        .insert([reading])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["water-readings"] });
      toast.success("Leitura de água registrada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error creating water reading:", error);
      if (error.code === "23505") {
        toast.error("Já existe uma leitura para esta unidade neste mês/ano");
      } else {
        toast.error("Erro ao registrar leitura de água");
      }
    },
  });

  const updateReading = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WaterReading> & { id: string }) => {
      const { data, error } = await supabase
        .from("water_readings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["water-readings"] });
      toast.success("Leitura atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating water reading:", error);
      toast.error("Erro ao atualizar leitura");
    },
  });

  const deleteReading = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("water_readings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["water-readings"] });
      toast.success("Leitura excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting water reading:", error);
      toast.error("Erro ao excluir leitura");
    },
  });

  return {
    readings,
    isLoading,
    createReading,
    updateReading,
    deleteReading,
  };
};
