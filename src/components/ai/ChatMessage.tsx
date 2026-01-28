import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import type { Message } from "@/hooks/useAIAssistant";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  
  return (
    <div className={cn(
      "flex gap-2 md:gap-3 animate-fade-in",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-gradient-to-br from-amber-500 to-amber-600 text-white"
      )}>
        {isUser ? <User className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />}
      </div>
      
      <div className={cn(
        "flex flex-col max-w-[85%] md:max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "px-3 py-2 md:px-4 md:py-3 rounded-2xl",
          isUser 
            ? "bg-primary text-primary-foreground rounded-br-md" 
            : "bg-card border border-border rounded-bl-md"
        )}>
          <div className={cn(
            "prose prose-sm max-w-none text-sm md:text-base",
            isUser ? "prose-invert" : "dark:prose-invert"
          )}>
            {message.content ? (
              <div 
                className="whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(formatMessage(message.content), {
                    ALLOWED_TAGS: ['strong', 'em', 'pre', 'code', 'li', 'br'],
                    ALLOWED_ATTR: ['class'],
                  })
                }} 
              />
            ) : message.isStreaming ? (
              <TypingDots />
            ) : null}
          </div>
        </div>
        
        <span className="text-[10px] md:text-xs text-muted-foreground mt-1 px-1">
          {message.timestamp.toLocaleTimeString("pt-BR", { 
            hour: "2-digit", 
            minute: "2-digit" 
          })}
        </span>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 py-1">
      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function formatMessage(content: string): string {
  // Convert markdown-like syntax to HTML
  return content
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Code blocks
    .replace(/```([\s\S]*?)```/g, "<pre class='bg-muted p-2 rounded text-xs overflow-x-auto'><code>$1</code></pre>")
    // Inline code
    .replace(/`(.*?)`/g, "<code class='bg-muted px-1 rounded text-xs'>$1</code>")
    // Bullet lists
    .replace(/^- (.*?)$/gm, "<li class='ml-4'>$1</li>")
    // Numbered lists
    .replace(/^\d+\. (.*?)$/gm, "<li class='ml-4 list-decimal'>$1</li>")
    // Line breaks
    .replace(/\n/g, "<br />");
}
