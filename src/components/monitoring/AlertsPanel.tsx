import { AlertTriangle, Bell, CheckCircle, Eye, Clock, Zap, RotateCcw, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SystemAlert } from "@/hooks/useSystemLogs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AlertsPanelProps {
  alerts: SystemAlert[];
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}

const severityConfig = {
  info: {
    bg: "bg-blue-500/5 border-blue-500/20",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: Bell,
    accent: "border-l-blue-500",
  },
  warning: {
    bg: "bg-amber-500/5 border-amber-500/20",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: AlertTriangle,
    accent: "border-l-amber-500",
  },
  critical: {
    bg: "bg-red-500/5 border-red-500/20",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    icon: AlertTriangle,
    accent: "border-l-red-500",
  },
};

const alertTypeConfig: Record<string, { icon: typeof Zap; label: string }> = {
  spike: { icon: Zap, label: "Spike de Erros" },
  cascade: { icon: RotateCcw, label: "Erro em Cascata" },
  degradation: { icon: Clock, label: "Degradação" },
  recurring: { icon: RotateCcw, label: "Recorrente" },
};

export function AlertsPanel({ alerts, onAcknowledge, onResolve }: AlertsPanelProps) {
  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;

  return (
    <Card className={cn(
      "border-l-4 overflow-hidden",
      criticalCount > 0 ? "border-l-red-500 bg-red-500/[0.02]" : "border-l-amber-500 bg-amber-500/[0.02]"
    )}>
      <CardHeader className="pb-2 px-3 sm:px-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg",
              criticalCount > 0 ? "bg-red-500/10" : "bg-amber-500/10"
            )}>
              <Bell className={cn(
                "h-3.5 w-3.5 sm:h-4 sm:w-4",
                criticalCount > 0 ? "text-red-500" : "text-amber-500"
              )} />
            </div>
            <span>Incidentes Ativos</span>
          </CardTitle>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] sm:text-xs animate-pulse">
                {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] sm:text-xs">
                {warningCount} aviso{warningCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 px-3 sm:px-5 pb-3 sm:pb-4">
        <ScrollArea className="max-h-[280px] sm:max-h-[240px]">
          <div className="space-y-2 sm:space-y-2.5">
            {alerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;
              const typeConfig = alertTypeConfig[alert.alert_type] || { icon: Bell, label: alert.alert_type };
              const TypeIcon = typeConfig.icon;
              
              return (
                <div 
                  key={alert.id}
                  className={cn(
                    "relative rounded-lg border p-3 sm:p-4 transition-all hover:shadow-md",
                    config.bg,
                    "border-l-4",
                    config.accent
                  )}
                >
                  {/* Timeline connector for incident.io style */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    {/* Status icon */}
                    <div className={cn(
                      "p-1.5 sm:p-2 rounded-lg shrink-0",
                      config.iconBg
                    )}>
                      <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", config.iconColor)} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="font-medium text-xs sm:text-sm line-clamp-1">
                            {alert.title}
                          </h4>
                          {alert.description && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                              {alert.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {!alert.acknowledged_at && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 sm:h-7 sm:w-7 hover:bg-background/80"
                              onClick={() => onAcknowledge(alert.id)}
                              title="Reconhecer"
                            >
                              <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            onClick={() => onResolve(alert.id)}
                            title="Resolver"
                          >
                            <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Metadata row - incident.io style */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-[9px] sm:text-[10px] py-0 h-4 sm:h-5", config.badge)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] text-muted-foreground">
                          <TypeIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {typeConfig.label}
                        </span>
                        {alert.affected_service && (
                          <>
                            <ArrowRight className="h-2 w-2 text-muted-foreground/50" />
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">
                              {alert.affected_service}
                            </span>
                          </>
                        )}
                        {alert.error_count > 1 && (
                          <Badge variant="secondary" className="text-[9px] sm:text-[10px] py-0 h-4 sm:h-5">
                            {alert.error_count}x
                          </Badge>
                        )}
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 ml-auto">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
