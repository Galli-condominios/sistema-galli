import { useEffect, useRef, useState } from "react";
import { Bot, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { useAIConversations } from "@/hooks/useAIConversations";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { ChatInput } from "@/components/ai/ChatInput";
import { QuickActions } from "@/components/ai/QuickActions";
import { ConversationSidebar } from "@/components/ai/ConversationSidebar";
import { MobileConversationSheet } from "@/components/ai/MobileConversationSheet";
import DashboardLayout from "@/components/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";

export default function AIAssistant() {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { 
    conversations, 
    currentConversationId, 
    setCurrentConversationId,
    createConversation,
    deleteConversation,
    updateConversationTitle
  } = useAIConversations();
  
  const { messages, isLoading, isLoadingHistory, sendMessage, clearMessages } = useAIAssistant(currentConversationId);
  const { role, userName } = useUserRole();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const placeholders: Record<string, string> = {
    morador: "Pergunte sobre cobranças, reservas, encomendas...",
    administrador: "Pergunte sobre finanças, moradores, ocorrências...",
    sindico: "Pergunte sobre finanças, moradores, ocorrências...",
    porteiro: "Pergunte sobre visitantes, encomendas, unidades..."
  };

  const handleSendMessage = async (content: string) => {
    if (!currentConversationId) {
      // Create new conversation with first message as title
      const newId = await createConversation(content);
      if (newId) {
        sendMessage(content, newId);
      }
    } else {
      sendMessage(content);
      // Update title if it's the first message
      if (messages.length === 0) {
        updateConversationTitle(
          currentConversationId, 
          content.slice(0, 50) + (content.length > 50 ? "..." : "")
        );
      }
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    clearMessages();
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-7rem)] w-full flex animate-fade-in">
        {/* Desktop Sidebar - hidden on mobile */}
        {!isMobile && (
          <ConversationSidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelect={setCurrentConversationId}
            onNew={handleNewConversation}
            onDelete={handleDeleteConversation}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-card/50 backdrop-blur-sm gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              {/* Mobile conversation sheet trigger */}
              <MobileConversationSheet
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelect={setCurrentConversationId}
                onNew={handleNewConversation}
                onDelete={handleDeleteConversation}
              />
              
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-base md:text-lg">Galli</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">Assistente Virtual</p>
              </div>
            </div>
            
            {currentConversationId && messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewConversation}
                className="text-muted-foreground hover:text-primary shrink-0"
              >
                <Sparkles className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Nova conversa</span>
              </Button>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="p-3 md:p-4 space-y-3 md:space-y-4">
              {isLoadingHistory ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-3/4" />
                  <Skeleton className="h-16 w-2/3 ml-auto" />
                  <Skeleton className="h-24 w-3/4" />
                </div>
              ) : messages.length === 0 ? (
                <EmptyState userName={userName} />
              ) : (
                messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))
              )}
              {/* Auto-scroll anchor */}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          {!currentConversationId && messages.length === 0 && (
            <QuickActions 
              role={role || "morador"} 
              onSelect={handleSendMessage}
              disabled={isLoading}
            />
          )}

          {/* Input */}
          <ChatInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            placeholder={placeholders[role || "morador"]}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

function EmptyState({ userName }: { userName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] md:min-h-[300px] text-center px-4">
      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center mb-3 md:mb-4">
        <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
      </div>
      <h2 className="text-lg md:text-xl font-semibold mb-2">
        Olá, {userName}!
      </h2>
      <p className="text-sm md:text-base text-muted-foreground max-w-md">
        Sou o Galli, seu assistente virtual. Posso ajudar com consultas sobre cobranças, 
        reservas, ocorrências e muito mais.
      </p>
    </div>
  );
}
