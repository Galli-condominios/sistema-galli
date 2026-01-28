import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCondominiumFilter } from "@/hooks/useCondominiumFilter";

export interface KnowledgeBaseEntry {
  id: string;
  condominium_id: string | null;
  type: "faq" | "rule" | "info";
  question: string | null;
  answer: string;
  category: string | null;
  is_active: boolean;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseFormData {
  condominium_id?: string | null;
  type: "faq" | "rule" | "info";
  question?: string;
  answer: string;
  category?: string;
  is_active?: boolean;
  priority?: number;
}

export function useAIKnowledgeBase() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { condominiumId } = useCondominiumFilter();

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['ai-knowledge-base', condominiumId],
    queryFn: async () => {
      let query = supabase
        .from('ai_knowledge_base')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (condominiumId) {
        query = query.or(`condominium_id.eq.${condominiumId},condominium_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as KnowledgeBaseEntry[];
    }
  });

  const createEntry = useMutation({
    mutationFn: async (formData: KnowledgeBaseFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .insert({
          ...formData,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "FAQ adicionada com sucesso"
      });
      queryClient.invalidateQueries({ queryKey: ['ai-knowledge-base'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar FAQ",
        variant: "destructive"
      });
    }
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<KnowledgeBaseFormData> }) => {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "FAQ atualizada com sucesso"
      });
      queryClient.invalidateQueries({ queryKey: ['ai-knowledge-base'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar FAQ",
        variant: "destructive"
      });
    }
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "FAQ excluída com sucesso"
      });
      queryClient.invalidateQueries({ queryKey: ['ai-knowledge-base'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao excluir FAQ",
        variant: "destructive"
      });
    }
  });

  return {
    entries,
    isLoading,
    refetch,
    createEntry: createEntry.mutate,
    updateEntry: updateEntry.mutate,
    deleteEntry: deleteEntry.mutate,
    isCreating: createEntry.isPending,
    isUpdating: updateEntry.isPending,
    isDeleting: deleteEntry.isPending
  };
}
