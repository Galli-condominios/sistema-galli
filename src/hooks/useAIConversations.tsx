import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useAIConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Create new conversation
  const createConversation = useCallback(async (firstMessage?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const title = firstMessage 
        ? firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "")
        : "Nova conversa";

      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, title })
        .select("id, title, created_at, updated_at")
        .single();

      if (error) throw error;
      
      // Prevent duplicate conversations in state
      setConversations(prev => {
        if (prev.some(c => c.id === data.id)) return prev;
        return [data, ...prev];
      });
      setCurrentConversationId(data.id);
      return data.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a conversa",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  // Delete conversation
  const deleteConversation = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("ai_conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conversa",
        variant: "destructive"
      });
    }
  }, [currentConversationId, toast]);

  // Update conversation title
  const updateConversationTitle = useCallback(async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from("ai_conversations")
        .update({ title })
        .eq("id", id);

      if (error) throw error;
      
      setConversations(prev => prev.map(c => 
        c.id === id ? { ...c, title } : c
      ));
    } catch (error) {
      console.error("Error updating conversation title:", error);
    }
  }, []);

  return {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    isLoading,
    createConversation,
    deleteConversation,
    updateConversationTitle,
    refetch: fetchConversations
  };
}
