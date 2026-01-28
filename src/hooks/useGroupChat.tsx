import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoleContext } from "@/contexts/UserRoleContext";
import { toast } from "sonner";

export interface GroupMessage {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  reply_to_id: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  reply_to?: {
    id: string;
    content: string;
    author?: {
      full_name: string;
    };
  };
}

export interface ChatGroup {
  id: string;
  name: string;
  icon: string | null;
  message_permission: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string | null;
  unread_count?: number;
  condominiums?: Array<{
    id: string;
    name: string;
  }>;
}

export interface MessageRead {
  id: string;
  user_id: string;
  group_id: string;
  last_read_at: string;
  last_read_message_id: string | null;
}

export const useGroupChat = (selectedGroupId?: string) => {
  const { userId, hasRole } = useUserRoleContext();
  const queryClient = useQueryClient();
  const isAdmin = hasRole(["administrador", "sindico"]);

  // Fetch all groups the user has access to
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["chat-groups", userId],
    queryFn: async () => {
      // First get groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("block_groups")
        .select(`
          id,
          name,
          icon,
          message_permission,
          last_message_at,
          last_message_preview,
          created_at,
          updated_at
        `)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (groupsError) throw groupsError;
      if (!groupsData) return [];

      // Get condominiums for each group
      const groupIds = groupsData.map(g => g.id);
      const { data: groupCondos } = await supabase
        .from("block_group_condominiums")
        .select(`
          block_group_id,
          condominium_id,
          condominiums:condominium_id (
            id,
            name
          )
        `)
        .in("block_group_id", groupIds);

      // Get read status for current user
      const { data: readStatus } = await supabase
        .from("group_message_reads")
        .select("*")
        .eq("user_id", userId);

      // Get message counts per group after last read
      const groupsWithUnread = await Promise.all(
        groupsData.map(async (group) => {
          const userRead = readStatus?.find(r => r.group_id === group.id);
          const lastReadAt = userRead?.last_read_at || "1970-01-01";
          
          const { count } = await supabase
            .from("group_messages")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id)
            .gt("created_at", lastReadAt);

          const condos = groupCondos
            ?.filter(gc => gc.block_group_id === group.id)
            ?.map(gc => gc.condominiums as unknown as { id: string; name: string })
            .filter(Boolean) || [];

          return {
            ...group,
            unread_count: count || 0,
            condominiums: condos,
          };
        })
      );

      return groupsWithUnread as ChatGroup[];
    },
    enabled: !!userId,
  });

  // Fetch messages for selected group
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["group-messages", selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return [];

      const { data, error } = await supabase
        .from("group_messages")
        .select(`
          id,
          group_id,
          author_id,
          content,
          media_url,
          media_type,
          reply_to_id,
          created_at,
          updated_at
        `)
        .eq("group_id", selectedGroupId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      if (!data) return [];

      // Fetch author profiles
      const authorIds = [...new Set(data.map(m => m.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", authorIds);

      // Fetch reply_to messages
      const replyIds = data.filter(m => m.reply_to_id).map(m => m.reply_to_id);
      let replyMessages: any[] = [];
      if (replyIds.length > 0) {
        const { data: replies } = await supabase
          .from("group_messages")
          .select("id, content, author_id")
          .in("id", replyIds as string[]);
        replyMessages = replies || [];
      }

      return data.map(message => ({
        ...message,
        author: profiles?.find(p => p.id === message.author_id),
        reply_to: message.reply_to_id 
          ? (() => {
              const reply = replyMessages.find(r => r.id === message.reply_to_id);
              return reply ? {
                id: reply.id,
                content: reply.content,
                author: profiles?.find(p => p.id === reply.author_id),
              } : undefined;
            })()
          : undefined,
      })) as GroupMessage[];
    },
    enabled: !!selectedGroupId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      content, 
      replyToId,
      mediaUrl,
      mediaType 
    }: { 
      content: string; 
      replyToId?: string;
      mediaUrl?: string;
      mediaType?: string;
    }) => {
      if (!selectedGroupId || !userId) throw new Error("Missing required data");

      const { data, error } = await supabase
        .from("group_messages")
        .insert({
          group_id: selectedGroupId,
          author_id: userId,
          content,
          reply_to_id: replyToId || null,
          media_url: mediaUrl || null,
          media_type: mediaType || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-messages", selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("group_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-messages", selectedGroupId] });
      toast.success("Mensagem apagada");
    },
    onError: (error) => {
      console.error("Error deleting message:", error);
      toast.error("Erro ao apagar mensagem");
    },
  });

  // Mark group as read
  const markAsRead = useCallback(async (groupId: string) => {
    if (!userId) return;

    const { data: latestMessage } = await supabase
      .from("group_messages")
      .select("id")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const { error } = await supabase
      .from("group_message_reads")
      .upsert({
        user_id: userId,
        group_id: groupId,
        last_read_at: new Date().toISOString(),
        last_read_message_id: latestMessage?.id || null,
      }, {
        onConflict: "user_id,group_id",
      });

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
    }
  }, [userId, queryClient]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!selectedGroupId) return;

    const channel = supabase
      .channel(`group-messages-${selectedGroupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${selectedGroupId}`,
        },
        async (payload) => {
          // Fetch author profile for new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", payload.new.author_id)
            .single();

          const newMessage: GroupMessage = {
            ...payload.new as any,
            author: profile || undefined,
          };

          queryClient.setQueryData<GroupMessage[]>(
            ["group-messages", selectedGroupId],
            (old) => [...(old || []), newMessage]
          );

          // Also refresh groups list for updated preview
          queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${selectedGroupId}`,
        },
        (payload) => {
          queryClient.setQueryData<GroupMessage[]>(
            ["group-messages", selectedGroupId],
            (old) => (old || []).filter(m => m.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGroupId, queryClient]);

  // Get total unread count
  const totalUnreadCount = groups.reduce((acc, g) => acc + (g.unread_count || 0), 0);

  return {
    groups,
    messages,
    isLoadingGroups,
    isLoadingMessages,
    sendMessage: sendMessageMutation.mutate,
    deleteMessage: deleteMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
    markAsRead,
    totalUnreadCount,
    isAdmin,
  };
};
