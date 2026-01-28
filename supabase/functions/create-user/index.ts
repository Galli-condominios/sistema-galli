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

const logger = createLogger('edge-function', 'create-user');

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: 'owner' | 'administrador' | 'sindico' | 'porteiro' | 'morador';
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
    const rateLimitResult = checkRateLimit(clientId, RATE_LIMITS.USER_MANAGEMENT);
    
    if (!rateLimitResult.allowed) {
      await logger.warn('Rate limit exceeded for user creation', { userId: user.id, clientId }, user.id, requestId);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Get the requesting user's role
    const { data: userRoleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRoleData) {
      throw new Error('Permissão negada: role não encontrado');
    }

    const requestingUserRole = userRoleData.role;

    // Parse request body
    const { email, password, full_name, role }: CreateUserRequest = await req.json();

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      throw new Error('Campos obrigatórios faltando');
    }

    // Validate hierarchical permissions
    if (requestingUserRole === 'owner') {
      // Owner can create anyone including other owners
      if (!['owner', 'administrador', 'sindico', 'porteiro', 'morador'].includes(role)) {
        throw new Error('Role inválido');
      }
    } else if (requestingUserRole === 'administrador') {
      // Admin can create anyone except owner
      if (!['administrador', 'sindico', 'porteiro', 'morador'].includes(role)) {
        throw new Error('Role inválido');
      }
    } else if (requestingUserRole === 'sindico') {
      // Síndico can only create porteiro and morador
      if (!['porteiro', 'morador'].includes(role)) {
        throw new Error('Síndico só pode criar Porteiro ou Morador');
      }
    } else if (requestingUserRole === 'porteiro') {
      // Porteiro can only create morador
      if (role !== 'morador') {
        throw new Error('Porteiro só pode criar Morador');
      }
    } else {
      throw new Error('Você não tem permissão para criar usuários');
    }

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
      }
    });

    if (createError) {
      await logger.error('Failed to create user in auth', { error: createError.message, email }, user.id, requestId);
      throw createError;
    }

    await logger.info(`User created successfully: ${email}`, { 
      newUserId: newUser.user.id, 
      role, 
      createdBy: user.id 
    }, user.id, requestId);

    // The trigger handle_new_user should automatically create profile and user_role
    // But let's verify and create if needed
    const { error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', newUser.user.id)
      .single();

    if (profileCheckError) {
      // Profile doesn't exist, create it
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUser.user.id,
          full_name,
          role,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

    const { error: roleCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', newUser.user.id)
      .single();

    if (roleCheckError) {
      // Role doesn't exist, create it
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role,
        });

      if (roleInsertError) {
        console.error('Error creating user_role:', roleInsertError);
      }
    }

    // Link new user to the same organizations as the creator
    const { data: creatorOrgs, error: orgsError } = await supabaseAdmin
      .from('user_organization_members')
      .select('organization_id')
      .eq('user_id', user.id);

    if (orgsError) {
      console.error('Error fetching creator orgs:', orgsError);
    }

    // Determine organizational role based on system role
    const orgRole = ['owner', 'administrador', 'sindico'].includes(role) ? 'admin' : 'member';

    // Link new user to each organization
    if (creatorOrgs && creatorOrgs.length > 0) {
      for (const org of creatorOrgs) {
        const { error: memberError } = await supabaseAdmin
          .from('user_organization_members')
          .insert({
            user_id: newUser.user.id,
            organization_id: org.organization_id,
            role: orgRole,
          });

        if (memberError) {
          console.error('Error adding org member:', memberError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        }
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
    await logger.error(`Create user failed: ${errorMessage}`, { 
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
