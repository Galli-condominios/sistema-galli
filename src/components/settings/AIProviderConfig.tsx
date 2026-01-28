import { useState, useEffect } from "react";
import { Cpu, Loader2, Save, Eye, EyeOff, Trash2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgAIConfig } from "@/hooks/useOrgAIConfig";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function AIProviderConfig() {
  const {
    config,
    isLoading,
    saveConfig,
    isSaving,
    resetConfig,
    isResetting,
    models,
  } = useOrgAIConfig();

  const [model, setModel] = useState("google/gemini-3-flash-preview");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync state with loaded config
  useEffect(() => {
    if (config) {
      setModel(config.model);
    }
  }, [config]);

  const selectedModel = models.find(m => m.value === model);

  const handleSave = () => {
    // Determinar provider baseado no modelo selecionado
    let provider = "lovable";
    if (apiKey) {
      if (model.startsWith("openai/")) {
        provider = "openai";
      } else if (model.startsWith("google/")) {
        provider = "google";
      }
    }
    
    saveConfig({
      provider,
      model,
      apiKey: apiKey || undefined,
    });
    setApiKey("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Cpu className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Configuração de IA
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Configure o modelo e a chave API do assistente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
          {/* Current Status */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-medium">Modelo:</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                {selectedModel?.label || model}
              </Badge>
              {selectedModel && (
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  {selectedModel.provider}
                </Badge>
              )}
            </div>
            {config?.hasApiKey && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-muted-foreground hidden sm:inline">•</span>
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                <span className="text-xs sm:text-sm text-muted-foreground truncate">Chave: {config.maskedKey}</span>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Modelo</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-9 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm truncate">{m.label}</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">({m.provider})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <Label className="text-sm">Chave API {config?.hasApiKey && "(já configurada)"}</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder={config?.hasApiKey ? "Nova chave para substituir" : "Digite sua chave API"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-12 h-9 sm:h-10 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              </Button>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              A chave será criptografada e armazenada de forma segura
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              )}
              Salvar Configuração
            </Button>

            {config?.hasApiKey && (
              <Button
                variant="destructive"
                onClick={() => setShowResetConfirm(true)}
                disabled={isResetting}
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                {isResetting ? (
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                )}
                Remover Chave
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Remover Chave API"
        description="Ao remover a chave API, a organização voltará a usar a chave padrão. Deseja continuar?"
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={() => {
          resetConfig();
          setShowResetConfirm(false);
        }}
        variant="destructive"
      />
    </>
  );
}
