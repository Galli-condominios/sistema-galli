import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type VisitorAuth = Database["public"]["Tables"]["visitor_authorizations"]["Row"];
type VisitorAuthInsert = Database["public"]["Tables"]["visitor_authorizations"]["Insert"];

interface UseVisitorAuthOptions {
  condominiumId?: string | null;
}

export const useVisitorAuth = (options?: UseVisitorAuthOptions) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const condominiumId = options?.condominiumId;

  const { data: authorizations, isLoading } = useQuery({
    queryKey: ["visitor-authorizations", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("visitor_authorizations")
        .select(`
          *,
          units!inner(unit_number, condominium_id, condominiums(name)),
          residents!fk_visitor_auth_residents(user_id, profiles!fk_residents_profiles(full_name))
        `)
        .order("created_at", { ascending: false });
      
      // Filter by condominium if provided
      if (condominiumId) {
        query = query.eq("units.condominium_id", condominiumId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const createAuthorization = useMutation({
    mutationFn: async (newAuth: VisitorAuthInsert) => {
      const { data, error } = await supabase
        .from("visitor_authorizations")
        .insert(newAuth)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-authorizations"] });
      toast({
        title: "Autorização criada",
        description: "A autorização de visitante foi criada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar autorização",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAuthStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("visitor_authorizations")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-authorizations"] });
      toast({
        title: "Status atualizado",
        description: "O status da autorização foi atualizado.",
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
    authorizations,
    isLoading,
    createAuthorization: createAuthorization.mutate,
    updateAuthStatus: updateAuthStatus.mutate,
    isCreating: createAuthorization.isPending,
    isUpdating: updateAuthStatus.isPending,
  };
};
