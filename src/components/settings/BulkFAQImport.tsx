import { useState } from "react";
import { Upload, Loader2, Sparkles, Check, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCondominium } from "@/contexts/CondominiumContext";
import { useQueryClient } from "@tanstack/react-query";

interface ParsedFAQ {
  question: string;
  answer: string;
  category: string;
}

export function BulkFAQImport() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedFAQs, setParsedFAQs] = useState<ParsedFAQ[]>([]);
  const [step, setStep] = useState<"input" | "review" | "saving">("input");
  const { toast } = useToast();
  const { selectedCondominium } = useCondominium();
  const queryClient = useQueryClient();

  const processText = async () => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-faqs", {
        body: { text }
      });

      if (error) throw error;

      if (data?.faqs && Array.isArray(data.faqs)) {
        setParsedFAQs(data.faqs);
        setStep("review");
      } else {
        throw new Error("Formato de resposta inválido");
      }
    } catch (error) {
      console.error("Error parsing FAQs:", error);
      toast({
        title: "Erro ao processar",
        description: "Não foi possível analisar o texto. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const saveFAQs = async () => {
    if (parsedFAQs.length === 0) return;
    
    setStep("saving");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const entries = parsedFAQs.map(faq => ({
        type: "faq" as const,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        condominium_id: selectedCondominium?.id || null,
        created_by: user?.id,
        is_active: true,
        priority: 0
      }));

      const { error } = await supabase
        .from("ai_knowledge_base")
        .insert(entries);

      if (error) throw error;

      toast({
        title: "FAQs importadas",
        description: `${parsedFAQs.length} FAQs foram adicionadas com sucesso.`
      });

      queryClient.invalidateQueries({ queryKey: ["ai-knowledge-base"] });
      handleClose();
    } catch (error) {
      console.error("Error saving FAQs:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as FAQs. Tente novamente.",
        variant: "destructive"
      });
      setStep("review");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setText("");
    setParsedFAQs([]);
    setStep("input");
  };

  const removeFAQ = (index: number) => {
    setParsedFAQs(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Importar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Importação de FAQs
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Cole um texto com perguntas e respostas. A IA organiza automaticamente.
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-3 sm:space-y-4 flex-1">
            <div className="space-y-2">
              <Label className="text-sm">Cole seu texto aqui</Label>
              <Textarea
                placeholder={`Exemplo:

Qual o horário da piscina?
A piscina funciona de 8h às 22h.

Como reservar a churrasqueira?
Reservas com 48h de antecedência.`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[200px] sm:min-h-[300px] font-mono text-xs sm:text-sm"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={handleClose} size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                Cancelar
              </Button>
              <Button 
                onClick={processText} 
                disabled={!text.trim() || isProcessing}
                size="sm"
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-3 sm:space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                {parsedFAQs.length} FAQs identificadas
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep("input")} className="text-xs sm:text-sm h-8">
                Voltar
              </Button>
            </div>

            <ScrollArea className="flex-1 max-h-[300px] sm:max-h-[400px] pr-2 sm:pr-4">
              <div className="space-y-2 sm:space-y-3">
                {parsedFAQs.map((faq, index) => (
                  <div key={index} className="p-2.5 sm:p-3 rounded-lg border bg-muted/30 space-y-1.5 sm:space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5">
                            {faq.category}
                          </Badge>
                        </div>
                        <p className="font-medium text-xs sm:text-sm leading-tight">{faq.question}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive flex-shrink-0"
                        onClick={() => removeFAQ(index)}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={handleClose} size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                Cancelar
              </Button>
              <Button 
                onClick={saveFAQs}
                disabled={parsedFAQs.length === 0}
                size="sm"
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Salvar {parsedFAQs.length} FAQs
              </Button>
            </div>
          </div>
        )}

        {step === "saving" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Salvando FAQs...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
