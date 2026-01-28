import { HelpCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

interface OnboardingButtonProps {
  onOpenChecklist: () => void;
  onStartTour: () => void;
  progress: { total: number; completed: number };
}

export const OnboardingButton = ({
  onOpenChecklist,
  onStartTour,
  progress,
}: OnboardingButtonProps) => {
  const progressPercent = progress.total > 0 
    ? (progress.completed / progress.total) * 100 
    : 0;
  const isComplete = progress.completed === progress.total && progress.total > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-tour="help-button"
        >
          <HelpCircle className="h-5 w-5" />
          {!isComplete && progress.total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {progress.total > 0 && (
          <>
            <div className="px-3 py-2">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Configuração</span>
                <span className="font-medium">
                  {progress.completed}/{progress.total}
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={onStartTour}>
          <Sparkles className="h-4 w-4 mr-2 text-primary" />
          Iniciar Tour Guiado
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenChecklist}>
          <HelpCircle className="h-4 w-4 mr-2" />
          Guia de Configuração
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
