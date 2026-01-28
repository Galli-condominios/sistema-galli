import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCondominiumFilter } from "./useCondominiumFilter";

export interface ElectricityReading {
  id: string;
  unit_id: string;
  condominium_id: string;
  garage_identifier: string;
  meter_serial: string | null;
  reading_month: number;
  reading_year: number;
  previous_reading: number;
  current_reading: number;
  consumption_kwh: number;
  rate_per_kwh: number;
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

export const useElectricityReadings = () => {
  const queryClient = useQueryClient();
  const { condominiumId, shouldFilter } = useCondominiumFilter();

  const { data: readings, isLoading } = useQuery({
    queryKey: ["electricity-readings", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("electricity_readings")
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
      return data as ElectricityReading[];
    },
  });

  const createReading = useMutation({
    mutationFn: async (reading: {
      unit_id: string;
      condominium_id: string;
      garage_identifier: string;
      meter_serial?: string;
      reading_month: number;
      reading_year: number;
      previous_reading: number;
      current_reading: number;
      rate_per_kwh: number;
      created_by?: string;
    }) => {
      const { data, error } = await supabase
        .from("electricity_readings")
        .insert([reading])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["electricity-readings"] });
      toast.success("Leitura de energia registrada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error creating electricity reading:", error);
      if (error.code === "23505") {
        toast.error("Já existe uma leitura para esta garagem neste mês/ano");
      } else {
        toast.error("Erro ao registrar leitura de energia");
      }
    },
  });

  const updateReading = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ElectricityReading> & { id: string }) => {
      const { data, error } = await supabase
        .from("electricity_readings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["electricity-readings"] });
      toast.success("Leitura atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating electricity reading:", error);
      toast.error("Erro ao atualizar leitura");
    },
  });

  const deleteReading = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("electricity_readings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["electricity-readings"] });
      toast.success("Leitura excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting electricity reading:", error);
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
