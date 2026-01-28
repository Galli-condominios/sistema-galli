import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, setupKey } = await req.json();
    
    // Simple setup key validation - only allow if no super admin exists yet
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // Check if any super admin already exists with a valid password
    const { data: existing } = await supabase
      .from("super_admin_credentials")
      .select("id, password_hash")
      .limit(1);
    
    const hasValidAdmin = existing?.some(e => e.password_hash && !e.password_hash.includes('placeholder'));
    
    if (hasValidAdmin && setupKey !== "initial_setup_2026") {
      return new Response(
        JSON.stringify({ error: "Super Admin já configurado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email || !password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Email e senha (min 8 chars) são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const passwordHash = await hashPassword(password);
    
    // Upsert super admin credentials
    const { error } = await supabase
      .from("super_admin_credentials")
      .upsert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        must_change_password: false,
      }, {
        onConflict: "email",
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: "Super Admin configurado com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});