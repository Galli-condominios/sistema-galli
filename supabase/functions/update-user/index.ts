import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  checkRateLimit, 
  rateLimitResponse, 
  rateLimitHeaders,
  RATE_LIMITS, 
  getClientIdentifier 
} from "../_shared/rate-limiter.ts";
import { createLogger, generateRequestId, getClientIP } from "../_shared/system-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logger = createLogger('edge-function', 'update-user');

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await anonClient.auth.getUser();
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply rate limiting based on user ID
    const clientId = getClientIdentifier(req, requestingUser.id);
    const rateLimitResult = checkRateLimit(clientId, RATE_LIMITS.USER_MANAGEMENT);
    
    if (!rateLimitResult.allowed) {
      await logger.warn('Rate limit exceeded for user update', { userId: requestingUser.id, clientId }, requestingUser.id, requestId);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Check if requesting user has admin or sindico role
    const { data: userRoles, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    if (roleError || !userRoles || userRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestingUserRole = userRoles[0].role;
    if (!["administrador", "sindico"].includes(requestingUserRole)) {
      return new Response(JSON.stringify({ error: "Sem permissão para editar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, full_name, role } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "ID do usuário é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile
    if (full_name) {
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .update({ full_name })
        .eq("id", userId);

      if (profileError) {
        return new Response(JSON.stringify({ error: `Erro ao atualizar perfil: ${profileError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update role if provided
    if (role) {
      // Check role hierarchy
      if (requestingUserRole === "sindico" && ["administrador", "sindico"].includes(role)) {
        return new Response(JSON.stringify({ error: "Síndico não pode atribuir perfil de Administrador ou Síndico" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update in user_roles table
      const { error: roleUpdateError } = await supabaseClient
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (roleUpdateError) {
        return new Response(JSON.stringify({ error: `Erro ao atualizar perfil: ${roleUpdateError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Also update in profiles table
      const { error: profileRoleError } = await supabaseClient
        .from("profiles")
        .update({ role })
        .eq("id", userId);

      if (profileRoleError) {
        console.error("Error updating profile role:", profileRoleError);
      }
    }

    await logger.info(`User updated successfully`, { 
      updatedUserId: userId, 
      updatedBy: requestingUser.id,
      changes: { full_name: !!full_name, role: !!role }
    }, requestingUser.id, requestId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        ...rateLimitHeaders(rateLimitResult),
        "Content-Type": "application/json" 
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    await logger.error(`Update user failed: ${errorMessage}`, { 
      error: error instanceof Error ? error.stack : String(error),
      ip: clientIP 
    }, undefined, requestId);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
