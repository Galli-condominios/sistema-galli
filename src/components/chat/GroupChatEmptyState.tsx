import { MessageCircle, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GroupChatEmptyStateProps {
  hasGroups?: boolean;
  onCreateGroup?: () => void;
  isAdmin?: boolean;
}

export const GroupChatEmptyState = ({
  hasGroups,
  onCreateGroup,
  isAdmin,
}: GroupChatEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/30 p-8">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <MessageCircle className="h-12 w-12 text-primary" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold mb-2">
          {hasGroups
            ? "Selecione um grupo"
            : "Bem-vindo ao Chat de Grupos"}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground mb-6">
          {hasGroups ? (
            <>
              <ArrowLeft className="inline h-4 w-4 mr-1" />
              Escolha um grupo na lista ao lado para começar a conversar com
              seus vizinhos.
            </>
          ) : (
            "Aqui você pode conversar em tempo real com os moradores do seu condomínio. Organize discussões por grupos e mantenha todos informados."
          )}
        </p>

        {/* Features List */}
        {!hasGroups && (
          <div className="space-y-3 text-left bg-card rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Grupos por Condomínio</p>
                <p className="text-xs text-muted-foreground">
                  Crie grupos para blocos, torres ou temas específicos
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Mensagens em Tempo Real</p>
                <p className="text-xs text-muted-foreground">
                  Receba e envie mensagens instantaneamente
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CTA Button */}
        {isAdmin && !hasGroups && onCreateGroup && (
          <Button onClick={onCreateGroup} size="lg">
            <Users className="h-4 w-4 mr-2" />
            Criar Primeiro Grupo
          </Button>
        )}
      </div>
    </div>
  );
};
