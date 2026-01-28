import { MessageSquare, Users2, Globe, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FeedEmptyStateProps {
  onCreatePost: () => void;
  hasGroups: boolean;
  isAdmin?: boolean;
  onManageGroups?: () => void;
}

export const FeedEmptyState = ({
  onCreatePost,
  hasGroups,
  isAdmin,
  onManageGroups,
}: FeedEmptyStateProps) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md mx-auto space-y-6">
        {/* Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-primary/10 rounded-full flex items-center justify-center">
            <MessageSquare className="h-10 w-10 text-primary" />
          </div>
        </div>

        {/* Title and description */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Bem-vindo ao Feed da Comunidade!</h3>
          <p className="text-muted-foreground">
            Aqui você pode compartilhar informações importantes, avisos e novidades com os moradores do condomínio.
          </p>
        </div>

        {/* Features */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="grid gap-4 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Avisos Globais</p>
                  <p className="text-xs text-muted-foreground">
                    Envie mensagens para todos os moradores do condomínio
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Users2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Grupos por Bloco</p>
                  <p className="text-xs text-muted-foreground">
                    Comunique-se apenas com moradores do seu bloco
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Reações e Comentários</p>
                  <p className="text-xs text-muted-foreground">
                    Interaja com as publicações da comunidade
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button variant="gradient" size="lg" onClick={onCreatePost} className="gap-2">
            <Send className="h-5 w-5" />
            Criar Primeira Publicação
          </Button>

          {isAdmin && !hasGroups && onManageGroups && (
            <Button variant="outline" size="lg" onClick={onManageGroups} className="gap-2">
              <Users2 className="h-5 w-5" />
              Configurar Grupos de Blocos
            </Button>
          )}
        </div>

        {/* Tip for admins */}
        {isAdmin && !hasGroups && (
          <p className="text-xs text-muted-foreground">
            💡 Dica: Configure os grupos de blocos para enviar mensagens segmentadas aos moradores.
          </p>
        )}
      </div>
    </div>
  );
};
