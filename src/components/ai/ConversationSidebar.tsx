import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Conversation } from "@/hooks/useAIConversations";

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelect,
  onNew,
  onDelete,
  isCollapsed,
  onToggleCollapse
}: ConversationSidebarProps) {
  const groupConversationsByDate = (convs: Conversation[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { label: string; conversations: Conversation[] }[] = [
      { label: "Hoje", conversations: [] },
      { label: "Ontem", conversations: [] },
      { label: "Últimos 7 dias", conversations: [] },
      { label: "Mais antigas", conversations: [] }
    ];

    convs.forEach(conv => {
      const date = new Date(conv.updated_at);
      if (date.toDateString() === today.toDateString()) {
        groups[0].conversations.push(conv);
      } else if (date.toDateString() === yesterday.toDateString()) {
        groups[1].conversations.push(conv);
      } else if (date > lastWeek) {
        groups[2].conversations.push(conv);
      } else {
        groups[3].conversations.push(conv);
      }
    });

    return groups.filter(g => g.conversations.length > 0);
  };

  const groups = groupConversationsByDate(conversations);

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-border bg-card/50 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNew}
          className="text-primary"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 border-r border-border bg-card/50 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onNew}
          className="flex-1 mr-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova conversa
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {groups.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              Nenhuma conversa ainda
            </div>
          ) : (
            groups.map((group, groupIndex) => (
              <div key={groupIndex}>
                <div className="text-xs font-medium text-muted-foreground px-2 mb-2">
                  {group.label}
                </div>
                <div className="space-y-1">
                  {group.conversations.map((conv) => (
                                    <div
                                      key={conv.id}
                                      className={cn(
                                        "group flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors min-h-[2.5rem]",
                                        currentConversationId === conv.id
                                          ? "bg-primary/10 text-primary"
                                          : "hover:bg-muted/50"
                                      )}
                                      onClick={() => onSelect(conv.id)}
                                    >
                                    <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
                                      <span className="text-sm line-clamp-2 flex-1 text-left leading-tight">
                                        {conv.title}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-6 h-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDelete(conv.id);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
