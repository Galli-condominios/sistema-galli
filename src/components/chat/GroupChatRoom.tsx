import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GroupChatMessage } from "./GroupChatMessage";
import { GroupChatInput } from "./GroupChatInput";
import { GroupChatHeader } from "./GroupChatHeader";
import { ChatGroup, GroupMessage } from "@/hooks/useGroupChat";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GroupChatRoomProps {
  group: ChatGroup;
  messages: GroupMessage[];
  currentUserId: string;
  isLoading?: boolean;
  isSending?: boolean;
  onSendMessage: (content: string, replyToId?: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onBack?: () => void;
  showBackButton?: boolean;
  isAdmin?: boolean;
}

const DateSeparator = ({ date }: { date: Date }) => {
  let label = format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  if (isToday(date)) {
    label = "Hoje";
  } else if (isYesterday(date)) {
    label = "Ontem";
  }

  return (
    <div className="flex items-center justify-center py-4">
      <span className="px-3 py-1 text-xs bg-muted rounded-full text-muted-foreground">
        {label}
      </span>
    </div>
  );
};

export const GroupChatRoom = ({
  group,
  messages,
  currentUserId,
  isLoading,
  isSending,
  onSendMessage,
  onDeleteMessage,
  onBack,
  showBackButton,
  isAdmin,
}: GroupChatRoomProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (content: string, replyToId?: string) => {
    onSendMessage(content, replyToId);
    setReplyTo(null);
  };

  // Group messages by date
  const groupedMessages: { date: Date; messages: GroupMessage[] }[] = [];
  let currentDate: Date | null = null;

  messages.forEach((message) => {
    const messageDate = new Date(message.created_at);
    if (!currentDate || !isSameDay(currentDate, messageDate)) {
      currentDate = messageDate;
      groupedMessages.push({ date: messageDate, messages: [message] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message);
    }
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <GroupChatHeader
        group={group}
        onBack={onBack}
        showBackButton={showBackButton}
      />

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <p className="text-center font-medium">Nenhuma mensagem ainda</p>
            <p className="text-sm text-center mt-1">
              Seja o primeiro a enviar uma mensagem!
            </p>
          </div>
        ) : (
          <div className="py-2">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                <DateSeparator date={group.date} />
                {group.messages.map((message) => (
                  <GroupChatMessage
                    key={message.id}
                    message={message}
                    isOwn={message.author_id === currentUserId}
                    onReply={setReplyTo}
                    onDelete={onDeleteMessage}
                    canDelete={
                      message.author_id === currentUserId || isAdmin
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <GroupChatInput
        onSend={handleSend}
        isSending={isSending}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        disabled={isLoading}
        placeholder={`Mensagem para ${group.name}...`}
      />
    </div>
  );
};
