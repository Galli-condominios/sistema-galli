import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCondominiumFilter } from "./useCondominiumFilter";

export interface CondominiumExpense {
  id: string;
  condominium_id: string;
  expense_month: number;
  expense_year: number;
  category: string;
  description: string;
  total_amount: number;
  invoice_url: string | null;
  invoice_number: string | null;
  supplier_name: string | null;
  is_apportioned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseApportionment {
  id: string;
  expense_id: string;
  unit_id: string;
  apportioned_amount: number;
  financial_charge_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  units?: {
    unit_number: string;
    block: string | null;
  };
}

export const useCondominiumExpenses = () => {
  const queryClient = useQueryClient();
  const { condominiumId, shouldFilter } = useCondominiumFilter();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["condominium-expenses", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("condominium_expenses")
        .select("*")
        .order("expense_year", { ascending: false })
        .order("expense_month", { ascending: false });

      if (shouldFilter && condominiumId) {
        query = query.eq("condominium_id", condominiumId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CondominiumExpense[];
    },
  });

  const createExpense = useMutation({
    mutationFn: async (expense: {
      condominium_id: string;
      expense_month: number;
      expense_year: number;
      category: string;
      description: string;
      total_amount: number;
      invoice_url?: string;
      invoice_number?: string;
      supplier_name?: string;
      created_by?: string;
    }) => {
      const { data, error } = await supabase
        .from("condominium_expenses")
        .insert([expense])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["condominium-expenses"] });
      toast.success("Despesa registrada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating expense:", error);
      toast.error("Erro ao registrar despesa");
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CondominiumExpense> & { id: string }) => {
      const { data, error } = await supabase
        .from("condominium_expenses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["condominium-expenses"] });
      toast.success("Despesa atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating expense:", error);
      toast.error("Erro ao atualizar despesa");
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("condominium_expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["condominium-expenses"] });
      toast.success("Despesa excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting expense:", error);
      toast.error("Erro ao excluir despesa");
    },
  });

  const calculateApportionment = useMutation({
    mutationFn: async (expenseId: string) => {
      // Buscar a despesa
      const { data: expense, error: expenseError } = await supabase
        .from("condominium_expenses")
        .select("*")
        .eq("id", expenseId)
        .single();

      if (expenseError) throw expenseError;

      // Buscar todas as unidades do condomínio
      const { data: units, error: unitsError } = await supabase
        .from("units")
        .select("id")
        .eq("condominium_id", expense.condominium_id);

      if (unitsError) throw unitsError;
      if (!units || units.length === 0) {
        throw new Error("Nenhuma unidade encontrada no condomínio");
      }

      // Calcular valor por unidade
      const apportionedAmount = expense.total_amount / units.length;

      // Criar rateios para cada unidade
      const apportionments = units.map((unit) => ({
        expense_id: expenseId,
        unit_id: unit.id,
        apportioned_amount: apportionedAmount,
        status: "pending",
      }));

      const { error: apportionmentError } = await supabase
        .from("expense_apportionments")
        .insert(apportionments);

      if (apportionmentError) throw apportionmentError;

      // Marcar despesa como rateada
      const { error: updateError } = await supabase
        .from("condominium_expenses")
        .update({ is_apportioned: true })
        .eq("id", expenseId);

      if (updateError) throw updateError;

      return { unitsCount: units.length, amountPerUnit: apportionedAmount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["condominium-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-apportionments"] });
      toast.success(`Rateio calculado: R$ ${data.amountPerUnit.toFixed(2)} por unidade (${data.unitsCount} unidades)`);
    },
    onError: (error: any) => {
      console.error("Error calculating apportionment:", error);
      toast.error(error.message || "Erro ao calcular rateio");
    },
  });

  const getApportionments = async (expenseId: string) => {
    const { data, error } = await supabase
      .from("expense_apportionments")
      .select(`
        *,
        units (
          unit_number,
          block
        )
      `)
      .eq("expense_id", expenseId);

    if (error) throw error;
    return data as ExpenseApportionment[];
  };

  const generateChargesFromApportionments = useMutation({
    mutationFn: async (expenseId: string) => {
      // Buscar a despesa
      const { data: expense, error: expenseError } = await supabase
        .from("condominium_expenses")
        .select("*")
        .eq("id", expenseId)
        .single();

      if (expenseError) throw expenseError;

      // Buscar os rateios pendentes
      const { data: apportionments, error: apportionmentsError } = await supabase
        .from("expense_apportionments")
        .select("*")
        .eq("expense_id", expenseId)
        .eq("status", "pending");

      if (apportionmentsError) throw apportionmentsError;
      if (!apportionments || apportionments.length === 0) {
        throw new Error("Nenhum rateio pendente encontrado");
      }

      // Criar cobranças para cada rateio
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(10); // Vencimento dia 10 do próximo mês

      const charges = apportionments.map((apportionment) => ({
        unit_id: apportionment.unit_id,
        condominium_id: expense.condominium_id,
        charge_type: "rateio",
        amount: apportionment.apportioned_amount,
        due_date: dueDate.toISOString().split("T")[0],
        description: `Rateio ${expense.category} - ${expense.description} (${expense.expense_month}/${expense.expense_year})`,
        status: "pendente",
        breakdown_details: {
          expense_id: expenseId,
          category: expense.category,
          total_expense: expense.total_amount,
          units_count: apportionments.length,
        },
      }));

      const { data: createdCharges, error: chargesError } = await supabase
        .from("financial_charges")
        .insert(charges)
        .select();

      if (chargesError) throw chargesError;

      // Atualizar os rateios com o ID da cobrança gerada
      for (let i = 0; i < apportionments.length; i++) {
        await supabase
          .from("expense_apportionments")
          .update({
            financial_charge_id: createdCharges[i].id,
            status: "generated",
          })
          .eq("id", apportionments[i].id);
      }

      return { chargesCount: createdCharges.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["condominium-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-apportionments"] });
      queryClient.invalidateQueries({ queryKey: ["financial-charges"] });
      toast.success(`${data.chargesCount} cobranças geradas com sucesso!`);
    },
    onError: (error: any) => {
      console.error("Error generating charges:", error);
      toast.error(error.message || "Erro ao gerar cobranças");
    },
  });

  return {
    expenses,
    isLoading,
    createExpense,
    updateExpense,
    deleteExpense,
    calculateApportionment,
    getApportionments,
    generateChargesFromApportionments,
  };
};
