import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCondominiumFilter } from "./useCondominiumFilter";

export interface UtilityRate {
  id: string;
  condominium_id: string;
  utility_type: "gas" | "water" | "electricity";
  rate_per_unit: number;
  unit_label: string;
  effective_date: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useUtilityRates = () => {
  const queryClient = useQueryClient();
  const { condominiumId, shouldFilter } = useCondominiumFilter();

  const { data: rates, isLoading } = useQuery({
    queryKey: ["utility-rates", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("utility_rates")
        .select("*")
        .order("effective_date", { ascending: false });

      if (shouldFilter && condominiumId) {
        query = query.eq("condominium_id", condominiumId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UtilityRate[];
    },
  });

  const getActiveRate = (utilityType: "gas" | "water" | "electricity") => {
    if (!rates) return null;
    return rates.find(
      (rate) => rate.utility_type === utilityType && rate.is_active
    );
  };

  const createRate = useMutation({
    mutationFn: async (rate: {
      condominium_id: string;
      utility_type: "gas" | "water" | "electricity";
      rate_per_unit: number;
      unit_label: string;
      effective_date: string;
      created_by?: string;
    }) => {
      // Desativar tarifas anteriores do mesmo tipo
      await supabase
        .from("utility_rates")
        .update({ is_active: false })
        .eq("condominium_id", rate.condominium_id)
        .eq("utility_type", rate.utility_type);

      const { data, error } = await supabase
        .from("utility_rates")
        .insert([{ ...rate, is_active: true }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utility-rates"] });
      toast.success("Tarifa registrada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating utility rate:", error);
      toast.error("Erro ao registrar tarifa");
    },
  });

  const updateRate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UtilityRate> & { id: string }) => {
      const { data, error } = await supabase
        .from("utility_rates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utility-rates"] });
      toast.success("Tarifa atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating utility rate:", error);
      toast.error("Erro ao atualizar tarifa");
    },
  });

  const deleteRate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("utility_rates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utility-rates"] });
      toast.success("Tarifa excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting utility rate:", error);
      toast.error("Erro ao excluir tarifa");
    },
  });

  return {
    rates,
    isLoading,
    getActiveRate,
    createRate,
    updateRate,
    deleteRate,
  };
};
