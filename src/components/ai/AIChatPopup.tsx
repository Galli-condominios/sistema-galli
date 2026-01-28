import { useState, useRef, useEffect } from "react";
import { Bot, X, Minus, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { useAIConversations } from "@/hooks/useAIConversations";

const quickActions = [
  { emoji: "🔥", label: "Churrasqueira livre?", message: "A churrasqueira está disponível hoje?" },
  { emoji: "📦", label: "Encomendas?", message: "Tenho alguma encomenda pendente?" },
  { emoji: "💰", label: "Financeiro", message: "Qual minha situação financeira?" },
  { emoji: "📅", label: "Reservas", message: "Quais são minhas reservas?" }
];

export function AIChatPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    createConversation,
    updateConversationTitle
  } = useAIConversations();

  const {
    messages,
    isLoading,
    isLoadingHistory,
    sendMessage
  } = useAIAssistant(currentConversationId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as unread when new message arrives while closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        setHasUnread(true);
      }
    }
  }, [messages, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setHasUnread(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setIsMaximized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleRestore = () => {
    setIsMinimized(false);
    setHasUnread(false);
  };

  const handleSendMessage = async (content: string) => {
    let convId = currentConversationId;
    
    if (!convId) {
      const newConvId = await createConversation();
      if (newConvId) {
        convId = newConvId;
        setCurrentConversationId(newConvId);
      }
    }
    
    if (convId) {
      await sendMessage(content, convId);
      
      // Update title after first message
      if (messages.length === 0) {
        const title = content.length > 30 ? content.substring(0, 30) + "..." : content;
        updateConversationTitle(convId, title);
      }
    }
  };

  const handleQuickAction = (message: string) => {
    handleSendMessage(message);
  };

  // Minimized state - small bar
  if (isOpen && isMinimized) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full 
                   bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg cursor-pointer
                   hover:scale-105 transition-transform"
        onClick={handleRestore}
      >
        <Bot className="h-5 w-5" />
        <span className="font-medium text-sm">Galli</span>
        {hasUnread && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
    );
  }

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        data-tour="ai-chat-popup"
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full",
          "bg-gradient-to-br from-amber-500 to-amber-600",
          "shadow-lg hover:shadow-xl hover:scale-105 transition-all",
          "flex items-center justify-center",
          "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
        )}
        aria-label="Abrir assistente virtual"
      >
        <Bot className="h-7 w-7 text-white" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">!</span>
          </span>
        )}
      </button>
    );
  }

  // Chat popup
  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden",
        "bg-background border border-border rounded-2xl shadow-2xl",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        isMaximized
          ? "inset-4 md:inset-8"
          : "bottom-6 right-6 w-[360px] sm:w-[400px] h-[520px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-amber-500 to-amber-600">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Galli</h3>
            <p className="text-[11px] text-white/80">Assistente Virtual</p>
          </div>
        </div>
        
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
            onClick={handleMinimize}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 hidden sm:flex"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-muted-foreground text-sm">
              Carregando histórico...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-amber-500" />
            </div>
            <h4 className="font-semibold text-base mb-1">Olá! 👋</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Sou a Galli, sua assistente virtual. Como posso ajudar?
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="px-3 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="flex-shrink-0 text-xs h-8 px-3 hover:bg-amber-500/10 hover:border-amber-500/50"
                onClick={() => handleQuickAction(action.message)}
              >
                <span className="mr-1">{action.emoji}</span>
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        onSend={handleSendMessage}
        isLoading={isLoading}
        placeholder="Digite sua mensagem..."
      />
    </div>
  );
}
