import { Activity, Server, AlertTriangle, Clock, CheckCircle, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemMetrics } from "@/hooks/useSystemLogs";
import { cn } from "@/lib/utils";

interface MetricsCardsProps {
  metrics: SystemMetrics | null;
  isLoading: boolean;
}

export function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-7 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "healthy":
        return {
          badge: (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] sm:text-xs font-medium">
              <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
              Operacional
            </Badge>
          ),
          pulse: "bg-emerald-500",
          glow: "shadow-emerald-500/20",
        };
      case "degraded":
        return {
          badge: (
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] sm:text-xs font-medium">
              <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
              Degradado
            </Badge>
          ),
          pulse: "bg-amber-500",
          glow: "shadow-amber-500/20",
        };
      case "critical":
        return {
          badge: (
            <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] sm:text-xs font-medium animate-pulse">
              <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
              Crítico
            </Badge>
          ),
          pulse: "bg-red-500",
          glow: "shadow-red-500/20",
        };
      default:
        return {
          badge: <Badge variant="secondary" className="text-[10px] sm:text-xs">Desconhecido</Badge>,
          pulse: "bg-muted",
          glow: "",
        };
    }
  };

  const statusConfig = getStatusConfig(metrics?.systemStatus || "unknown");
  const errorRateHigh = Number(metrics?.errorRate || 0) > 5;

  const cards = [
    {
      title: "Status Geral",
      value: statusConfig.badge,
      icon: Activity,
      iconBg: cn(
        "bg-gradient-to-br",
        metrics?.systemStatus === "healthy" 
          ? "from-emerald-500/20 to-emerald-600/10" 
          : metrics?.systemStatus === "degraded" 
            ? "from-amber-500/20 to-amber-600/10" 
            : "from-red-500/20 to-red-600/10"
      ),
      iconColor: metrics?.systemStatus === "healthy"
        ? "text-emerald-500"
        : metrics?.systemStatus === "degraded"
          ? "text-amber-500"
          : "text-red-500",
      pulse: statusConfig.pulse,
      cardGlow: metrics?.systemStatus !== "healthy" ? statusConfig.glow : "",
    },
    {
      title: "Taxa de Erro",
      value: `${metrics?.errorRate || "0"}%`,
      subtitle: `${metrics?.errorsCount || 0} erros (15 min)`,
      icon: AlertTriangle,
      iconBg: errorRateHigh 
        ? "bg-gradient-to-br from-red-500/20 to-red-600/10" 
        : "bg-gradient-to-br from-muted/50 to-muted/30",
      iconColor: errorRateHigh ? "text-red-500" : "text-muted-foreground",
      trend: errorRateHigh ? { direction: "up" as const, color: "text-red-500" } : null,
    },
    {
      title: "Latência Média",
      value: typeof metrics?.avgLatency === "number" ? `${metrics.avgLatency}ms` : "N/A",
      subtitle: typeof metrics?.avgLatency === "number" && metrics.avgLatency > 500 ? "Acima do esperado" : "Dentro do normal",
      icon: Clock,
      iconBg: "bg-gradient-to-br from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-500",
      trend: typeof metrics?.avgLatency === "number" && metrics.avgLatency > 500 
        ? { direction: "up" as const, color: "text-amber-500" } 
        : { direction: "down" as const, color: "text-emerald-500" },
    },
    {
      title: "Total de Logs",
      value: metrics?.totalLogs?.toLocaleString() || "0",
      subtitle: metrics?.lastUpdated 
        ? `${new Date(metrics.lastUpdated).toLocaleTimeString("pt-BR")}` 
        : "Atualizando...",
      icon: Server,
      iconBg: "bg-gradient-to-br from-purple-500/20 to-purple-600/10",
      iconColor: "text-purple-500",
    },
  ];

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const TrendIcon = card.trend?.direction === "up" ? TrendingUp : TrendingDown;
        
        return (
          <Card 
            key={index} 
            className={cn(
              "border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5",
              card.cardGlow && `shadow-lg ${card.cardGlow}`
            )}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {card.title}
                  </p>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-lg sm:text-2xl font-bold tracking-tight">
                      {typeof card.value === "string" ? card.value : card.value}
                    </span>
                    {card.trend && (
                      <TrendIcon className={cn("h-3 w-3 sm:h-4 sm:w-4", card.trend.color)} />
                    )}
                  </div>
                  {card.subtitle && (
                    <p className="text-[9px] sm:text-xs text-muted-foreground truncate">
                      {card.subtitle}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <div className={cn(
                    "p-2 sm:p-2.5 rounded-xl shrink-0",
                    card.iconBg
                  )}>
                    <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", card.iconColor)} />
                  </div>
                  {card.pulse && metrics?.systemStatus !== "healthy" && index === 0 && (
                    <span className={cn(
                      "absolute -top-0.5 -right-0.5 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full",
                      card.pulse,
                      "animate-pulse"
                    )} />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
