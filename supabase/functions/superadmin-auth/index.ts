import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger, generateRequestId, getClientIP } from "../_shared/system-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger('edge-function', 'superadmin-auth');

// Simple JWT implementation for Super Admin
const SECRET_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

async function createToken(payload: object): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + 8 * 60 * 60, // 8 hours
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(tokenPayload));
  const data = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const signatureB64 = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${data}.${signatureB64}`;
}

async function verifyToken(token: string): Promise<{ valid: boolean; payload?: any }> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false };

    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(SECRET_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signature = Uint8Array.from(
      base64UrlDecode(signatureB64),
      (c) => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(data)
    );

    if (!valid) return { valid: false };

    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

// Simple password hashing using SHA-256 with salt
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(password + saltHex);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // SECURITY FIX: Require password migration - no more fallback to plain text
  // If hash starts with bcrypt placeholder, it means password was never properly set
  if (storedHash.startsWith('$2a$')) {
    // Force password change on first login
    return false;
  }
  
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return computedHash === hash;
}

serve(async (req) => {
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (action === "login" && req.method === "POST") {
      const { email, password } = await req.json();

      if (!email || !password) {
        await logger.warn('Tentativa de login sem credenciais', { clientIP }, undefined, requestId);
        return new Response(
          JSON.stringify({ error: "Email e senha são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: credentials, error } = await supabase
        .from("super_admin_credentials")
        .select("*")
        .eq("email", email.toLowerCase())
        .single();

      if (error || !credentials) {
        await logger.warn('Tentativa de login com email inválido', { 
          email: email.toLowerCase(),
          clientIP,
        }, undefined, requestId);
        return new Response(
          JSON.stringify({ error: "Credenciais inválidas" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validPassword = await verifyPassword(password, credentials.password_hash);
      if (!validPassword) {
        await logger.error('Tentativa de login com senha inválida', { 
          email: email.toLowerCase(),
          clientIP,
          requiresPasswordReset: credentials.password_hash.startsWith('$2a$'),
        }, undefined, requestId);
        
        // If password is still bcrypt placeholder, inform about reset requirement
        if (credentials.password_hash.startsWith('$2a$')) {
          return new Response(
            JSON.stringify({ error: "Senha inicial expirada. Entre em contato com o suporte para redefinir." }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: "Credenciais inválidas" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update last login
      await supabase
        .from("super_admin_credentials")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", credentials.id);

      const token = await createToken({
        sub: credentials.id,
        email: credentials.email,
        type: "superadmin",
      });

      await logger.info('Login de SuperAdmin bem-sucedido', { 
        email: credentials.email,
        clientIP,
      }, undefined, requestId);

      return new Response(
        JSON.stringify({
          token,
          email: credentials.email,
          expiresAt: Date.now() + 8 * 60 * 60 * 1000,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.substring(7);
      const { valid, payload } = await verifyToken(token);

      if (!valid || payload?.type !== "superadmin") {
        await logger.warn('Token de SuperAdmin inválido ou expirado', { clientIP }, undefined, requestId);
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ valid: true, email: payload.email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "change-password" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.substring(7);
      const { valid, payload } = await verifyToken(token);

      if (!valid || payload?.type !== "superadmin") {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { currentPassword, newPassword } = await req.json();

      if (!currentPassword || !newPassword) {
        return new Response(
          JSON.stringify({ error: "Senhas são obrigatórias" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ error: "Nova senha deve ter pelo menos 8 caracteres" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: credentials, error } = await supabase
        .from("super_admin_credentials")
        .select("*")
        .eq("id", payload.sub)
        .single();

      if (error || !credentials) {
        return new Response(
          JSON.stringify({ error: "Credenciais não encontradas" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validPassword = await verifyPassword(currentPassword, credentials.password_hash);
      if (!validPassword) {
        await logger.warn('Tentativa de alteração de senha com senha atual incorreta', { 
          email: payload.email,
          clientIP,
        }, undefined, requestId);
        return new Response(
          JSON.stringify({ error: "Senha atual incorreta" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newHash = await hashPassword(newPassword);
      await supabase
        .from("super_admin_credentials")
        .update({ password_hash: newHash, must_change_password: false })
        .eq("id", credentials.id);

      await logger.info('Senha de SuperAdmin alterada com sucesso', { 
        email: payload.email,
        clientIP,
      }, undefined, requestId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "change-email" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.substring(7);
      const { valid, payload } = await verifyToken(token);

      if (!valid || payload?.type !== "superadmin") {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { newEmail, password } = await req.json();

      if (!newEmail || !password) {
        return new Response(
          JSON.stringify({ error: "Email e senha são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: credentials, error } = await supabase
        .from("super_admin_credentials")
        .select("*")
        .eq("id", payload.sub)
        .single();

      if (error || !credentials) {
        return new Response(
          JSON.stringify({ error: "Credenciais não encontradas" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validPassword = await verifyPassword(password, credentials.password_hash);
      if (!validPassword) {
        await logger.warn('Tentativa de alteração de email com senha incorreta', { 
          email: payload.email,
          newEmail: newEmail.toLowerCase(),
          clientIP,
        }, undefined, requestId);
        return new Response(
          JSON.stringify({ error: "Senha incorreta" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("super_admin_credentials")
        .update({ email: newEmail.toLowerCase() })
        .eq("id", credentials.id);

      // Generate new token with updated email
      const newToken = await createToken({
        sub: credentials.id,
        email: newEmail.toLowerCase(),
        type: "superadmin",
      });

      await logger.info('Email de SuperAdmin alterado com sucesso', { 
        oldEmail: payload.email,
        newEmail: newEmail.toLowerCase(),
        clientIP,
      }, undefined, requestId);

      return new Response(
        JSON.stringify({ success: true, token: newToken, email: newEmail.toLowerCase() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Force password reset (for admin recovery)
    if (action === "force-reset" && req.method === "POST") {
      const { email, newPassword, adminSecret } = await req.json();
      
      // Require a special admin secret for this operation
      const expectedSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(-16);
      if (adminSecret !== expectedSecret) {
        await logger.critical('Tentativa de reset forçado com secret inválido', { 
          email,
          clientIP,
        }, undefined, requestId);
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!email || !newPassword || newPassword.length < 8) {
        return new Response(
          JSON.stringify({ error: "Email e nova senha (min 8 chars) são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newHash = await hashPassword(newPassword);
      const { error } = await supabase
        .from("super_admin_credentials")
        .update({ password_hash: newHash, must_change_password: true })
        .eq("email", email.toLowerCase());

      if (error) {
        throw error;
      }

      await logger.info('Reset forçado de senha de SuperAdmin', { 
        email: email.toLowerCase(),
        clientIP,
      }, undefined, requestId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Endpoint não encontrado" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    await logger.critical('Erro crítico em superadmin-auth', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      clientIP,
    }, undefined, requestId);
    
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
