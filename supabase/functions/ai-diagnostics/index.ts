import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagnosticsRequest {
  log_id: string;
  include_related?: boolean;
}

interface SystemLog {
  id: string;
  timestamp: string;
  level: string;
  service: string;
  function_name: string | null;
  message: string;
  metadata: Record<string, unknown>;
  error_category: string | null;
}

interface ErrorSolution {
  id: string;
  error_pattern: string;
  error_category: string;
  solution: string;
  prevention: string | null;
  effectiveness_score: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin/sindico
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["administrador", "sindico"].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { log_id, include_related = true }: DiagnosticsRequest = await req.json();

    if (!log_id) {
      return new Response(
        JSON.stringify({ error: "log_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the main log
    const { data: mainLog, error: logError } = await supabase
      .from("system_logs")
      .select("*")
      .eq("id", log_id)
      .single();

    if (logError || !mainLog) {
      return new Response(
        JSON.stringify({ error: "Log not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing diagnosis
    const { data: existingDiagnosis } = await supabase
      .from("ai_diagnostics")
      .select("*")
      .eq("log_id", log_id)
      .single();

    if (existingDiagnosis) {
      return new Response(
        JSON.stringify({ diagnosis: existingDiagnosis, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ENHANCED CONTEXT GATHERING =====
    
    // 1. Fetch related logs by request_id
    let relatedLogs: SystemLog[] = [];
    if (include_related && mainLog.request_id) {
      const { data: related } = await supabase
        .from("system_logs")
        .select("*")
        .eq("request_id", mainLog.request_id)
        .neq("id", log_id)
        .order("timestamp", { ascending: true })
        .limit(10);
      
      relatedLogs = related || [];
    }

    // 2. Fetch logs around the same time from same service (context window)
    const { data: contextLogs } = await supabase
      .from("system_logs")
      .select("*")
      .eq("service", mainLog.service)
      .gte("timestamp", new Date(new Date(mainLog.timestamp).getTime() - 60000).toISOString())
      .lte("timestamp", new Date(new Date(mainLog.timestamp).getTime() + 60000).toISOString())
      .neq("id", log_id)
      .order("timestamp", { ascending: true })
      .limit(5);

    // 3. Check for similar errors in the last 24 hours
    const { data: similarErrors, count: similarCount } = await supabase
      .from("system_logs")
      .select("id, timestamp, message", { count: "exact" })
      .eq("service", mainLog.service)
      .eq("level", mainLog.level)
      .ilike("message", `%${mainLog.message.substring(0, 50)}%`)
      .gte("timestamp", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .neq("id", log_id)
      .order("timestamp", { ascending: false })
      .limit(5);

    // 4. Look for existing solutions for this error category
    let existingSolutions: ErrorSolution[] = [];
    if (mainLog.error_category) {
      const { data: solutions } = await supabase
        .from("error_solutions")
        .select("*")
        .eq("error_category", mainLog.error_category)
        .order("effectiveness_score", { ascending: false })
        .limit(3);
      
      existingSolutions = solutions || [];
    }

    // 5. Check for active alerts related to this service
    const { data: activeAlerts } = await supabase
      .from("system_alerts")
      .select("*")
      .eq("is_active", true)
      .eq("affected_service", mainLog.service)
      .limit(3);

    const allContext = [...relatedLogs, ...(contextLogs || [])];

    // ===== BUILD ENHANCED AI PROMPT =====
    
    const systemPrompt = `Você é um engenheiro de DevOps sênior especialista em diagnosticar erros de sistemas web.

CONTEXTO DO SISTEMA GALLI:
- Sistema de gestão condominial completo
- Stack: React 18 (frontend), Supabase (PostgreSQL + Auth + Edge Functions), Deno
- Banco: RLS policies para multi-tenancy, functions com SECURITY DEFINER
- Edge Functions: ai-assistant, create-user, delete-user, update-user, list-users, parse-faqs, process-monthly-charges, check-contract-expiry, ai-diagnostics, fetch-system-logs
- Tabelas principais: profiles, user_roles, residents, units, condominiums, organizations, financial_charges, reservations, packages, maintenance_requests

PADRÕES DE ERRO COMUNS NO GALLI:
1. "infinite recursion detected in policy" → RLS policy referenciando a si mesma
2. "JWT expired" → Token de sessão expirado, usuário precisa relogar
3. "rate limit exceeded" → Muitas requests em curto período
4. "permission denied for table" → RLS policy bloqueando acesso
5. "foreign key constraint" → Tentando deletar registro com dependências

${existingSolutions.length > 0 ? `
SOLUÇÕES ANTERIORES QUE FUNCIONARAM PARA ERROS SIMILARES:
${existingSolutions.map((s, i) => `${i + 1}. [${s.error_category}] Eficácia: ${(s.effectiveness_score * 100).toFixed(0)}%
   Solução: ${s.solution}
   ${s.prevention ? `Prevenção: ${s.prevention}` : ""}`).join("\n")}
` : ""}

${activeAlerts && activeAlerts.length > 0 ? `
⚠️ ALERTAS ATIVOS NO SISTEMA:
${activeAlerts.map(a => `- [${a.severity.toUpperCase()}] ${a.title}: ${a.description || "Sem descrição"}`).join("\n")}
` : ""}

${similarCount && similarCount > 0 ? `
📊 PADRÃO DE RECORRÊNCIA:
Este erro ocorreu ${similarCount + 1}x nas últimas 24 horas.
${similarErrors?.map(e => `  - ${new Date(e.timestamp).toLocaleString("pt-BR")}`).join("\n")}
` : ""}

INSTRUÇÕES:
Analise o erro e forneça um diagnóstico estruturado em português brasileiro.
Seja específico ao contexto do sistema Galli.
Se houver soluções anteriores que funcionaram, referencie-as.

FORMATO DA RESPOSTA (use markdown):

## 🔍 Causa Raiz
[Explique a causa provável do erro de forma clara e técnica, específica ao Galli]

## ⚡ Impacto no Sistema
[Descreva quais funcionalidades do Galli estão afetadas e a severidade]
${similarCount && similarCount > 0 ? `[Mencione que o erro é recorrente e o impacto acumulado]` : ""}

## 🛠️ Solução Recomendada
[Passos específicos e código se necessário para resolver o problema]
[Se houver solução anterior que funcionou, adapte-a ao contexto atual]

## 🛡️ Prevenção Futura
[Como evitar que este erro ocorra novamente no Galli]

${allContext.length > 0 ? `## 🔗 Correlação com Logs Relacionados
[Insights dos logs contextuais que ajudam a entender o problema]` : ""}

Seja conciso mas completo. Foque em ser útil para um desenvolvedor resolver o problema rapidamente.`;

    const userPrompt = `LOG PRINCIPAL (${mainLog.level}):
Serviço: ${mainLog.service}
Função: ${mainLog.function_name || "N/A"}
Categoria: ${mainLog.error_category || "Não classificado"}
Timestamp: ${mainLog.timestamp}
Request ID: ${mainLog.request_id || "N/A"}
User ID: ${mainLog.user_id || "N/A"}

Mensagem: ${mainLog.message}

Metadata: ${JSON.stringify(mainLog.metadata, null, 2)}

${allContext.length > 0 ? `LOGS CONTEXTUAIS (${allContext.length}):
${allContext.map(l => `[${new Date(l.timestamp).toLocaleTimeString("pt-BR")}] [${l.level}] ${l.service}: ${l.message.substring(0, 100)}`).join("\n")}` : ""}

${similarCount && similarCount > 0 ? `HISTÓRICO DE RECORRÊNCIA:
Este mesmo erro já ocorreu ${similarCount}x nas últimas 24 horas.` : ""}

Por favor, analise este erro e forneça o diagnóstico completo considerando todo o contexto.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2500,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const diagnosisText = aiData.choices?.[0]?.message?.content || "Não foi possível gerar diagnóstico.";

    // Parse sections from the diagnosis
    const extractSection = (text: string, header: string): string => {
      const regex = new RegExp(`## [^\\n]*${header}[^\\n]*\\n([\\s\\S]*?)(?=##|$)`, "i");
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

    const diagnosis = {
      log_id,
      diagnosis: diagnosisText,
      root_cause: extractSection(diagnosisText, "Causa Raiz"),
      impact: extractSection(diagnosisText, "Impacto"),
      solution: extractSection(diagnosisText, "Solução"),
      prevention: extractSection(diagnosisText, "Prevenção"),
      related_logs: allContext.map(l => l.id),
      created_by: user.id,
    };

    // Save diagnosis
    const { data: savedDiagnosis, error: saveError } = await supabase
      .from("ai_diagnostics")
      .insert(diagnosis)
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save diagnosis:", saveError);
    }

    // Update log with similar count
    if (similarCount && similarCount > 0) {
      await supabase
        .from("system_logs")
        .update({ similar_count: similarCount })
        .eq("id", log_id);
    }

    return new Response(
      JSON.stringify({ 
        diagnosis: savedDiagnosis || diagnosis, 
        cached: false,
        context: {
          relatedLogsCount: allContext.length,
          similarErrorsCount: similarCount || 0,
          existingSolutionsCount: existingSolutions.length,
          activeAlertsCount: activeAlerts?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Diagnostics error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
