import { useState } from "react";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Trash2,
  Clock,
  Globe,
  ThumbsUp,
  Laugh,
  Frown,
  Users2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeedMessage } from "@/hooks/useFeedMessages";
import { useUserRoleContext } from "@/contexts/UserRoleContext";
import { cn } from "@/lib/utils";

interface FeedCardProps {
  message: FeedMessage & { group_name?: string };
  onOpenComments: () => void;
  onToggleReaction: (emoji: string) => void;
  onDelete: () => void;
  authorName?: string;
}

const REACTION_EMOJIS = [
  { emoji: "❤️", icon: Heart, label: "Curtir" },
  { emoji: "👍", icon: ThumbsUp, label: "Legal" },
  { emoji: "😂", icon: Laugh, label: "Haha" },
  { emoji: "😢", icon: Frown, label: "Triste" },
];

export const FeedCard = ({
  message,
  onOpenComments,
  onToggleReaction,
  onDelete,
  authorName,
}: FeedCardProps) => {
  const { userId, isAdmin } = useUserRoleContext();
  const [showReactions, setShowReactions] = useState(false);
  
  const isOwner = message.author_id === userId;
  const canDelete = isOwner || isAdmin();
  
  const hoursRemaining = differenceInHours(new Date(message.expires_at), new Date());
  const timeAgo = formatDistanceToNow(new Date(message.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const getTotalReactions = () => {
    return Object.values(message.reactions || {}).reduce(
      (acc, users) => acc + users.length,
      0
    );
  };

  const getUserReaction = () => {
    if (!userId) return null;
    for (const [emoji, users] of Object.entries(message.reactions || {})) {
      if (users.includes(userId)) return emoji;
    }
    return null;
  };

  const userReaction = getUserReaction();
  const displayName = authorName || "Usuário";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-background to-muted/30 snap-start snap-always">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{displayName}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Group badge - shows origin */}
          {message.is_global ? (
            <Badge variant="default" className="gap-1 text-xs bg-primary/90">
              <Globe className="h-3 w-3" />
              Geral
            </Badge>
          ) : message.group_name ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Users2 className="h-3 w-3" />
              {message.group_name}
            </Badge>
          ) : null}
          <Badge variant="outline" className="gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {hoursRemaining}h
          </Badge>
          
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center p-6 overflow-y-auto">
        {message.media_url && (
          <div className="mb-4 rounded-xl overflow-hidden bg-muted/50">
            {message.media_type === "video" ? (
              <video
                src={message.media_url}
                controls
                className="w-full max-h-[50vh] object-contain"
              />
            ) : (
              <img
                src={message.media_url}
                alt="Post media"
                className="w-full max-h-[50vh] object-contain"
              />
            )}
          </div>
        )}
        
        <p className="text-lg md:text-xl leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border/50">
        {/* Reactions summary */}
        {getTotalReactions() > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-1">
              {Object.keys(message.reactions || {}).slice(0, 3).map((emoji) => (
                <span key={emoji} className="text-lg">{emoji}</span>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {getTotalReactions()} {getTotalReactions() === 1 ? "reação" : "reações"}
            </span>
          </div>
        )}

        {/* Reaction picker */}
        {showReactions && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg animate-fade-in">
            {REACTION_EMOJIS.map(({ emoji, label }) => (
              <button
                key={emoji}
                onClick={() => {
                  onToggleReaction(emoji);
                  setShowReactions(false);
                }}
                className={cn(
                  "text-2xl hover:scale-125 transition-transform p-1 rounded",
                  userReaction === emoji && "bg-primary/20"
                )}
                title={label}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-around">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex-1 gap-2",
              userReaction && "text-primary"
            )}
            onClick={() => setShowReactions(!showReactions)}
          >
            <Heart className={cn("h-5 w-5", userReaction && "fill-primary")} />
            <span>{userReaction || "Reagir"}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 gap-2"
            onClick={onOpenComments}
          >
            <MessageCircle className="h-5 w-5" />
            <span>
              {message.comments_count || 0}{" "}
              {message.comments_count === 1 ? "comentário" : "comentários"}
            </span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => {
              navigator.share?.({
                title: "Post do Condomínio",
                text: message.content,
              });
            }}
          >
            <Share2 className="h-5 w-5" />
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
