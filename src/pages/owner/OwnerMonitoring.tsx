import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import PageHeader from "@/components/PageHeader";
import { Crown } from "lucide-react";
import { useState } from "react";
import { useSystemLogs, TimePeriod, LogLevel } from "@/hooks/useSystemLogs";
import { Badge } from "@/components/ui/badge";
import { AlertsPanel } from "@/components/monitoring/AlertsPanel";
import { MetricsCards } from "@/components/monitoring/MetricsCards";
import { LogsConsole } from "@/components/monitoring/LogsConsole";
import { AIAnalysisPanel } from "@/components/monitoring/AIAnalysisPanel";

const OwnerMonitoring = () => {
  const [filters, setFilters] = useState<{
    level?: LogLevel;
    service?: string;
    search?: string;
    period?: TimePeriod;
  }>({ period: "24h" });

  const {
    logs,
    metrics,
    alerts,
    isLoading,
    refetch,
    selectedLog,
    setSelectedLog,
    generateDiagnosis,
    isGeneratingDiagnosis,
    diagnosis,
    diagnosisCached,
    diagnosisContext,
    submitFeedback,
    isSubmittingFeedback,
    resolveLog,
    acknowledgeAlert,
    resolveAlert,
    clearResolvedLogs,
  } = useSystemLogs(filters);

  const activeAlerts = alerts?.filter((a) => !a.resolved_at) || [];

  const getStatusColor = () => {
    if (!metrics) return "bg-muted";
    switch (metrics.systemStatus) {
      case "healthy":
        return "bg-green-500";
      case "degraded":
        return "bg-yellow-500";
      case "critical":
        return "bg-red-500";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = () => {
    if (!metrics) return "Carregando...";
    switch (metrics.systemStatus) {
      case "healthy":
        return "Saudável";
      case "degraded":
        return "Degradado";
      case "critical":
        return "Crítico";
      default:
        return "Desconhecido";
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <PageHeader
              title="Monitoramento Global"
              description="Logs e métricas de todo o sistema"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${getStatusColor()} animate-pulse`} />
              <span className="text-sm font-medium">{getStatusLabel()}</span>
            </div>
            {metrics && (
              <>
                <Badge variant="outline">
                  Erros: {(Number(metrics.errorRate) * 100).toFixed(1)}%
                </Badge>
                <Badge variant="outline">
                  Latência: {Number(metrics.avgLatency).toFixed(0)}ms
                </Badge>
                {activeAlerts.length > 0 && (
                  <Badge variant="destructive">
                    {activeAlerts.length} alerta{activeAlerts.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>

        {/* Alerts Panel */}
        {activeAlerts.length > 0 && (
          <AlertsPanel
            alerts={activeAlerts}
            onAcknowledge={acknowledgeAlert}
            onResolve={resolveAlert}
          />
        )}

        {/* Metrics Cards */}
        <MetricsCards metrics={metrics} isLoading={isLoading} />

        {/* Logs and AI Analysis */}
        <div className="grid gap-6 lg:grid-cols-2">
          <LogsConsole
            logs={logs || []}
            isLoading={isLoading}
            filters={filters}
            onFilterChange={setFilters}
            onSelectLog={setSelectedLog}
            selectedLog={selectedLog}
            onRefresh={refetch}
            onResolveLog={resolveLog}
            onClearResolved={clearResolvedLogs}
          />

          <AIAnalysisPanel
            selectedLog={selectedLog}
            diagnosis={diagnosis}
            isCached={diagnosisCached}
            context={diagnosisContext}
            isGenerating={isGeneratingDiagnosis}
            onGenerateDiagnosis={(logId) => generateDiagnosis(logId)}
            onSubmitFeedback={(params) => submitFeedback(params)}
            isSubmittingFeedback={isSubmittingFeedback}
          />
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default OwnerMonitoring;
