import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCondominiumFilter } from "./useCondominiumFilter";
import type { Database } from "@/integrations/supabase/types";

type CommonArea = Database["public"]["Tables"]["common_areas"]["Row"];
type CommonAreaInsert = Database["public"]["Tables"]["common_areas"]["Insert"];
type CommonAreaUpdate = Database["public"]["Tables"]["common_areas"]["Update"];

export const useCommonAreas = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { condominiumId, shouldFilter } = useCondominiumFilter();

  const { data: commonAreas, isLoading } = useQuery({
    queryKey: ["common-areas", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("common_areas")
        .select("*, condominiums(name)")
        .order("name");
      
      if (shouldFilter && condominiumId) {
        query = query.eq("condominium_id", condominiumId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createCommonArea = useMutation({
    mutationFn: async (newArea: CommonAreaInsert) => {
      const { data, error } = await supabase
        .from("common_areas")
        .insert(newArea)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["common-areas"] });
      toast({
        title: "Área comum criada",
        description: "A área comum foi criada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar área comum",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCommonArea = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: CommonAreaUpdate }) => {
      const { data, error } = await supabase
        .from("common_areas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["common-areas"] });
      toast({
        title: "Área comum atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar área comum",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCommonArea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("common_areas")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["common-areas"] });
      toast({
        title: "Área comum excluída",
        description: "A área comum foi excluída com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir área comum",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    commonAreas,
    isLoading,
    createCommonArea: createCommonArea.mutate,
    updateCommonArea: updateCommonArea.mutate,
    deleteCommonArea: deleteCommonArea.mutate,
    isCreating: createCommonArea.isPending,
    isUpdating: updateCommonArea.isPending,
    isDeleting: deleteCommonArea.isPending,
  };
};
