import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCondominiumFilter } from "./useCondominiumFilter";
import { Json } from "@/integrations/supabase/types";

export interface FinancialCharge {
  id: string;
  unit_id: string;
  condominium_id: string;
  charge_type: string;
  amount: number;
  due_date: string;
  description: string | null;
  status: string;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  breakdown_details?: Json | null;
  units?: {
    unit_number: string;
    block: string | null;
    floor: string | null;
  };
}

export const useFinancialCharges = () => {
  const queryClient = useQueryClient();
  const { condominiumId, shouldFilter } = useCondominiumFilter();

  const { data: charges, isLoading, refetch } = useQuery({
    queryKey: ["financial-charges", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("financial_charges")
        .select(`
          *,
          units (
            unit_number,
            block,
            floor
          )
        `)
        .order("due_date", { ascending: false });

      if (shouldFilter && condominiumId) {
        query = query.eq("condominium_id", condominiumId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FinancialCharge[];
    },
  });

  const createCharge = useMutation({
    mutationFn: async (charge: Omit<FinancialCharge, "id" | "created_at" | "updated_at" | "units">) => {
      const { data, error } = await supabase
        .from("financial_charges")
        .insert([charge])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-charges"] });
      toast.success("Lançamento criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating charge:", error);
      toast.error("Erro ao criar lançamento financeiro");
    },
  });

  const updateCharge = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FinancialCharge> & { id: string }) => {
      const { data, error } = await supabase
        .from("financial_charges")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-charges"] });
      toast.success("Lançamento atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating charge:", error);
      toast.error("Erro ao atualizar lançamento");
    },
  });

  const deleteCharge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_charges")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-charges"] });
      toast.success("Lançamento excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting charge:", error);
      toast.error("Erro ao excluir lançamento");
    },
  });

  return {
    charges,
    isLoading,
    refetch,
    createCharge,
    updateCharge,
    deleteCharge,
  };
};

export const useResidentCharges = (unitId?: string) => {
  const { data: charges, isLoading } = useQuery({
    queryKey: ["resident-charges", unitId],
    queryFn: async () => {
      if (!unitId) return [];
      
      const { data, error } = await supabase
        .from("financial_charges")
        .select("*")
        .eq("unit_id", unitId)
        .order("due_date", { ascending: false });

      if (error) throw error;
      return data as FinancialCharge[];
    },
    enabled: !!unitId,
  });

  return { charges, isLoading };
};

export const useOverdueCharges = () => {
  const { condominiumId, shouldFilter } = useCondominiumFilter();

  const { data: overdueCharges, isLoading } = useQuery({
    queryKey: ["overdue-charges", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("financial_charges")
        .select(`
          *,
          units (
            unit_number,
            block,
            floor
          )
        `)
        .eq("status", "atrasado")
        .order("due_date", { ascending: true });

      if (shouldFilter && condominiumId) {
        query = query.eq("condominium_id", condominiumId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FinancialCharge[];
    },
  });

  return { overdueCharges, isLoading };
};
