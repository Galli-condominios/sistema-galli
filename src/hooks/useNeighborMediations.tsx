import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCondominiumFilter } from "./useCondominiumFilter";
import { useUserRoleContext } from "@/contexts/UserRoleContext";

export type MediationStatus = 
  | "pending_response"
  | "responded" 
  | "awaiting_resolution"
  | "mediation_requested"
  | "mediation_in_progress"
  | "resolved"
  | "closed";

export interface NeighborMediation {
  id: string;
  condominium_id: string;
  requester_resident_id: string;
  target_unit_id: string;
  occurrence_datetime: string;
  complaint_reason: string;
  requested_action: string;
  status: MediationStatus;
  response_deadline: string;
  mediation_available_at: string;
  syndic_intervention_requested: boolean;
  syndic_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  requester_resident?: {
    id: string;
    user_id: string;
    profiles?: { full_name: string | null };
    units?: { unit_number: string; block: string | null };
  };
  target_unit?: {
    id: string;
    unit_number: string;
    block: string | null;
  };
  responses?: MediationResponse[];
}

export interface MediationResponse {
  id: string;
  mediation_id: string;
  responder_resident_id: string;
  response_content: string;
  created_at: string;
  responder_resident?: {
    id: string;
    profiles?: { full_name: string | null };
  };
}

interface CreateMediationInput {
  condominium_id: string;
  requester_resident_id: string;
  target_unit_id: string;
  occurrence_datetime: string;
  complaint_reason: string;
  requested_action: string;
}

export const useNeighborMediations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { condominiumId } = useCondominiumFilter();
  const { userId } = useUserRoleContext();

  // Fetch mediations
  const { data: mediations, isLoading } = useQuery({
    queryKey: ["neighbor-mediations", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("neighbor_mediations")
        .select(`
          *,
          target_unit:units!target_unit_id(id, unit_number, block)
        `)
        .order("created_at", { ascending: false });
      
      if (condominiumId) {
        query = query.eq("condominium_id", condominiumId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch responses for each mediation
      const mediationsWithResponses = await Promise.all(
        (data || []).map(async (mediation) => {
          const { data: responses } = await supabase
            .from("mediation_responses")
            .select("*")
            .eq("mediation_id", mediation.id)
            .order("created_at", { ascending: true });
          
          return {
            ...mediation,
            responses: responses || [],
          } as NeighborMediation;
        })
      );
      
      return mediationsWithResponses;
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!condominiumId) return;

    const channel = supabase
      .channel(`mediations-${condominiumId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "neighbor_mediations",
          filter: `condominium_id=eq.${condominiumId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["neighbor-mediations", condominiumId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mediation_responses",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["neighbor-mediations", condominiumId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [condominiumId, queryClient]);

  // Create mediation
  const createMediation = useMutation({
    mutationFn: async (input: CreateMediationInput) => {
      // Response deadline: 5 days from now
      const responseDeadline = new Date();
      responseDeadline.setDate(responseDeadline.getDate() + 5);

      // Mediation available at: 10 days from now
      const mediationAvailableAt = new Date();
      mediationAvailableAt.setDate(mediationAvailableAt.getDate() + 10);

      const { data, error } = await supabase
        .from("neighbor_mediations")
        .insert({
          ...input,
          status: "pending_response",
          response_deadline: responseDeadline.toISOString(),
          mediation_available_at: mediationAvailableAt.toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neighbor-mediations"] });
      toast({
        title: "Mediação criada",
        description: "O vizinho será notificado e terá 5 dias para responder.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar mediação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add response (for target unit residents)
  const addResponse = useMutation({
    mutationFn: async ({ mediationId, content, responderResidentId }: { 
      mediationId: string; 
      content: string;
      responderResidentId: string;
    }) => {
      // Add response
      const { error: responseError } = await supabase
        .from("mediation_responses")
        .insert({
          mediation_id: mediationId,
          responder_resident_id: responderResidentId,
          response_content: content,
        });
      
      if (responseError) throw responseError;

      // Update mediation status to "responded"
      const { error: updateError } = await supabase
        .from("neighbor_mediations")
        .update({ 
          status: "responded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", mediationId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neighbor-mediations"] });
      toast({
        title: "Resposta enviada",
        description: "Sua resposta foi registrada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao responder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Request syndic intervention
  const requestSyndicIntervention = useMutation({
    mutationFn: async (mediationId: string) => {
      const { error } = await supabase
        .from("neighbor_mediations")
        .update({ 
          status: "mediation_requested",
          syndic_intervention_requested: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mediationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neighbor-mediations"] });
      toast({
        title: "Síndico acionado",
        description: "O síndico será notificado para intervir na mediação.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update status (for admin/syndic)
  const updateStatus = useMutation({
    mutationFn: async ({ mediationId, status, syndicNotes }: { 
      mediationId: string; 
      status: MediationStatus;
      syndicNotes?: string;
    }) => {
      const updateData: Record<string, any> = { 
        status,
        updated_at: new Date().toISOString(),
      };
      
      if (syndicNotes !== undefined) {
        updateData.syndic_notes = syndicNotes;
      }
      
      if (status === "resolved" || status === "closed") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("neighbor_mediations")
        .update(updateData)
        .eq("id", mediationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neighbor-mediations"] });
      toast({
        title: "Status atualizado",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    mediations,
    isLoading,
    createMediation: createMediation.mutate,
    addResponse: addResponse.mutate,
    requestSyndicIntervention: requestSyndicIntervention.mutate,
    updateStatus: updateStatus.mutate,
    isCreating: createMediation.isPending,
    isResponding: addResponse.isPending,
  };
};
