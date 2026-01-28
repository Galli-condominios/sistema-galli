import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger, generateRequestId, getClientIP } from "../_shared/system-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger('edge-function', 'manage-org-ai-config');

// Simple encryption using Web Crypto API
async function encryptApiKey(apiKey: string): Promise<string> {
  const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!encryptionKey) throw new Error("Encryption key not configured");
  
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const keyData = encoder.encode(encryptionKey.slice(0, 32).padEnd(32, "0"));
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data
  );
  
  // Combine IV + encrypted data and encode as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decryptApiKey(encryptedKey: string): Promise<string> {
  const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!encryptionKey) throw new Error("Encryption key not configured");
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(encryptionKey.slice(0, 32).padEnd(32, "0"));
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "***";
  return apiKey.slice(0, 4) + "..." + apiKey.slice(-4);
}

serve(async (req) => {
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const startTime = performance.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      await logger.warn('Tentativa de acesso sem autorização', { clientIP }, undefined, requestId);
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      await logger.warn('Token inválido', { 
        error: authError?.message,
        clientIP,
      }, undefined, requestId);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's organization (must be owner or admin)
    const { data: orgMember, error: orgError } = await supabase
      .from("user_organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"])
      .single();

    if (orgError || !orgMember) {
      await logger.warn('Usuário sem permissão de organização', { 
        userId: user.id,
        clientIP,
      }, user.id, requestId);
      return new Response(JSON.stringify({ error: "Você não tem permissão para gerenciar esta organização" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const organizationId = orgMember.organization_id;

    if (req.method === "GET") {
      await logger.info('Buscando configuração de IA da organização', { 
        organizationId,
        userId: user.id,
      }, user.id, requestId);

      // Get current AI config from separate secure table
      const { data: config, error } = await supabase
        .from("organization_ai_config")
        .select("ai_provider, ai_model, ai_api_key_encrypted")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error) throw error;

      const latencyMs = Math.round(performance.now() - startTime);
      await logger.info('Configuração de IA retornada', { 
        hasConfig: !!config,
        latency_ms: latencyMs,
      }, user.id, requestId);

      return new Response(JSON.stringify({
        provider: config?.ai_provider || "lovable",
        model: config?.ai_model || "google/gemini-3-flash-preview",
        hasApiKey: !!config?.ai_api_key_encrypted,
        maskedKey: config?.ai_api_key_encrypted 
          ? maskApiKey(await decryptApiKey(config.ai_api_key_encrypted))
          : null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { apiKey, provider, model } = await req.json();

      await logger.info('Atualizando configuração de IA da organização', { 
        organizationId,
        provider,
        model,
        hasApiKey: !!apiKey,
        userId: user.id,
      }, user.id, requestId);

      // Encrypt the API key if provided
      let encryptedKey = null;
      if (apiKey) {
        encryptedKey = await encryptApiKey(apiKey);
      }

      // Upsert to organization_ai_config table
      const { error } = await supabase
        .from("organization_ai_config")
        .upsert({
          organization_id: organizationId,
          ai_provider: provider || "lovable",
          ai_model: model || "google/gemini-3-flash-preview",
          ai_api_key_encrypted: encryptedKey,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "organization_id",
        });

      if (error) throw error;

      const latencyMs = Math.round(performance.now() - startTime);
      await logger.info('Configuração de IA salva com sucesso', { 
        organizationId,
        latency_ms: latencyMs,
      }, user.id, requestId);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Configuração salva com sucesso",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      await logger.info('Resetando configuração de IA da organização', { 
        organizationId,
        userId: user.id,
      }, user.id, requestId);

      // Delete AI config (reverts to default Lovable AI)
      const { error } = await supabase
        .from("organization_ai_config")
        .delete()
        .eq("organization_id", organizationId);

      if (error) throw error;

      const latencyMs = Math.round(performance.now() - startTime);
      await logger.info('Configuração de IA resetada', { 
        organizationId,
        latency_ms: latencyMs,
      }, user.id, requestId);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Configuração resetada para Lovable AI",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    
    await logger.error('Erro em manage-org-ai-config', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      latency_ms: latencyMs,
      clientIP,
    }, undefined, requestId);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
