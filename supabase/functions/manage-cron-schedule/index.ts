import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger, generateRequestId, getClientIP } from "../_shared/system-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logger = createLogger('edge-function', 'manage-cron-schedule');

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, day, hour, minute } = await req.json();

    await logger.info(`Ação de cron schedule: ${action}`, {
      action,
      day,
      hour,
      minute,
      clientIP,
    }, undefined, requestId);

    if (action === 'get') {
      // Get current schedule
      const { data, error } = await supabase.rpc('get_cron_schedule');
      
      if (error) {
        await logger.warn('Erro ao obter schedule, usando padrão', { error: error.message }, undefined, requestId);
        // Return default if not found
        return new Response(JSON.stringify({
          success: true,
          schedule: { day: 1, hour: 2, minute: 0 },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        schedule: data || { day: 1, hour: 2, minute: 0 },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      // Validate inputs
      const validDay = Math.min(28, Math.max(1, day || 1));
      const validHour = Math.min(23, Math.max(0, hour || 2));
      const validMinute = Math.min(59, Math.max(0, minute || 0));

      // Build cron expression: minute hour day * *
      const cronExpression = `${validMinute} ${validHour} ${validDay} * *`;

      await logger.info(`Atualizando cron schedule para: ${cronExpression}`, {
        cronExpression,
        validDay,
        validHour,
        validMinute,
      }, undefined, requestId);

      // First, try to unschedule existing job
      try {
        await supabase.rpc('unschedule_monthly_charges');
      } catch (e) {
        await logger.info('Nenhum job existente para remover', {}, undefined, requestId);
      }

      // Schedule new job using raw SQL via pg_cron
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const functionUrl = `${supabaseUrl}/functions/v1/process-monthly-charges`;

      const { error: scheduleError } = await supabase.rpc('schedule_monthly_charges', {
        cron_expression: cronExpression,
        function_url: functionUrl,
        auth_token: anonKey,
      });

      if (scheduleError) {
        await logger.error('Erro ao agendar job', { error: scheduleError.message }, undefined, requestId);
        throw scheduleError;
      }

      await logger.info('Cron schedule atualizado com sucesso', {
        newSchedule: { day: validDay, hour: validHour, minute: validMinute },
      }, undefined, requestId);

      return new Response(JSON.stringify({
        success: true,
        message: `Agendamento atualizado para dia ${validDay} às ${String(validHour).padStart(2, '0')}:${String(validMinute).padStart(2, '0')}`,
        schedule: { day: validDay, hour: validHour, minute: validMinute },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await logger.warn('Ação inválida recebida', { action }, undefined, requestId);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logger.error('Erro em manage-cron-schedule', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      clientIP,
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
