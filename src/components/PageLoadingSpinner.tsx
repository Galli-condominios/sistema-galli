import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

const PageLoadingSpinner = ({ 
  message = "Carregando...", 
  fullScreen = false 
}: PageLoadingSpinnerProps) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center bg-background",
      fullScreen ? "min-h-screen" : "min-h-[60vh]"
    )}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
        </div>
        <span className="text-sm text-muted-foreground animate-pulse font-medium">
          {message}
        </span>
      </div>
    </div>
  );
};

export default PageLoadingSpinner;
