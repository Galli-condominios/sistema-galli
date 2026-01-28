import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger, generateRequestId, getClientIP } from "../_shared/system-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BreakdownDetails {
  water?: {
    consumption_m3: number;
    rate_per_m3: number;
    amount: number;
    reading_month: number;
    reading_year: number;
    previous_reading: number;
    current_reading: number;
  };
  electricity?: {
    consumption_kwh: number;
    rate_per_kwh: number;
    amount: number;
    garage_identifier: string;
    reading_month: number;
    reading_year: number;
    meter_serial?: string;
  };
  gas?: {
    consumption: number;
    rate: number;
    amount: number;
    unit_label: string;
  };
  expenses?: Array<{
    description: string;
    category: string;
    amount: number;
  }>;
}

const logger = createLogger('edge-function', 'process-monthly-charges');

Deno.serve(async (req) => {
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

    // Get month/year from request body or use previous month
    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const targetMonth = body.month || (now.getMonth() === 0 ? 12 : now.getMonth());
    const targetYear = body.year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
    const condominiumId = body.condominium_id; // Optional: process specific condominium

    await logger.info(`Iniciando processamento de cobranças ${targetMonth}/${targetYear}`, {
      targetMonth,
      targetYear,
      condominiumId: condominiumId || 'all',
      clientIP,
    }, undefined, requestId);

    // Get all condominiums (or specific one)
    let condominiumsQuery = supabase.from('condominiums').select('id, name');
    if (condominiumId) {
      condominiumsQuery = condominiumsQuery.eq('id', condominiumId);
    }
    const { data: condominiums, error: condError } = await condominiumsQuery;

    if (condError) {
      await logger.error('Erro ao buscar condomínios', {
        error: condError.message,
        code: condError.code,
      }, undefined, requestId);
      throw condError;
    }

    const results = {
      processed: 0,
      charges_created: 0,
      errors: [] as string[],
    };

    for (const condominium of condominiums || []) {
      // Get all units for this condominium
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_number, block')
        .eq('condominium_id', condominium.id);

      if (unitsError) {
        const errorMsg = `Erro ao buscar unidades de ${condominium.name}: ${unitsError.message}`;
        results.errors.push(errorMsg);
        await logger.warn(errorMsg, { condominiumId: condominium.id }, undefined, requestId);
        continue;
      }

      // Get active utility rates
      const { data: utilityRates } = await supabase
        .from('utility_rates')
        .select('*')
        .eq('condominium_id', condominium.id)
        .eq('is_active', true);

      const gasRate = utilityRates?.find(r => r.utility_type === 'gas');

      for (const unit of units || []) {
        try {
          const breakdown: BreakdownDetails = {};
          let totalAmount = 0;

          // 1. Water readings
          const { data: waterReading } = await supabase
            .from('water_readings')
            .select('*')
            .eq('unit_id', unit.id)
            .eq('reading_month', targetMonth)
            .eq('reading_year', targetYear)
            .single();

          if (waterReading && waterReading.calculated_amount) {
            const waterAmount = Number(waterReading.calculated_amount);
            breakdown.water = {
              consumption_m3: Number(waterReading.consumption_m3),
              rate_per_m3: Number(waterReading.rate_per_m3),
              amount: waterAmount,
              reading_month: waterReading.reading_month,
              reading_year: waterReading.reading_year,
              previous_reading: Number(waterReading.previous_reading),
              current_reading: Number(waterReading.current_reading),
            };
            totalAmount += waterAmount;
          }

          // 2. Electricity readings
          const { data: electricityReadings } = await supabase
            .from('electricity_readings')
            .select('*')
            .eq('unit_id', unit.id)
            .eq('reading_month', targetMonth)
            .eq('reading_year', targetYear);

          if (electricityReadings && electricityReadings.length > 0) {
            let totalElecAmount = 0;
            let totalConsumption = 0;
            const garages: string[] = [];
            
            for (const elecReading of electricityReadings) {
              if (elecReading.calculated_amount) {
                totalElecAmount += Number(elecReading.calculated_amount);
                totalConsumption += Number(elecReading.consumption_kwh);
                garages.push(elecReading.garage_identifier);
              }
            }

            if (totalElecAmount > 0) {
              const firstReading = electricityReadings[0];
              breakdown.electricity = {
                consumption_kwh: totalConsumption,
                rate_per_kwh: Number(firstReading.rate_per_kwh),
                amount: totalElecAmount,
                garage_identifier: garages.join(', '),
                reading_month: firstReading.reading_month,
                reading_year: firstReading.reading_year,
                meter_serial: firstReading.meter_serial || undefined,
              };
              totalAmount += totalElecAmount;
            }
          }

          // 3. Gas readings
          const { data: gasReading } = await supabase
            .from('gas_readings')
            .select('*')
            .eq('unit_id', unit.id)
            .eq('reading_month', targetMonth)
            .eq('reading_year', targetYear)
            .single();

          if (gasReading && gasRate) {
            const gasAmount = Number(gasReading.reading_value) * Number(gasRate.rate_per_unit);
            breakdown.gas = {
              consumption: Number(gasReading.reading_value),
              rate: Number(gasRate.rate_per_unit),
              amount: gasAmount,
              unit_label: gasRate.unit_label,
            };
            totalAmount += gasAmount;
          }

          // 4. Expense apportionments
          const { data: apportionments } = await supabase
            .from('expense_apportionments')
            .select(`
              *,
              condominium_expenses (
                description,
                category,
                expense_month,
                expense_year
              )
            `)
            .eq('unit_id', unit.id)
            .eq('status', 'pending');

          const monthApportionments = apportionments?.filter(a => 
            a.condominium_expenses?.expense_month === targetMonth &&
            a.condominium_expenses?.expense_year === targetYear
          );

          if (monthApportionments && monthApportionments.length > 0) {
            breakdown.expenses = [];
            for (const apportionment of monthApportionments) {
              const expenseAmount = Number(apportionment.apportioned_amount);
              breakdown.expenses.push({
                description: apportionment.condominium_expenses?.description || 'Despesa',
                category: apportionment.condominium_expenses?.category || 'outros',
                amount: expenseAmount,
              });
              totalAmount += expenseAmount;
            }
          }

          // Skip if no charges to create
          if (totalAmount === 0) {
            continue;
          }

          // Calculate due date (10th of next month)
          const dueDate = new Date(targetYear, targetMonth, 10);
          if (targetMonth === 12) {
            dueDate.setFullYear(targetYear + 1);
            dueDate.setMonth(0);
          }

          // Create consolidated financial charge
          const { data: charge, error: chargeError } = await supabase
            .from('financial_charges')
            .insert({
              unit_id: unit.id,
              condominium_id: condominium.id,
              charge_type: 'boleto_mensal',
              amount: totalAmount,
              due_date: dueDate.toISOString().split('T')[0],
              description: `Boleto mensal - ${String(targetMonth).padStart(2, '0')}/${targetYear}`,
              status: 'pendente',
              breakdown_details: breakdown,
            })
            .select()
            .single();

          if (chargeError) {
            const errorMsg = `Erro ao criar cobrança para unidade ${unit.unit_number}: ${chargeError.message}`;
            results.errors.push(errorMsg);
            await logger.warn(errorMsg, { unitId: unit.id }, undefined, requestId);
            continue;
          }

          // Update apportionments to link to the charge
          if (monthApportionments && monthApportionments.length > 0) {
            await supabase
              .from('expense_apportionments')
              .update({ 
                financial_charge_id: charge.id,
                status: 'charged'
              })
              .in('id', monthApportionments.map(a => a.id));
          }

          // Update water reading to link to the charge
          if (waterReading) {
            await supabase
              .from('water_readings')
              .update({ financial_charge_id: charge.id })
              .eq('id', waterReading.id);
          }

          // Update electricity readings to link to the charge
          if (electricityReadings && electricityReadings.length > 0) {
            await supabase
              .from('electricity_readings')
              .update({ financial_charge_id: charge.id })
              .in('id', electricityReadings.map(e => e.id));
          }

          results.charges_created++;

        } catch (unitError) {
          const errorMsg = `Erro ao processar unidade ${unit.unit_number}: ${unitError}`;
          results.errors.push(errorMsg);
          await logger.error(errorMsg, { unitId: unit.id, error: String(unitError) }, undefined, requestId);
        }
      }

      results.processed++;
    }

    const latencyMs = Math.round(performance.now() - startTime);
    
    await logger.info('Processamento de cobranças concluído', {
      processed: results.processed,
      chargesCreated: results.charges_created,
      errorsCount: results.errors.length,
      latency_ms: latencyMs,
    }, undefined, requestId);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.processed} condominiums, created ${results.charges_created} charges`,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logger.critical('Falha crítica no processamento de cobranças mensais', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      latency_ms: latencyMs,
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
