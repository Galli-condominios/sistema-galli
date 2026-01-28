import { ArrowLeft, Users, MoreVertical, Settings, Info, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatGroup } from "@/hooks/useGroupChat";

interface GroupChatHeaderProps {
  group: ChatGroup;
  onBack?: () => void;
  onOpenSettings?: () => void;
  showBackButton?: boolean;
}

export const GroupChatHeader = ({
  group,
  onBack,
  onOpenSettings,
  showBackButton,
}: GroupChatHeaderProps) => {
  const condoNames = group.condominiums?.map(c => c.name).join(", ") || "";

  return (
    <div className="h-16 border-b border-border bg-card flex items-center gap-3 px-4">
      {/* Back Button (Mobile) */}
      {showBackButton && onBack && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Group Avatar */}
      <Avatar className="h-10 w-10 bg-primary/10">
        <AvatarFallback className="bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>

      {/* Group Info */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold truncate">{group.name}</h2>
        {condoNames && (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate cursor-default">
                <Building2 className="h-3 w-3" />
                {condoNames}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <p>Condomínios: {condoNames}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onOpenSettings}>
            <Info className="h-4 w-4 mr-2" />
            Informações do grupo
          </DropdownMenuItem>
          {onOpenSettings && (
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
