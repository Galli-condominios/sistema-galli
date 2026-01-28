import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCondominiumFilter } from "./useCondominiumFilter";
import type { Database } from "@/integrations/supabase/types";

type MaintenanceRequest = Database["public"]["Tables"]["maintenance_requests"]["Row"];
type MaintenanceRequestInsert = Database["public"]["Tables"]["maintenance_requests"]["Insert"];

export const useMaintenanceRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { condominiumId, shouldFilter } = useCondominiumFilter();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["maintenance-requests", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("maintenance_requests")
        .select(`
          *,
          units(unit_number, condominiums(name)),
          residents!fk_maintenance_residents(
            user_id,
            profiles!fk_residents_profiles(full_name)
          ),
          maintenance_request_updates(
            *,
            profiles!fk_maintenance_updates_updated_by(full_name)
          )
        `)
        .order("created_at", { ascending: false });
      
      if (shouldFilter && condominiumId) {
        query = query.eq("condominium_id", condominiumId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createRequest = useMutation({
    mutationFn: async (newRequest: MaintenanceRequestInsert) => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .insert(newRequest)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      toast({
        title: "Ocorrência criada",
        description: "Sua solicitação foi registrada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar ocorrência",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRequestStatus = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      comment 
    }: { 
      id: string; 
      status: string; 
      comment?: string;
    }) => {
      // Get current status
      const { data: currentData } = await supabase
        .from("maintenance_requests")
        .select("status")
        .eq("id", id)
        .single();

      // Update the request
      const updates: any = { status };
      if (status === "concluido") {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("maintenance_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;

      // Add update history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("maintenance_request_updates")
          .insert({
            request_id: id,
            updated_by: user.id,
            old_status: currentData?.status,
            new_status: status,
            comment: comment || null,
          });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      toast({
        title: "Status atualizado",
        description: "O status da ocorrência foi atualizado.",
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

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      toast({
        title: "Ocorrência excluída",
        description: "A ocorrência foi excluída com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir ocorrência",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    requests,
    isLoading,
    createRequest: createRequest.mutate,
    updateRequestStatus: updateRequestStatus.mutate,
    deleteRequest: deleteRequest.mutate,
    isCreating: createRequest.isPending,
    isUpdating: updateRequestStatus.isPending,
    isDeleting: deleteRequest.isPending,
  };
};
