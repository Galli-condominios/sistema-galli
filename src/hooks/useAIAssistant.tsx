import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export function useAIAssistant(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { toast } = useToast();
  
  // Refs to prevent race conditions
  const isStreamingRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const currentConversationRef = useRef<string | null>(null);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load messages when conversation changes (only if not streaming)
  useEffect(() => {
    // Update current conversation ref
    currentConversationRef.current = conversationId;
    
    if (!conversationId) {
      setMessages([]);
      return;
    }

    // Don't load if currently streaming - wait for streaming to finish
    if (isStreamingRef.current) {
      return;
    }

    const loadMessages = async () => {
      setIsLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from("ai_messages")
          .select("id, role, content, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Only update if still the same conversation and not streaming
        if (currentConversationRef.current === conversationId && !isStreamingRef.current) {
          setMessages(
            (data || []).map(m => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              timestamp: new Date(m.created_at)
            }))
          );
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadMessages();
  }, [conversationId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const sendMessage = useCallback(async (content: string, convId?: string) => {
    if (!content.trim() || isLoading) return;

    const targetConversationId = convId || conversationId;
    if (!targetConversationId) return;

    // Set streaming flag to prevent loadMessages from overwriting
    isStreamingRef.current = true;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message to database
    try {
      await supabase.from("ai_messages").insert({
        conversation_id: targetConversationId,
        role: "user",
        content: userMessage.content
      });
    } catch (error) {
      console.error("Error saving user message:", error);
    }

    // Prepare messages for API using ref to get current messages
    const currentMessages = messagesRef.current;
    const apiMessages = [...currentMessages, userMessage].map(m => ({
      role: m.role,
      content: m.content
    }));

    const assistantMessageId = crypto.randomUUID();
    let assistantContent = "";

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true
    }]);

    try {
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ messages: apiMessages })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          throw new Error(errorData.error || "Limite de requisições excedido. Aguarde alguns instantes.");
        }
        if (response.status === 402) {
          throw new Error(errorData.error || "Créditos insuficientes.");
        }
        throw new Error(errorData.error || "Erro ao comunicar com o assistente");
      }

      if (!response.body) {
        throw new Error("Resposta vazia");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: assistantContent }
                  : m
              ));
            }
          } catch {
            // Incomplete JSON, put back and wait
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
            }
          } catch { /* ignore */ }
        }
      }

      // Mark streaming as complete
      setMessages(prev => prev.map(m => 
        m.id === assistantMessageId 
          ? { ...m, content: assistantContent, isStreaming: false }
          : m
      ));

      // Save assistant message to database
      try {
        await supabase.from("ai_messages").insert({
          conversation_id: targetConversationId,
          role: "assistant",
          content: assistantContent
        });
      } catch (error) {
        console.error("Error saving assistant message:", error);
      }

    } catch (error) {
      console.error("AI Assistant error:", error);
      
      // Remove empty assistant message on error
      setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
      
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar mensagem",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      isStreamingRef.current = false;
    }
  }, [isLoading, toast, conversationId]);

  return {
    messages,
    isLoading,
    isLoadingHistory,
    sendMessage,
    clearMessages
  };
}
