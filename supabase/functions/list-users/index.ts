import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger, generateRequestId, getClientIP } from "../_shared/system-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logger = createLogger('edge-function', 'list-users');

serve(async (req) => {
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const startTime = performance.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      await logger.warn('Tentativa de acesso sem autorização', { clientIP }, undefined, requestId);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Validate JWT using getClaims
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      await logger.warn('Token inválido', { 
        error: claimsError?.message,
        clientIP,
      }, undefined, requestId);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const userId = claimsData.claims.sub;

    // Verify user has admin permissions
    const { data: userRoleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError || !userRoleData) {
      await logger.warn('Usuário sem role definido', { 
        userId,
        error: roleError?.message,
        clientIP,
      }, undefined, requestId);
      return new Response(
        JSON.stringify({ error: 'Permissão negada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const userRole = userRoleData.role;
    if (!['administrador', 'sindico'].includes(userRole)) {
      await logger.warn('Tentativa de acesso não autorizado', { 
        userId,
        userRole,
        clientIP,
      }, undefined, requestId);
      return new Response(
        JSON.stringify({ error: 'Apenas administradores e síndicos podem listar usuários' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    await logger.info('Listando usuários', { 
      userId,
      userRole,
      clientIP,
    }, userId, requestId);

    // Fetch all users from auth with admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    // Fetch all profiles including last_seen_at
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, created_at, last_seen_at")
      .order("created_at", { ascending: false });

    if (profilesError) throw profilesError;
    
    // Fetch all user roles
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) throw rolesError;

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a map of user_id -> role for quick lookup
    const roleMap = new Map(userRoles?.map((ur: any) => [ur.user_id, ur.role]) || []);

    // Calculate online status (active in last 5 minutes)
    const FIVE_MINUTES = 5 * 60 * 1000;
    const now = Date.now();

    // Map profiles with auth user emails, roles and presence info
    const users = profiles.map((profile: any) => {
      const authUser = authData.users.find((u: any) => u.id === profile.id);
      const lastSeenAt = profile.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0;
      const isOnline = lastSeenAt > now - FIVE_MINUTES;
      
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: authUser?.email || "",
        role: roleMap.get(profile.id) || "",
        created_at: profile.created_at,
        last_seen_at: profile.last_seen_at,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        is_online: isOnline,
      };
    });

    const latencyMs = Math.round(performance.now() - startTime);

    await logger.info('Lista de usuários retornada', { 
      usersCount: users.length,
      latency_ms: latencyMs,
    }, userId, requestId);

    return new Response(JSON.stringify(users), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    await logger.error('Erro ao listar usuários', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      latency_ms: latencyMs,
      clientIP,
    }, undefined, requestId);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
