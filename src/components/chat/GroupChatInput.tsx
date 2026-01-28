import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, X, Image as ImageIcon, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { GroupMessage } from "@/hooks/useGroupChat";

interface GroupChatInputProps {
  onSend: (content: string, replyToId?: string) => void;
  isSending?: boolean;
  replyTo?: GroupMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const GroupChatInput = ({
  onSend,
  isSending,
  replyTo,
  onCancelReply,
  disabled,
  placeholder = "Digite uma mensagem...",
}: GroupChatInputProps) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!message.trim() || isSending) return;

    onSend(message.trim(), replyTo?.id);
    setMessage("");
    onCancelReply?.();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-card">
      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">
              Respondendo a {replyTo.author?.full_name || "Usuário"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyTo.content}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2 p-3">
        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          disabled={disabled || isSending}
          title="Anexar arquivo (em breve)"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className={cn(
              "min-h-[44px] max-h-32 resize-none pr-10",
              "rounded-2xl border-muted-foreground/20",
              "focus:ring-1 focus:ring-primary"
            )}
            rows={1}
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending || disabled}
          size="icon"
          className={cn(
            "h-10 w-10 shrink-0 rounded-full",
            "bg-primary hover:bg-primary/90",
            "disabled:opacity-50"
          )}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
