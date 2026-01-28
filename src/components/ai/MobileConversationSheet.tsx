import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Plus, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Conversation } from "@/hooks/useAIConversations";
import { useState } from "react";

interface MobileConversationSheetProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function MobileConversationSheet({
  conversations,
  currentConversationId,
  onSelect,
  onNew,
  onDelete,
}: MobileConversationSheetProps) {
  const [open, setOpen] = useState(false);

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

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  const handleNew = () => {
    onNew();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
        >
          <History className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle>Conversas</SheetTitle>
        </SheetHeader>
        
        <div className="p-3 border-b border-border">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleNew}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova conversa
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-3 space-y-4">
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
                          "group flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors min-h-[3rem]",
                          currentConversationId === conv.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/50 active:bg-muted"
                        )}
                        onClick={() => handleSelect(conv.id)}
                      >
                        <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60 mt-0.5" />
                        <span className="text-sm line-clamp-2 flex-1 text-left leading-tight">
                          {conv.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 flex-shrink-0 opacity-60"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(conv.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
