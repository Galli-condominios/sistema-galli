import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Send, Trash2, MessageCircle } from "lucide-react";
import { useFeedComments, FeedComment } from "@/hooks/useFeedMessages";
import { useUserRoleContext } from "@/contexts/UserRoleContext";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedCommentsProps {
  messageId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeedComments = ({ messageId, open, onOpenChange }: FeedCommentsProps) => {
  const [newComment, setNewComment] = useState("");
  const { comments, isLoading, addComment, deleteComment, isAdding } = useFeedComments(messageId);
  const { userId, isAdmin } = useUserRoleContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    addComment(newComment.trim());
    setNewComment("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comentários
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
              <p>Nenhum comentário ainda</p>
              <p className="text-sm">Seja o primeiro a comentar!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments?.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onDelete={() => deleteComment(comment.id)}
                  canDelete={comment.author_id === userId || isAdmin()}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escreva um comentário..."
            className="flex-1"
            disabled={isAdding}
          />
          <Button type="submit" size="icon" disabled={!newComment.trim() || isAdding}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

interface CommentItemProps {
  comment: FeedComment;
  onDelete: () => void;
  canDelete: boolean;
}

const CommentItem = ({ comment, onDelete, canDelete }: CommentItemProps) => {
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  // Extract author name from various possible sources
  const authorName = "Usuário";
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex gap-3 group">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs bg-muted">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{authorName}</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <p className="text-sm text-foreground/90 break-words">{comment.content}</p>
      </div>

      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      )}
    </div>
  );
};
