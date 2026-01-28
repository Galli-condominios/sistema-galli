import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreVertical, Reply, Trash2, Check, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { GroupMessage } from "@/hooks/useGroupChat";

interface GroupChatMessageProps {
  message: GroupMessage;
  isOwn: boolean;
  onReply?: (message: GroupMessage) => void;
  onDelete?: (messageId: string) => void;
  canDelete?: boolean;
}

export const GroupChatMessage = ({
  message,
  isOwn,
  onReply,
  onDelete,
  canDelete,
}: GroupChatMessageProps) => {
  const initials = message.author?.full_name
    ? message.author.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const formattedTime = format(new Date(message.created_at), "HH:mm", {
    locale: ptBR,
  });

  const formattedDate = format(new Date(message.created_at), "d 'de' MMM", {
    locale: ptBR,
  });

  return (
    <div
      className={cn(
        "flex gap-2 group px-4 py-1 hover:bg-accent/30 transition-colors",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      {!isOwn && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          {message.author?.avatar_url && (
            <AvatarImage src={message.author.avatar_url} />
          )}
          <AvatarFallback className="text-xs bg-primary/20 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          "max-w-[75%] min-w-[120px]",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {/* Reply Preview */}
        {message.reply_to && (
          <div
            className={cn(
              "text-xs px-3 py-1.5 mb-1 rounded-t-lg border-l-2",
              isOwn
                ? "bg-primary/20 border-primary/50 ml-auto"
                : "bg-muted border-muted-foreground/30"
            )}
          >
            <span className="font-medium text-muted-foreground">
              {message.reply_to.author?.full_name || "Usuário"}
            </span>
            <p className="text-muted-foreground truncate">
              {message.reply_to.content}
            </p>
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-2 relative",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          )}
        >
          {/* Author name (for non-own messages) */}
          {!isOwn && (
            <p className="text-xs font-medium text-primary mb-0.5">
              {message.author?.full_name || "Usuário desconhecido"}
            </p>
          )}

          {/* Media */}
          {message.media_url && (
            <div className="mb-2">
              {message.media_type === "image" ? (
                <img
                  src={message.media_url}
                  alt="Mídia"
                  className="max-w-full rounded-lg max-h-64 object-cover"
                />
              ) : message.media_type === "video" ? (
                <video
                  src={message.media_url}
                  controls
                  className="max-w-full rounded-lg max-h-64"
                />
              ) : (
                <a
                  href={message.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline"
                >
                  📎 Arquivo anexo
                </a>
              )}
            </div>
          )}

          {/* Message Content */}
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {/* Time and Status */}
          <div
            className={cn(
              "flex items-center gap-1 mt-1",
              isOwn ? "justify-end" : "justify-start"
            )}
          >
            <span
              className={cn(
                "text-[10px]",
                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {formattedTime}
            </span>
            {isOwn && (
              <CheckCheck
                className={cn(
                  "h-3 w-3",
                  "text-primary-foreground/70"
                )}
              />
            )}
          </div>
        </div>
      </div>

      {/* Actions Menu */}
      <div
        className={cn(
          "opacity-0 group-hover:opacity-100 transition-opacity self-center",
          isOwn ? "order-first" : ""
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isOwn ? "end" : "start"}>
            {onReply && (
              <DropdownMenuItem onClick={() => onReply(message)}>
                <Reply className="h-4 w-4 mr-2" />
                Responder
              </DropdownMenuItem>
            )}
            {canDelete && onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(message.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Apagar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
