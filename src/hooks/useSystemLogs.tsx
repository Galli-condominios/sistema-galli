import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
export type TimePeriod = "1h" | "24h" | "7d" | "30d" | "all";
export type AlertSeverity = "info" | "warning" | "critical";

export interface SystemLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  function_name: string | null;
  message: string;
  metadata: Record<string, unknown>;
  user_id: string | null;
  ip_address: string | null;
  request_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  error_category: string | null;
  similar_count: number | null;
  created_at: string;
}

export interface SystemMetrics {
  systemStatus: "healthy" | "degraded" | "critical";
  errorRate: string;
  avgLatency: number | string;
  totalLogs: number;
  errorsCount: number;
  servicesWithIssues: string[];
  countByLevel: Record<string, number>;
  countByService: Record<string, number>;
  lastUpdated: string;
}

export interface AIDiagnosis {
  id: string;
  log_id: string;
  diagnosis: string;
  root_cause: string | null;
  impact: string | null;
  solution: string | null;
  prevention: string | null;
  related_logs: string[];
  feedback_resolved: boolean | null;
  feedback_comment: string | null;
  feedback_at: string | null;
  created_at: string;
}

export interface SystemAlert {
  id: string;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  description: string | null;
  affected_service: string | null;
  error_count: number;
  first_occurrence: string;
  last_occurrence: string;
  is_active: boolean;
  acknowledged_at: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
  related_log_ids: string[];
  created_at: string;
}

export interface DiagnosisContext {
  relatedLogsCount: number;
  similarErrorsCount: number;
  existingSolutionsCount: number;
  activeAlertsCount: number;
}

interface FetchLogsParams {
  limit?: number;
  offset?: number;
  level?: LogLevel;
  service?: string;
  search?: string;
  period?: TimePeriod;
}

interface FetchLogsResponse {
  logs: SystemLog[];
  total: number;
  metrics: SystemMetrics | null;
}

export function useSystemLogs(params: FetchLogsParams = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [diagnosisContext, setDiagnosisContext] = useState<DiagnosisContext | null>(null);

  // SuperAdminProvider envolve toda a aplicação (App.tsx), então este hook é sempre seguro.
  const superAdmin = useSuperAdmin();

  const readStoredSuperAdminToken = () => {
    try {
      const stored = localStorage.getItem("superadmin_session");
      if (!stored) return null;
      const parsed = JSON.parse(stored) as { token?: string };
      return parsed?.token ?? null;
    } catch {
      return null;
    }
  };

  const {
    limit = 100,
    offset = 0,
    level,
    service,
    search,
    period = "24h",
  } = params;

  // Fetch logs from edge function
  const fetchLogs = async (): Promise<FetchLogsResponse> => {
    let authToken: string | null = null;
    
    // First try SuperAdmin token
    if (superAdmin.isAuthenticated) {
      authToken = readStoredSuperAdminToken();
    } else {
      // Fallback to regular Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token || null;
    }
    
    if (!authToken) {
      throw new Error("No session");
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-system-logs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ limit, offset, level, service, search, period, include_metrics: true }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch logs");
    }

    return response.json();
  };

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["system-logs", { limit, offset, level, service, search, period }],
    queryFn: fetchLogs,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Fetch active alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ["system-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_alerts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as SystemAlert[];
    },
    refetchInterval: 30000,
  });

  // Real-time subscription for logs
  useEffect(() => {
    const channel = supabase
      .channel("system-logs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "system_logs",
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["system-logs"] });
          
          const newLog = payload.new as SystemLog;
          if (newLog.level === "ERROR" || newLog.level === "CRITICAL") {
            toast({
              variant: "destructive",
              title: `${newLog.level}: ${newLog.service}`,
              description: newLog.message.substring(0, 100),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  // Real-time subscription for alerts
  useEffect(() => {
    const channel = supabase
      .channel("system-alerts-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_alerts",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Generate AI diagnosis
  const diagnosisMutation = useMutation({
    mutationFn: async (logId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("No session");
      }

      const response = await supabase.functions.invoke("ai-diagnostics", {
        body: { log_id: logId, include_related: true },
      });

      if (response.error) {
        throw response.error;
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data.context) {
        setDiagnosisContext(data.context);
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao gerar diagnóstico",
        description: error.message,
      });
    },
  });

  // Submit feedback on diagnosis
  const feedbackMutation = useMutation({
    mutationFn: async ({ diagnosisId, resolved, comment }: { diagnosisId: string; resolved: boolean; comment?: string }) => {
      const { error } = await supabase
        .from("ai_diagnostics")
        .update({
          feedback_resolved: resolved,
          feedback_comment: comment || null,
          feedback_at: new Date().toISOString(),
        })
        .eq("id", diagnosisId);

      if (error) throw error;

      // If resolved, try to learn from it and save as a solution
      if (resolved && diagnosisMutation.data?.diagnosis) {
        const diagnosis = diagnosisMutation.data.diagnosis as AIDiagnosis;
        const log = selectedLog;
        
        if (log && diagnosis.solution) {
          // Check if similar solution already exists
          const { data: existing } = await supabase
            .from("error_solutions")
            .select("id, times_resolved, effectiveness_score")
            .eq("error_category", log.error_category || "other")
            .ilike("error_pattern", `%${log.message.substring(0, 50)}%`)
            .single();

          if (existing) {
            // Update existing solution
            await supabase
              .from("error_solutions")
              .update({
                times_resolved: existing.times_resolved + 1,
                effectiveness_score: Math.min(1, existing.effectiveness_score + 0.1),
                last_applied_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
          } else {
            // Create new solution
            await supabase
              .from("error_solutions")
              .insert({
                error_pattern: log.message.substring(0, 200),
                error_category: log.error_category || "other",
                service: log.service,
                solution: diagnosis.solution,
                prevention: diagnosis.prevention,
                effectiveness_score: 0.7,
                last_applied_at: new Date().toISOString(),
              });
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.resolved ? "Feedback registrado ✅" : "Feedback registrado",
        description: variables.resolved 
          ? "A solução foi salva para uso futuro!"
          : "Obrigado pelo feedback. A IA vai melhorar.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar feedback",
        description: error.message,
      });
    },
  });

  // Mark log as resolved
  const resolveLogMutation = useMutation({
    mutationFn: async (logId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("system_logs")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq("id", logId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-logs"] });
      toast({
        title: "Log marcado como resolvido",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao resolver log",
        description: error.message,
      });
    },
  });

  // Acknowledge alert
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("system_alerts")
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id,
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      toast({ title: "Alerta reconhecido" });
    },
  });

  // Resolve alert
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("system_alerts")
        .update({
          is_active: false,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      toast({ title: "Alerta resolvido" });
    },
  });

  // Clear resolved logs (older than 7 days)
  const clearResolvedMutation = useMutation({
    mutationFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from("system_logs")
        .delete()
        .eq("resolved", true)
        .lt("resolved_at", sevenDaysAgo);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-logs"] });
      toast({
        title: "Logs resolvidos limpos",
      });
    },
  });

  return {
    logs: data?.logs || [],
    total: data?.total || 0,
    metrics: data?.metrics || null,
    alerts,
    isLoading,
    error,
    refetch,
    selectedLog,
    setSelectedLog,
    generateDiagnosis: diagnosisMutation.mutateAsync,
    isGeneratingDiagnosis: diagnosisMutation.isPending,
    diagnosis: diagnosisMutation.data?.diagnosis as AIDiagnosis | null,
    diagnosisCached: diagnosisMutation.data?.cached || false,
    diagnosisContext,
    submitFeedback: feedbackMutation.mutate,
    isSubmittingFeedback: feedbackMutation.isPending,
    resolveLog: resolveLogMutation.mutate,
    isResolvingLog: resolveLogMutation.isPending,
    acknowledgeAlert: acknowledgeAlertMutation.mutate,
    resolveAlert: resolveAlertMutation.mutate,
    clearResolvedLogs: clearResolvedMutation.mutate,
    isClearingLogs: clearResolvedMutation.isPending,
  };
}
