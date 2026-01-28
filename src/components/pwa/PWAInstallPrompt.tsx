import { useState, useEffect } from 'react';
import { X, Download, Share, MoreVertical, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';

const STORAGE_KEY = 'pwa-install-dismissed';
const SHOW_DELAY = 2000; // 2 seconds

export const PWAInstallPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { 
    isInstalled, 
    isInstallable, 
    platform, 
    isIOS, 
    isAndroid, 
    installPWA, 
    canInstallNatively 
  } = usePWA();

  useEffect(() => {
    console.log('[PWA Prompt] Checking visibility conditions...');
    console.log('[PWA Prompt] isInstalled:', isInstalled);
    console.log('[PWA Prompt] platform:', platform);
    
    // Don't show on desktop - only show on mobile devices
    if (platform === 'desktop') {
      console.log('[PWA Prompt] Desktop detected, not showing');
      return;
    }
    
    // Don't show if already installed
    if (isInstalled) {
      console.log('[PWA Prompt] Already installed, not showing');
      return;
    }

    // Check if user dismissed before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        console.log('[PWA Prompt] Dismissed recently, not showing');
        return;
      }
    }

    // Show after delay
    console.log('[PWA Prompt] Will show in', SHOW_DELAY, 'ms');
    const timer = setTimeout(() => {
      console.log('[PWA Prompt] Showing prompt now');
      setIsVisible(true);
    }, SHOW_DELAY);

    return () => clearTimeout(timer);
  }, [isInstalled, platform]);

  const handleInstall = async () => {
    console.log('[PWA Prompt] Install button clicked');
    console.log('[PWA Prompt] canInstallNatively:', canInstallNatively);
    
    if (canInstallNatively) {
      const success = await installPWA();
      if (success) {
        setIsVisible(false);
      } else {
        // If native install failed, show instructions
        setShowInstructions(true);
      }
    } else {
      // Show manual instructions
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    console.log('[PWA Prompt] Dismissed');
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md mx-4 mb-4 sm:mb-0 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Smartphone className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Instale o Galli</h2>
              <p className="text-sm opacity-90">Acesse mais rápido e offline</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showInstructions ? (
            <>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Download className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground">Acesso rápido pela tela inicial</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground">Funciona como um app nativo</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground">Sem precisar baixar da loja</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleInstall} 
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Instalar Agora
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleDismiss}
                  className="w-full text-muted-foreground"
                >
                  Agora não
                </Button>
              </div>
            </>
          ) : (
            <ManualInstructions platform={platform} isIOS={isIOS} isAndroid={isAndroid} onClose={() => setShowInstructions(false)} />
          )}
        </div>
      </div>
    </div>
  );
};

interface ManualInstructionsProps {
  platform: string;
  isIOS: boolean;
  isAndroid: boolean;
  onClose: () => void;
}

const ManualInstructions = ({ platform, isIOS, isAndroid, onClose }: ManualInstructionsProps) => {
  if (isIOS) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Como instalar no iPhone/iPad:</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>Toque no botão</span>
              <Share className="h-5 w-5 text-primary" />
              <span>compartilhar na barra inferior</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>Role e toque em</span>
              <span className="font-medium">"Adicionar à Tela de Início"</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
            <span className="text-sm text-foreground">Toque em "Adicionar" no canto superior direito</span>
          </div>
        </div>
        <Button variant="outline" onClick={onClose} className="w-full mt-4">
          Entendi
        </Button>
      </div>
    );
  }

  if (isAndroid) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Como instalar no Android:</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>Toque no menu</span>
              <MoreVertical className="h-5 w-5 text-primary" />
              <span>no canto superior</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
            <span className="text-sm text-foreground">Toque em "Instalar aplicativo" ou "Adicionar à tela inicial"</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
            <span className="text-sm text-foreground">Confirme a instalação</span>
          </div>
        </div>
        <Button variant="outline" onClick={onClose} className="w-full mt-4">
          Entendi
        </Button>
      </div>
    );
  }

  // Desktop
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Como instalar no computador:</h3>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
          <span className="text-sm text-foreground">Procure o ícone de instalação na barra de endereços do navegador (geralmente à direita)</span>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
          <span className="text-sm text-foreground">Clique no ícone e selecione "Instalar"</span>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
          <span className="text-sm text-foreground">O app será instalado e aparecerá em sua área de trabalho</span>
        </div>
      </div>
      <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
        💡 No Chrome, você também pode ir em Menu ⋮ → "Instalar Galli Administradora..."
      </div>
      <Button variant="outline" onClick={onClose} className="w-full mt-4">
        Entendi
      </Button>
    </div>
  );
};

export default PWAInstallPrompt;
