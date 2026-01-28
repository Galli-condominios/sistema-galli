import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FetchLogsRequest {
  limit?: number;
  offset?: number;
  level?: string;
  service?: string;
  search?: string;
  period?: "1h" | "24h" | "7d" | "30d" | "all";
  include_metrics?: boolean;
}

// Helper to verify SuperAdmin JWT token
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

async function verifySuperAdminToken(token: string, secretKey: string): Promise<{ valid: boolean; payload?: any }> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false };

    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    
    let isAuthorized = false;

    // First, try to verify as SuperAdmin token
    const superAdminResult = await verifySuperAdminToken(token, supabaseServiceKey);
    if (superAdminResult.valid && superAdminResult.payload?.type === "superadmin") {
      isAuthorized = true;
    }

    // If not SuperAdmin, try regular Supabase auth
    if (!isAuthorized) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (!authError && user) {
        // Check if user is admin/sindico
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (roleData && ["administrador", "sindico"].includes(roleData.role)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const params: FetchLogsRequest = await req.json().catch(() => ({}));
    const {
      limit = 100,
      offset = 0,
      level,
      service,
      search,
      period = "24h",
      include_metrics = true,
    } = params;

    // Calculate time filter
    let timeFilter: Date | null = null;
    switch (period) {
      case "1h":
        timeFilter = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case "24h":
        timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        timeFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        timeFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeFilter = null;
    }

    // Build query
    let query = supabase
      .from("system_logs")
      .select("*", { count: "exact" })
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (timeFilter) {
      query = query.gte("timestamp", timeFilter.toISOString());
    }

    if (level) {
      query = query.eq("level", level);
    }

    if (service) {
      query = query.eq("service", service);
    }

    if (search) {
      query = query.or(`message.ilike.%${search}%,service.ilike.%${search}%,function_name.ilike.%${search}%`);
    }

    const { data: logs, count, error: logsError } = await query;

    if (logsError) {
      throw logsError;
    }

    let metrics = null;
    if (include_metrics) {
      // Calculate metrics for the last 15 minutes
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      // Get error rate
      const { count: totalRecent } = await supabase
        .from("system_logs")
        .select("*", { count: "exact", head: true })
        .gte("timestamp", fifteenMinAgo);

      const { count: errorsRecent } = await supabase
        .from("system_logs")
        .select("*", { count: "exact", head: true })
        .gte("timestamp", fifteenMinAgo)
        .in("level", ["ERROR", "CRITICAL"]);

      // Get unique services with issues
      const { data: servicesWithIssues } = await supabase
        .from("system_logs")
        .select("service")
        .gte("timestamp", fifteenMinAgo)
        .in("level", ["ERROR", "CRITICAL"]);

      const uniqueServicesWithIssues = new Set(servicesWithIssues?.map(s => s.service) || []);

      // Calculate average latency from metadata (if available)
      const { data: latencyLogs } = await supabase
        .from("system_logs")
        .select("metadata")
        .gte("timestamp", fifteenMinAgo)
        .not("metadata->latency_ms", "is", null)
        .limit(100);

      let avgLatency = 0;
      if (latencyLogs && latencyLogs.length > 0) {
        const latencies = latencyLogs
          .map(l => (l.metadata as any)?.latency_ms)
          .filter(l => typeof l === "number");
        if (latencies.length > 0) {
          avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
        }
      }

      // Get count by level for the selected period
      const { data: levelCounts } = await supabase
        .from("system_logs")
        .select("level")
        .gte("timestamp", timeFilter?.toISOString() || new Date(0).toISOString());

      const countByLevel: Record<string, number> = {};
      levelCounts?.forEach(l => {
        countByLevel[l.level] = (countByLevel[l.level] || 0) + 1;
      });

      // Get count by service for the selected period
      const { data: serviceCounts } = await supabase
        .from("system_logs")
        .select("service")
        .gte("timestamp", timeFilter?.toISOString() || new Date(0).toISOString());

      const countByService: Record<string, number> = {};
      serviceCounts?.forEach(s => {
        countByService[s.service] = (countByService[s.service] || 0) + 1;
      });

      // Determine system status
      let systemStatus: "healthy" | "degraded" | "critical" = "healthy";
      const errorRate = totalRecent && totalRecent > 0 ? ((errorsRecent || 0) / totalRecent) * 100 : 0;
      
      if (errorRate > 10 || uniqueServicesWithIssues.size >= 3) {
        systemStatus = "critical";
      } else if (errorRate > 2 || uniqueServicesWithIssues.size >= 1) {
        systemStatus = "degraded";
      }

      metrics = {
        systemStatus,
        errorRate: errorRate.toFixed(2),
        avgLatency: avgLatency || "N/A",
        totalLogs: count || 0,
        errorsCount: errorsRecent || 0,
        servicesWithIssues: Array.from(uniqueServicesWithIssues),
        countByLevel,
        countByService,
        lastUpdated: new Date().toISOString(),
      };
    }

    return new Response(
      JSON.stringify({
        logs: logs || [],
        total: count || 0,
        metrics,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Fetch logs error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
