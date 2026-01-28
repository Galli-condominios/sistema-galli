import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger, generateRequestId } from "../_shared/system-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logger = createLogger('edge-function', 'analyze-system-health');

interface ErrorPattern {
  type: 'spike' | 'cascade' | 'degradation' | 'recurring' | 'critical';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metadata: Record<string, unknown>;
}

interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byService: Record<string, number>;
  byCategory: Record<string, number>;
  avgLatency: number;
  errorRate: number;
}

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  const startTime = performance.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await logger.info('Iniciando análise de saúde do sistema', {}, undefined, requestId);

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch logs from last 15 minutes (current window)
    const { data: currentLogs, error: logsError } = await supabase
      .from('system_logs')
      .select('*')
      .gte('created_at', fifteenMinutesAgo.toISOString())
      .order('created_at', { ascending: false });

    if (logsError) throw logsError;

    // Fetch logs from previous 15-minute window for comparison
    const previousWindowStart = new Date(fifteenMinutesAgo.getTime() - 15 * 60 * 1000);
    const { data: previousLogs } = await supabase
      .from('system_logs')
      .select('*')
      .gte('created_at', previousWindowStart.toISOString())
      .lt('created_at', fifteenMinutesAgo.toISOString());

    // Fetch hourly baseline
    const { data: hourlyLogs } = await supabase
      .from('system_logs')
      .select('*')
      .gte('created_at', oneHourAgo.toISOString());

    // Fetch existing active alerts to avoid duplicates
    const { data: activeAlerts } = await supabase
      .from('system_alerts')
      .select('alert_type, metadata')
      .is('resolved_at', null)
      .gte('created_at', twentyFourHoursAgo.toISOString());

    const patterns: ErrorPattern[] = [];

    // Calculate stats for current window
    const currentStats = calculateStats(currentLogs || []);
    const previousStats = calculateStats(previousLogs || []);
    const hourlyStats = calculateStats(hourlyLogs || []);

    // 1. Detect ERROR SPIKE (>200% increase from previous window)
    const currentErrors = currentStats.byLevel['ERROR'] || 0;
    const previousErrors = previousStats.byLevel['ERROR'] || 0;
    
    if (currentErrors > 0 && previousErrors > 0) {
      const errorIncrease = ((currentErrors - previousErrors) / previousErrors) * 100;
      if (errorIncrease >= 200) {
        patterns.push({
          type: 'spike',
          severity: 'warning',
          title: 'Spike de Erros Detectado',
          description: `Aumento de ${Math.round(errorIncrease)}% nos erros nos últimos 15 minutos (${previousErrors} → ${currentErrors})`,
          metadata: { 
            previousCount: previousErrors, 
            currentCount: currentErrors, 
            increasePercent: errorIncrease 
          },
        });
      }
    } else if (currentErrors >= 5 && previousErrors === 0) {
      // New errors appearing when there were none
      patterns.push({
        type: 'spike',
        severity: 'warning',
        title: 'Novos Erros Detectados',
        description: `${currentErrors} erros nos últimos 15 minutos após período sem erros`,
        metadata: { currentCount: currentErrors },
      });
    }

    // 2. Detect CRITICAL errors (immediate alert)
    const criticalLogs = (currentLogs || []).filter(l => l.level === 'CRITICAL');
    if (criticalLogs.length > 0) {
      const services = [...new Set(criticalLogs.map(l => l.service))];
      patterns.push({
        type: 'critical',
        severity: 'critical',
        title: `${criticalLogs.length} Erro(s) Crítico(s) Detectado(s)`,
        description: `Erros críticos em: ${services.join(', ')}`,
        metadata: { 
          count: criticalLogs.length, 
          services,
          messages: criticalLogs.slice(0, 3).map(l => l.message.substring(0, 100)),
        },
      });
    }

    // 3. Detect CASCADE (multiple services failing in sequence)
    const errorsByService = currentStats.byService;
    const failingServices = Object.entries(errorsByService)
      .filter(([_, count]) => count >= 2)
      .map(([service]) => service);
    
    if (failingServices.length >= 3) {
      patterns.push({
        type: 'cascade',
        severity: 'critical',
        title: 'Possível Cascata de Falhas',
        description: `${failingServices.length} serviços apresentando erros simultâneos: ${failingServices.join(', ')}`,
        metadata: { services: failingServices, errorsByService },
      });
    }

    // 4. Detect DEGRADATION (high latency or error rate)
    if (currentStats.avgLatency > 5000) {
      patterns.push({
        type: 'degradation',
        severity: 'warning',
        title: 'Latência Elevada',
        description: `Latência média de ${Math.round(currentStats.avgLatency)}ms (limite: 5000ms)`,
        metadata: { avgLatency: currentStats.avgLatency },
      });
    }

    if (currentStats.errorRate > 0.1 && currentStats.total >= 10) {
      patterns.push({
        type: 'degradation',
        severity: 'warning',
        title: 'Taxa de Erro Elevada',
        description: `Taxa de erro de ${(currentStats.errorRate * 100).toFixed(1)}% nos últimos 15 minutos`,
        metadata: { 
          errorRate: currentStats.errorRate, 
          total: currentStats.total,
          errors: currentStats.byLevel['ERROR'] || 0,
        },
      });
    }

    // 5. Detect RECURRING errors (same error category appearing repeatedly)
    const categoryErrors = Object.entries(currentStats.byCategory)
      .filter(([cat, count]) => cat !== 'other' && count >= 5);
    
    for (const [category, count] of categoryErrors) {
      // Check if same pattern in hourly window
      const hourlyCount = hourlyStats.byCategory[category] || 0;
      if (hourlyCount >= 10) {
        patterns.push({
          type: 'recurring',
          severity: 'warning',
          title: `Erro Recorrente: ${formatCategory(category)}`,
          description: `${hourlyCount} ocorrências de erros de ${formatCategory(category)} na última hora`,
          metadata: { category, hourlyCount, recentCount: count },
        });
      }
    }

    // Create alerts for detected patterns (avoid duplicates)
    let alertsCreated = 0;
    const existingAlertTypes = new Set(activeAlerts?.map(a => a.alert_type) || []);

    for (const pattern of patterns) {
      // Skip if similar alert already exists
      const alertKey = `${pattern.type}_${pattern.title}`;
      if (existingAlertTypes.has(pattern.type)) {
        // Check if it's the same specific alert
        const existing = activeAlerts?.find(a => 
          a.alert_type === pattern.type && 
          a.metadata?.title === pattern.title
        );
        if (existing) continue;
      }

      const { error: insertError } = await supabase
        .from('system_alerts')
        .insert({
          alert_type: pattern.type,
          severity: pattern.severity,
          title: pattern.title,
          description: pattern.description,
          metadata: { ...pattern.metadata, title: pattern.title },
        });

      if (!insertError) {
        alertsCreated++;
        await logger.info(`Alerta criado: ${pattern.title}`, {
          type: pattern.type,
          severity: pattern.severity,
        }, undefined, requestId);
      }
    }

    // Notify admins for critical patterns
    if (patterns.some(p => p.severity === 'critical')) {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['administrador', 'sindico']);

      for (const admin of admins || []) {
        await supabase.from('notifications').insert({
          user_id: admin.user_id,
          title: '🚨 Alerta de Sistema',
          message: `Detectados ${patterns.filter(p => p.severity === 'critical').length} problemas críticos no sistema`,
          type: 'system',
          priority: 'urgent',
          link: '/superadmin/monitoring',
        });
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);

    await logger.info('Análise de saúde concluída', {
      patternsDetected: patterns.length,
      alertsCreated,
      currentWindow: {
        logs: currentStats.total,
        errors: currentStats.byLevel['ERROR'] || 0,
        criticals: currentStats.byLevel['CRITICAL'] || 0,
        errorRate: currentStats.errorRate,
        avgLatency: currentStats.avgLatency,
      },
      latency_ms: latencyMs,
    }, undefined, requestId);

    return new Response(JSON.stringify({
      success: true,
      patternsDetected: patterns.length,
      alertsCreated,
      patterns: patterns.map(p => ({ type: p.type, severity: p.severity, title: p.title })),
      stats: {
        current: currentStats,
        previous: previousStats,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logger.error('Erro na análise de saúde do sistema', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    }, undefined, requestId);

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateStats(logs: any[]): LogStats {
  const stats: LogStats = {
    total: logs.length,
    byLevel: {},
    byService: {},
    byCategory: {},
    avgLatency: 0,
    errorRate: 0,
  };

  if (logs.length === 0) return stats;

  let totalLatency = 0;
  let latencyCount = 0;
  let errorCount = 0;

  for (const log of logs) {
    // Count by level
    stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    
    // Count by service
    stats.byService[log.service] = (stats.byService[log.service] || 0) + 1;
    
    // Count by category (for errors)
    if (log.error_category) {
      stats.byCategory[log.error_category] = (stats.byCategory[log.error_category] || 0) + 1;
    }

    // Track latency from metadata
    if (log.metadata?.latency_ms) {
      totalLatency += log.metadata.latency_ms;
      latencyCount++;
    }

    // Count errors for rate
    if (['ERROR', 'CRITICAL', 'WARN'].includes(log.level)) {
      errorCount++;
    }
  }

  stats.avgLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;
  stats.errorRate = logs.length > 0 ? errorCount / logs.length : 0;

  return stats;
}

function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'rls': 'Políticas RLS',
    'auth': 'Autenticação',
    'database': 'Banco de Dados',
    'rate-limit': 'Rate Limiting',
    'network': 'Rede',
    'validation': 'Validação',
    'edge-function': 'Edge Functions',
    'other': 'Outros',
  };
  return categoryMap[category] || category;
}
