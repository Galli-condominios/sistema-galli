import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCondominiumFilter } from "./useCondominiumFilter";
import { useUserRoleContext } from "@/contexts/UserRoleContext";

export interface FeedMessage {
  id: string;
  author_id: string;
  condominium_id: string;
  group_id: string | null;
  content: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  is_global: boolean;
  reactions: Record<string, string[]>; // emoji -> user_ids
  expires_at: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    email: string;
    raw_user_meta_data: { name?: string };
  };
  comments_count?: number;
}

export interface FeedComment {
  id: string;
  message_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    id: string;
    email: string;
    raw_user_meta_data: { name?: string };
  };
}

interface CreateMessageInput {
  content: string;
  condominium_id: string;
  group_id?: string | null;
  media_url?: string | null;
  media_type?: "image" | "video" | null;
  is_global?: boolean;
}

export const useFeedMessages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { condominiumId } = useCondominiumFilter();
  const { userId } = useUserRoleContext();

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ["feed-messages", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("feed_messages")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      
      if (condominiumId) {
        query = query.eq("condominium_id", condominiumId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch author info and comments count for each message
      const messagesWithDetails = await Promise.all(
        (data || []).map(async (message) => {
          // Get comments count
          const { count } = await supabase
            .from("feed_comments")
            .select("*", { count: "exact", head: true })
            .eq("message_id", message.id);
          
          return {
            ...message,
            reactions: message.reactions || {},
            comments_count: count || 0,
          } as FeedMessage;
        })
      );
      
      return messagesWithDetails;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!condominiumId) return;

    const channel = supabase
      .channel(`feed-messages-${condominiumId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feed_messages",
          filter: `condominium_id=eq.${condominiumId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["feed-messages", condominiumId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [condominiumId, queryClient]);

  // Create message
  const createMessage = useMutation({
    mutationFn: async (input: CreateMessageInput) => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours from now

      const { data, error } = await supabase
        .from("feed_messages")
        .insert({
          author_id: userId!,
          condominium_id: input.condominium_id,
          group_id: input.group_id || null,
          content: input.content,
          media_url: input.media_url || null,
          media_type: input.media_type || null,
          is_global: input.is_global || false,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-messages"] });
      toast({
        title: "Mensagem publicada",
        description: "Sua mensagem foi publicada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao publicar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete message
  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("feed_messages")
        .delete()
        .eq("id", messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-messages"] });
      toast({
        title: "Mensagem excluída",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle reaction
  const toggleReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const message = messages?.find(m => m.id === messageId);
      if (!message || !userId) throw new Error("Message not found");

      const currentReactions = { ...message.reactions };
      const usersForEmoji = currentReactions[emoji] || [];
      
      if (usersForEmoji.includes(userId)) {
        // Remove reaction
        currentReactions[emoji] = usersForEmoji.filter(id => id !== userId);
        if (currentReactions[emoji].length === 0) {
          delete currentReactions[emoji];
        }
      } else {
        // Add reaction
        currentReactions[emoji] = [...usersForEmoji, userId];
      }

      const { error } = await supabase
        .from("feed_messages")
        .update({ reactions: currentReactions })
        .eq("id", messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-messages"] });
    },
  });

  return {
    messages,
    isLoading,
    createMessage: createMessage.mutate,
    deleteMessage: deleteMessage.mutate,
    toggleReaction: toggleReaction.mutate,
    isCreating: createMessage.isPending,
    isDeleting: deleteMessage.isPending,
  };
};

// Hook for comments
export const useFeedComments = (messageId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userId } = useUserRoleContext();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["feed-comments", messageId],
    queryFn: async () => {
      if (!messageId) return [];
      
      const { data, error } = await supabase
        .from("feed_comments")
        .select("*")
        .eq("message_id", messageId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as FeedComment[];
    },
    enabled: !!messageId,
  });

  // Subscribe to realtime comments
  useEffect(() => {
    if (!messageId) return;

    const channel = supabase
      .channel(`feed-comments-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feed_comments",
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["feed-comments", messageId] });
          queryClient.invalidateQueries({ queryKey: ["feed-messages"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, queryClient]);

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!messageId || !userId) throw new Error("Invalid state");

      const { data, error } = await supabase
        .from("feed_comments")
        .insert({
          message_id: messageId,
          author_id: userId,
          content,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-comments", messageId] });
      queryClient.invalidateQueries({ queryKey: ["feed-messages"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao comentar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("feed_comments")
        .delete()
        .eq("id", commentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-comments", messageId] });
      queryClient.invalidateQueries({ queryKey: ["feed-messages"] });
    },
  });

  return {
    comments,
    isLoading,
    addComment: addComment.mutate,
    deleteComment: deleteComment.mutate,
    isAdding: addComment.isPending,
  };
};
