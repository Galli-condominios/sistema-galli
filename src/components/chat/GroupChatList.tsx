import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, MessageCircle, Plus, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChatGroup } from "@/hooks/useGroupChat";

interface GroupChatListProps {
  groups: ChatGroup[];
  selectedGroupId?: string;
  onSelectGroup: (groupId: string) => void;
  onCreateGroup?: () => void;
  isLoading?: boolean;
  isAdmin?: boolean;
}

export const GroupChatList = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  isLoading,
  isAdmin,
}: GroupChatListProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-2 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Grupos</h2>
        </div>
        {isAdmin && onCreateGroup && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCreateGroup}
            title="Criar novo grupo"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Groups List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {groups.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum grupo disponível</p>
              {isAdmin && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={onCreateGroup}
                  className="mt-2"
                >
                  Criar primeiro grupo
                </Button>
              )}
            </div>
          ) : (
            groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-all",
                  "hover:bg-accent/50 active:scale-[0.98]",
                  selectedGroupId === group.id
                    ? "bg-accent text-accent-foreground"
                    : "bg-transparent"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Group Icon */}
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center shrink-0",
                    selectedGroupId === group.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}>
                    <Users className="h-6 w-6" />
                  </div>

                  {/* Group Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium truncate">{group.name}</h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {group.last_message_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(group.last_message_at), {
                              addSuffix: false,
                              locale: ptBR,
                            })}
                          </span>
                        )}
                        {(group.unread_count || 0) > 0 && (
                          <Badge className="h-5 min-w-[20px] px-1.5 text-xs bg-primary">
                            {group.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Last message preview */}
                    {group.last_message_preview && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {group.last_message_preview}
                      </p>
                    )}

                    {/* Condominiums */}
                    {group.condominiums && group.condominiums.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">
                          {group.condominiums.map(c => c.name).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
