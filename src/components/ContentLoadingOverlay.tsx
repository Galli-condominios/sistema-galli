import { Loader2 } from "lucide-react";

interface ContentLoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
}

const ContentLoadingOverlay = ({ isLoading, children }: ContentLoadingOverlayProps) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg animate-fade-in">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Atualizando...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentLoadingOverlay;
