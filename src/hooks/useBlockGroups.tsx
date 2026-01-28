import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCondominiumFilter } from "./useCondominiumFilter";

export type MessagePermission = "members" | "admins_only" | "specific_users";

export interface BlockGroup {
  id: string;
  condominium_id: string;
  name: string;
  block: string | null;
  is_default: boolean;
  message_permission: MessagePermission;
  created_at: string;
  updated_at: string;
  condominiums?: { name: string };
  units_count?: number;
  members?: { user_id: string }[];
}

export interface BlockGroupInsert {
  condominium_id: string;
  name: string;
  block?: string | null;
  is_default?: boolean;
  message_permission?: MessagePermission;
}

export interface BlockGroupUpdate {
  name?: string;
  block?: string | null;
  is_default?: boolean;
  message_permission?: MessagePermission;
}

export const useBlockGroups = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { condominiumId, shouldFilter } = useCondominiumFilter();

  const { data: blockGroups, isLoading } = useQuery({
    queryKey: ["block-groups", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("block_groups")
        .select("*, condominiums(name)")
        .order("name");
      
      if (shouldFilter && condominiumId) {
        query = query.eq("condominium_id", condominiumId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Get unit counts for each group
      const groupsWithCounts = await Promise.all(
        (data || []).map(async (group) => {
          const { count } = await supabase
            .from("units")
            .select("*", { count: "exact", head: true })
            .eq("block_group_id", group.id);
          
          return {
            ...group,
            units_count: count || 0,
          } as BlockGroup;
        })
      );
      
      return groupsWithCounts;
    },
  });

  const createBlockGroup = useMutation({
    mutationFn: async (newGroup: BlockGroupInsert) => {
      const { data, error } = await supabase
        .from("block_groups")
        .insert(newGroup)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["block-groups"] });
      toast({
        title: "Grupo criado",
        description: "O grupo foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar grupo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBlockGroup = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: BlockGroupUpdate }) => {
      const { data, error } = await supabase
        .from("block_groups")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["block-groups"] });
      toast({
        title: "Grupo atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar grupo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBlockGroup = useMutation({
    mutationFn: async (id: string) => {
      // First, unassign all units from this group
      await supabase
        .from("units")
        .update({ block_group_id: null })
        .eq("block_group_id", id);
      
      const { error } = await supabase
        .from("block_groups")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["block-groups"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({
        title: "Grupo excluído",
        description: "O grupo foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir grupo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignUnitsToGroup = useMutation({
    mutationFn: async ({ groupId, unitIds }: { groupId: string; unitIds: string[] }) => {
      const { error } = await supabase
        .from("units")
        .update({ block_group_id: groupId })
        .in("id", unitIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["block-groups"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({
        title: "Unidades atribuídas",
        description: "As unidades foram atribuídas ao grupo com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atribuir unidades",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeUnitsFromGroup = useMutation({
    mutationFn: async (unitIds: string[]) => {
      const { error } = await supabase
        .from("units")
        .update({ block_group_id: null })
        .in("id", unitIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["block-groups"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({
        title: "Unidades removidas",
        description: "As unidades foram removidas do grupo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover unidades",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    blockGroups,
    isLoading,
    createBlockGroup: createBlockGroup.mutate,
    updateBlockGroup: updateBlockGroup.mutate,
    deleteBlockGroup: deleteBlockGroup.mutate,
    assignUnitsToGroup: assignUnitsToGroup.mutate,
    removeUnitsFromGroup: removeUnitsFromGroup.mutate,
    isCreating: createBlockGroup.isPending,
    isUpdating: updateBlockGroup.isPending,
    isDeleting: deleteBlockGroup.isPending,
    isAssigning: assignUnitsToGroup.isPending,
  };
};
