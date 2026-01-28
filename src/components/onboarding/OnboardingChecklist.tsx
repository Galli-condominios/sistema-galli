import { useNavigate } from "react-router-dom";
import { Check, Circle, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { OnboardingStep } from "@/hooks/useOnboarding";

interface OnboardingChecklistProps {
  isOpen: boolean;
  onClose: () => void;
  items: OnboardingStep[];
  completedSteps: string[];
  onCompleteStep: (stepId: string) => void;
  onStartTour: () => void;
  progress: { total: number; completed: number };
}

export const OnboardingChecklist = ({
  isOpen,
  onClose,
  items,
  completedSteps,
  onCompleteStep,
  onStartTour,
  progress,
}: OnboardingChecklistProps) => {
  const navigate = useNavigate();
  const progressPercent = progress.total > 0 
    ? (progress.completed / progress.total) * 100 
    : 0;

  const handleItemClick = (item: OnboardingStep) => {
    if (item.action) {
      navigate(item.action);
      onCompleteStep(item.id);
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Guia de Configuração
          </SheetTitle>
          <SheetDescription>
            Complete os passos abaixo para configurar seu sistema
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {progress.completed} de {progress.total} concluídos
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Tour Button */}
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => {
              onClose();
              onStartTour();
            }}
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Iniciar Tour Guiado
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>

          {/* Checklist */}
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-2 pr-4">
              {items.map((item) => {
                const isCompleted = completedSteps.includes(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-all",
                      "hover:bg-accent hover:border-primary/30",
                      isCompleted
                        ? "bg-primary/5 border-primary/20"
                        : "bg-card border-border"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                          isCompleted
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Circle className="h-2 w-2 fill-current opacity-0" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p
                          className={cn(
                            "font-medium text-sm",
                            isCompleted && "text-muted-foreground line-through"
                          )}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      {!isCompleted && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Completion message */}
          {progress.completed === progress.total && progress.total > 0 && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-primary">
                Parabéns! Configuração concluída!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Seu sistema está pronto para uso.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
