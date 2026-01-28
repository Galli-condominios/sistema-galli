import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logger = createLogger('edge-function', 'delete-user');

interface DeleteUserRequest {
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
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

    // Get the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Não autorizado');
    }

    // Apply rate limiting based on user ID
    const clientId = getClientIdentifier(req, user.id);
    const rateLimitResult = checkRateLimit(clientId, RATE_LIMITS.STRICT);
    
    if (!rateLimitResult.allowed) {
      await logger.warn('Rate limit exceeded for user deletion', { userId: user.id, clientId }, user.id, requestId);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Get the requesting user's role
    const { data: requestingUserRoleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !requestingUserRoleData) {
      throw new Error('Permissão negada: role não encontrado');
    }

    const requestingUserRole = requestingUserRoleData.role;

    // Parse request body - accept both user_id and userId for compatibility
    const body = await req.json();
    const user_id = body.user_id || body.userId;

    // Validate required fields
    if (!user_id) {
      throw new Error('ID do usuário é obrigatório');
    }

    // Prevent self-deletion
    if (user_id === user.id) {
      throw new Error('Você não pode excluir sua própria conta');
    }

    // Get the target user's role
    const { data: targetUserRoleData, error: targetRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .single();

    if (targetRoleError || !targetUserRoleData) {
      throw new Error('Usuário não encontrado');
    }

    const targetUserRole = targetUserRoleData.role;

    // Validate hierarchical permissions
    if (requestingUserRole === 'administrador') {
      // Admin can delete anyone (already checked self-deletion above)
    } else if (requestingUserRole === 'sindico') {
      // Síndico can only delete porteiro and morador
      if (!['porteiro', 'morador'].includes(targetUserRole)) {
        throw new Error('Síndico só pode excluir Porteiro ou Morador');
      }
    } else if (requestingUserRole === 'porteiro') {
      // Porteiro can only delete morador
      if (targetUserRole !== 'morador') {
        throw new Error('Porteiro só pode excluir Morador');
      }
    } else {
      throw new Error('Você não tem permissão para excluir usuários');
    }

    // Delete the user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      await logger.error('Failed to delete user from auth', { error: deleteError.message, targetUserId: user_id }, user.id, requestId);
      throw deleteError;
    }

    await logger.info(`User deleted successfully`, { 
      deletedUserId: user_id, 
      deletedBy: user.id,
      deletedRole: targetUserRole
    }, user.id, requestId);

    return new Response(
      JSON.stringify({
        success: true, 
        message: 'Usuário excluído com sucesso'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          ...rateLimitHeaders(rateLimitResult),
          'Content-Type': 'application/json' 
        },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    await logger.error(`Delete user failed: ${errorMessage}`, { 
      error: error instanceof Error ? error.stack : String(error),
      ip: clientIP 
    }, undefined, requestId);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
