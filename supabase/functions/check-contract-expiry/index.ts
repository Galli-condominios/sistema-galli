import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger, generateRequestId, getClientIP } from "../_shared/system-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logger = createLogger('edge-function', 'check-contract-expiry');

serve(async (req) => {
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const startTime = performance.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await logger.info('Iniciando verificação de contratos expirando', { clientIP }, undefined, requestId);

    // Get current date
    const today = new Date();
    
    // Calculate target dates (30, 15, and 7 days from now)
    const targetDays = [30, 15, 7];
    
    // Fetch all active tenants (inquilinos) with contract end dates
    const { data: residents, error: residentsError } = await supabase
      .from('residents')
      .select(`
        id,
        user_id,
        unit_id,
        contract_end_date,
        resident_type,
        units (
          id,
          unit_number,
          block,
          condominium_id,
          condominiums (
            id,
            name
          )
        ),
        profiles:user_id (
          full_name
        )
      `)
      .eq('resident_type', 'inquilino')
      .eq('is_active', true)
      .not('contract_end_date', 'is', null);

    if (residentsError) {
      await logger.error('Erro ao buscar residentes', { 
        error: residentsError.message,
        code: residentsError.code,
      }, undefined, requestId);
      throw residentsError;
    }

    await logger.info(`Encontrados ${residents?.length || 0} inquilinos ativos com datas de término`, {
      residentsCount: residents?.length || 0,
    }, undefined, requestId);

    // Fetch all admins and síndicos to notify
    const { data: admins, error: adminsError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['administrador', 'sindico']);

    if (adminsError) {
      await logger.error('Erro ao buscar administradores', { 
        error: adminsError.message,
      }, undefined, requestId);
      throw adminsError;
    }

    let notificationsSent = 0;
    let contractsExpiring = { in7days: 0, in15days: 0, in30days: 0 };

    for (const resident of residents || []) {
      const contractEndDate = new Date(resident.contract_end_date);
      const diffTime = contractEndDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Check if the contract expires in exactly 30, 15, or 7 days
      if (targetDays.includes(diffDays)) {
        if (diffDays === 7) contractsExpiring.in7days++;
        if (diffDays === 15) contractsExpiring.in15days++;
        if (diffDays === 30) contractsExpiring.in30days++;

        const residentName = (resident.profiles as any)?.full_name || 'Morador';
        const unitNumber = (resident.units as any)?.unit_number || '?';
        const block = (resident.units as any)?.block;
        const condoName = (resident.units as any)?.condominiums?.name || 'Condomínio';
        
        const unitDisplay = block ? `${unitNumber} - Bloco ${block}` : unitNumber;
        
        const priorityMap: Record<number, string> = {
          30: 'normal',
          15: 'high',
          7: 'urgent'
        };

        const message = `O contrato do inquilino ${residentName} (Unidade ${unitDisplay}) do ${condoName} vence em ${diffDays} dias (${contractEndDate.toLocaleDateString('pt-BR')}).`;

        // Create notifications for all admins/síndicos
        for (const admin of admins || []) {
          // Check if notification already exists for today
          const todayStr = today.toISOString().split('T')[0];
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', admin.user_id)
            .eq('type', 'system')
            .ilike('message', `%${residentName}%vence em ${diffDays} dias%`)
            .gte('created_at', todayStr)
            .single();

          if (!existingNotification) {
            const { error: insertError } = await supabase
              .from('notifications')
              .insert({
                user_id: admin.user_id,
                title: `Contrato Próximo do Vencimento (${diffDays} dias)`,
                message: message,
                type: 'system',
                priority: priorityMap[diffDays],
                link: '/dashboard/residents'
              });

            if (insertError) {
              await logger.warn('Erro ao inserir notificação', { 
                error: insertError.message,
                adminUserId: admin.user_id,
                residentId: resident.id,
              }, undefined, requestId);
            } else {
              notificationsSent++;
            }
          }
        }
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);

    await logger.info('Verificação de contratos concluída', {
      notificationsSent,
      contractsExpiring,
      latency_ms: latencyMs,
    }, undefined, requestId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Verificação concluída. ${notificationsSent} notificações enviadas.`,
        notificationsSent,
        contractsExpiring,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logger.critical('Falha crítica na verificação de contratos', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      latency_ms: latencyMs,
      clientIP,
    }, undefined, requestId);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
