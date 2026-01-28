import { useState } from "react";
import { Bot, Sparkles, Loader2, AlertTriangle, CheckCircle, Shield, Lightbulb, Clock, ThumbsUp, ThumbsDown, MessageSquare, TrendingUp, Database, Link, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { SystemLog, AIDiagnosis, DiagnosisContext } from "@/hooks/useSystemLogs";
import { cn } from "@/lib/utils";

interface AIAnalysisPanelProps {
  selectedLog: SystemLog | null;
  diagnosis: AIDiagnosis | null;
  isGenerating: boolean;
  isCached: boolean;
  context: DiagnosisContext | null;
  onGenerateDiagnosis: (logId: string) => void;
  onSubmitFeedback: (params: { diagnosisId: string; resolved: boolean; comment?: string }) => void;
  isSubmittingFeedback: boolean;
}

export function AIAnalysisPanel({
  selectedLog,
  diagnosis,
  isGenerating,
  isCached,
  context,
  onGenerateDiagnosis,
  onSubmitFeedback,
  isSubmittingFeedback,
}: AIAnalysisPanelProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");
  
  const canAnalyze = selectedLog && (selectedLog.level === "ERROR" || selectedLog.level === "CRITICAL");

  const handleFeedback = (resolved: boolean) => {
    if (diagnosis) {
      onSubmitFeedback({
        diagnosisId: diagnosis.id,
        resolved,
        comment: feedbackComment || undefined,
      });
      setShowFeedback(false);
      setFeedbackComment("");
    }
  };

  return (
    <Card className="border-border/50 h-auto lg:h-[calc(100vh-340px)] min-h-[280px] lg:min-h-[450px] flex flex-col bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0 px-3 sm:px-5 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20">
            <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              Análise de Causa Raiz
              {diagnosis && isCached && (
                <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 h-4">
                  <Clock className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5" />
                  Cache
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">
              Diagnóstico inteligente via IA
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1 px-3 sm:px-5">
          {!selectedLog ? (
            <EmptyState 
              icon={<Bot className="h-12 w-12 sm:h-14 sm:w-14 text-muted-foreground/20" />}
              title="Selecione um evento"
              description="Clique em um log de erro para gerar diagnóstico automático"
            />
          ) : !canAnalyze ? (
            <EmptyState
              icon={<CheckCircle className="h-12 w-12 sm:h-14 sm:w-14 text-emerald-500/20" />}
              title="Evento sem erros"
              description="Análise disponível apenas para eventos ERROR ou CRITICAL"
            />
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center h-40 sm:h-52 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative p-3 rounded-full bg-primary/10">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-sm">Analisando...</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Investigando causa raiz do erro
                </p>
              </div>
            </div>
          ) : diagnosis ? (
            <DiagnosisView 
              diagnosis={diagnosis} 
              isCached={isCached} 
              context={context}
              showFeedback={showFeedback}
              setShowFeedback={setShowFeedback}
              feedbackComment={feedbackComment}
              setFeedbackComment={setFeedbackComment}
              onFeedback={handleFeedback}
              isSubmittingFeedback={isSubmittingFeedback}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-40 sm:h-52 space-y-3 py-4">
              <div className="p-3 sm:p-4 rounded-full bg-red-500/10">
                <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
              </div>
              <div className="text-center space-y-1.5 px-2">
                <p className="font-medium text-sm">Erro selecionado</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground max-w-[280px] line-clamp-2">
                  {selectedLog.message.substring(0, 100)}...
                </p>
                {selectedLog.error_category && (
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {selectedLog.error_category}
                  </Badge>
                )}
              </div>
              <Button 
                onClick={() => onGenerateDiagnosis(selectedLog.id)}
                className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm"
                size="sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Gerar Diagnóstico
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 sm:h-52 text-center space-y-3 px-4 py-6">
      {icon}
      <div className="space-y-1">
        <p className="font-medium text-muted-foreground text-sm">{title}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground/70 max-w-[240px]">
          {description}
        </p>
      </div>
    </div>
  );
}

interface DiagnosisViewProps {
  diagnosis: AIDiagnosis;
  isCached: boolean;
  context: DiagnosisContext | null;
  showFeedback: boolean;
  setShowFeedback: (show: boolean) => void;
  feedbackComment: string;
  setFeedbackComment: (comment: string) => void;
  onFeedback: (resolved: boolean) => void;
  isSubmittingFeedback: boolean;
}

function DiagnosisView({ 
  diagnosis, 
  isCached, 
  context,
  showFeedback,
  setShowFeedback,
  feedbackComment,
  setFeedbackComment,
  onFeedback,
  isSubmittingFeedback,
}: DiagnosisViewProps) {
  const sections = [
    {
      icon: AlertTriangle,
      title: "Causa Raiz",
      content: diagnosis.root_cause,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      icon: Zap,
      title: "Impacto",
      content: diagnosis.impact,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      icon: Lightbulb,
      title: "Solução",
      content: diagnosis.solution,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: Shield,
      title: "Prevenção",
      content: diagnosis.prevention,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
  ];

  const hasFeedback = diagnosis.feedback_resolved !== null;

  return (
    <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
      {/* Context badges - incident.io style */}
      {context && (
        <div className="flex flex-wrap gap-1.5">
          {context.relatedLogsCount > 0 && (
            <Badge variant="secondary" className="text-[9px] sm:text-[10px] py-0 h-5 bg-slate-500/10">
              <Link className="h-2.5 w-2.5 mr-1" />
              {context.relatedLogsCount} relacionados
            </Badge>
          )}
          {context.similarErrorsCount > 0 && (
            <Badge variant="secondary" className="text-[9px] sm:text-[10px] py-0 h-5 bg-amber-500/10 text-amber-600">
              <TrendingUp className="h-2.5 w-2.5 mr-1" />
              {context.similarErrorsCount}x (24h)
            </Badge>
          )}
          {context.existingSolutionsCount > 0 && (
            <Badge variant="secondary" className="text-[9px] sm:text-[10px] py-0 h-5 bg-emerald-500/10 text-emerald-600">
              <Database className="h-2.5 w-2.5 mr-1" />
              {context.existingSolutionsCount} soluções
            </Badge>
          )}
        </div>
      )}

      {/* Sections - compact incident.io style */}
      <div className="space-y-2.5 sm:space-y-3">
        {sections.map((section, index) => {
          if (!section.content) return null;
          const Icon = section.icon;
          
          return (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className={cn("p-1 sm:p-1.5 rounded", section.bg)}>
                  <Icon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", section.color)} />
                </div>
                <h4 className="font-medium text-xs sm:text-sm">{section.title}</h4>
              </div>
              <div className="pl-6 sm:pl-8 text-[11px] sm:text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {section.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Related logs */}
      {diagnosis.related_logs && diagnosis.related_logs.length > 0 && (
        <div className="pt-2">
          <Separator className="mb-2" />
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            <Link className="h-3 w-3 inline mr-1" />
            {diagnosis.related_logs.length} logs analisados para contexto
          </p>
        </div>
      )}

      {/* Feedback section - compact */}
      <div className="pt-2">
        <Separator className="mb-3" />
        {hasFeedback ? (
          <div className="flex items-center gap-2 text-xs">
            {diagnosis.feedback_resolved ? (
              <>
                <div className="p-1 rounded bg-emerald-500/10">
                  <ThumbsUp className="h-3 w-3 text-emerald-500" />
                </div>
                <span className="text-emerald-600 text-[11px]">Resolvido</span>
              </>
            ) : (
              <>
                <div className="p-1 rounded bg-amber-500/10">
                  <ThumbsDown className="h-3 w-3 text-amber-500" />
                </div>
                <span className="text-amber-600 text-[11px]">Não resolveu</span>
              </>
            )}
          </div>
        ) : showFeedback ? (
          <div className="space-y-2">
            <p className="text-xs font-medium">A solução funcionou?</p>
            <Textarea
              placeholder="Comentário opcional..."
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              className="min-h-[50px] text-xs"
            />
            <div className="flex flex-wrap gap-1.5">
              <Button 
                size="sm" 
                onClick={() => onFeedback(true)}
                disabled={isSubmittingFeedback}
                className="gap-1 h-7 text-xs flex-1"
              >
                <ThumbsUp className="h-3 w-3" />
                Sim
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onFeedback(false)}
                disabled={isSubmittingFeedback}
                className="gap-1 h-7 text-xs flex-1"
              >
                <ThumbsDown className="h-3 w-3" />
                Não
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setShowFeedback(false)}
                className="h-7 text-xs px-2"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFeedback(true)}
            className="gap-1.5 w-full h-7 sm:h-8 text-xs"
          >
            <MessageSquare className="h-3 w-3" />
            Dar feedback
          </Button>
        )}
      </div>
    </div>
  );
}
