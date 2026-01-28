import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string;
}

interface OnboardingTourProps {
  steps: OnboardingStep[];
  currentStep: number;
  isActive: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export const OnboardingTour = ({
  steps,
  currentStep,
  isActive,
  onNext,
  onPrev,
  onSkip,
}: OnboardingTourProps) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const isMobile = useIsMobile();
  const step = steps[currentStep];

  useEffect(() => {
    if (!isActive || !step?.target) {
      setTargetRect(null);
      return;
    }

    const findTarget = () => {
      const target = document.querySelector(step.target!);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    };

    findTarget();
    const timeout = setTimeout(findTarget, 500);

    return () => clearTimeout(timeout);
  }, [isActive, step?.target, currentStep]);

  if (!isActive || !step) return null;

  const progressPercent = ((currentStep + 1) / steps.length) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const TooltipContent = () => (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{step.title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onSkip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={progressPercent} className="h-1" />
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground">{step.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="text-xs text-muted-foreground">
          {currentStep + 1} de {steps.length}
        </div>
        <div className="flex gap-2">
          {!isFirstStep && (
            <Button variant="outline" size="sm" onClick={onPrev}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {isLastStep ? "Concluir" : "Próximo"}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </CardFooter>
    </>
  );

  // Position tooltip for desktop
  const getTooltipPosition = () => {
    if (!targetRect) {
      return {
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const padding = 16;
    const tooltipWidth = 360;
    const tooltipHeight = 200;

    const spaceRight = window.innerWidth - targetRect.right;
    const spaceLeft = targetRect.left;
    const spaceBottom = window.innerHeight - targetRect.bottom;

    if (spaceRight > tooltipWidth + padding) {
      return {
        position: "fixed" as const,
        top: Math.max(padding, Math.min(targetRect.top, window.innerHeight - tooltipHeight - padding)),
        left: targetRect.right + padding,
      };
    }

    if (spaceLeft > tooltipWidth + padding) {
      return {
        position: "fixed" as const,
        top: Math.max(padding, Math.min(targetRect.top, window.innerHeight - tooltipHeight - padding)),
        left: targetRect.left - tooltipWidth - padding,
      };
    }

    if (spaceBottom > tooltipHeight + padding) {
      return {
        position: "fixed" as const,
        top: targetRect.bottom + padding,
        left: Math.max(padding, Math.min(targetRect.left, window.innerWidth - tooltipWidth - padding)),
      };
    }

    return {
      position: "fixed" as const,
      top: Math.max(padding, targetRect.top - tooltipHeight - padding),
      left: Math.max(padding, Math.min(targetRect.left, window.innerWidth - tooltipWidth - padding)),
    };
  };

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-[100] bg-black/60" />

        {/* Highlight */}
        {targetRect && (
          <div
            className="fixed z-[101] rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-background transition-all duration-300"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
            }}
          />
        )}

        {/* Bottom Sheet */}
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="bottom" className="z-[102] rounded-t-xl">
            <Card className="border-0 shadow-none bg-transparent">
              <TooltipContent />
            </Card>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: positioned tooltip
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/60" />

      {/* Highlight */}
      {targetRect && (
        <div
          className="fixed z-[101] rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-background transition-all duration-300"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
          }}
        />
      )}

      {/* Tooltip */}
      <Card
        className={cn(
          "z-[102] w-[360px] shadow-2xl border-primary/20 bg-card animate-in fade-in-0 zoom-in-95 duration-300"
        )}
        style={getTooltipPosition()}
      >
        <TooltipContent />
      </Card>
    </>
  );
};
