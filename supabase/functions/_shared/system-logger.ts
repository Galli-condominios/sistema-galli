import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface LogEntry {
  level: LogLevel;
  service: string;
  message: string;
  function_name?: string;
  metadata?: Record<string, unknown>;
  user_id?: string;
  ip_address?: string;
  request_id?: string;
}

export async function logToSystem(entry: LogEntry): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[SystemLogger] Missing Supabase credentials");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from("system_logs").insert({
      level: entry.level,
      service: entry.service,
      message: entry.message,
      function_name: entry.function_name,
      metadata: entry.metadata || {},
      user_id: entry.user_id,
      ip_address: entry.ip_address,
      request_id: entry.request_id,
    });

    if (error) {
      console.error("[SystemLogger] Failed to insert log:", error);
    }
  } catch (err) {
    console.error("[SystemLogger] Exception:", err);
  }
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         req.headers.get("x-real-ip") ||
         "unknown";
}

// Helper para criar um logger contextualizado
export function createLogger(service: string, functionName?: string) {
  return {
    debug: (message: string, metadata?: Record<string, unknown>, userId?: string, requestId?: string) =>
      logToSystem({ level: 'DEBUG', service, function_name: functionName, message, metadata, user_id: userId, request_id: requestId }),
    
    info: (message: string, metadata?: Record<string, unknown>, userId?: string, requestId?: string) =>
      logToSystem({ level: 'INFO', service, function_name: functionName, message, metadata, user_id: userId, request_id: requestId }),
    
    warn: (message: string, metadata?: Record<string, unknown>, userId?: string, requestId?: string) =>
      logToSystem({ level: 'WARN', service, function_name: functionName, message, metadata, user_id: userId, request_id: requestId }),
    
    error: (message: string, metadata?: Record<string, unknown>, userId?: string, requestId?: string) =>
      logToSystem({ level: 'ERROR', service, function_name: functionName, message, metadata, user_id: userId, request_id: requestId }),
    
    critical: (message: string, metadata?: Record<string, unknown>, userId?: string, requestId?: string) =>
      logToSystem({ level: 'CRITICAL', service, function_name: functionName, message, metadata, user_id: userId, request_id: requestId }),
  };
}
