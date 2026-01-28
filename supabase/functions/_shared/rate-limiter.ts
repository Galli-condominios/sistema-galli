/**
 * Simple in-memory rate limiter for Edge Functions
 * Uses a sliding window approach with configurable limits
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on function cold start, which is acceptable for edge functions)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the client (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns RateLimitResult indicating if request is allowed
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  let entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Create a 429 Too Many Requests response
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: "Muitas requisições. Tente novamente em alguns segundos.",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...rateLimitHeaders(result),
        "Content-Type": "application/json",
      },
    }
  );
}

// Preset configurations for different endpoints
export const RATE_LIMITS = {
  /** Auth operations: 5 requests per minute */
  AUTH: { maxRequests: 5, windowSeconds: 60 },
  /** User management: 10 requests per minute */
  USER_MANAGEMENT: { maxRequests: 10, windowSeconds: 60 },
  /** AI Assistant: 20 requests per minute */
  AI_ASSISTANT: { maxRequests: 20, windowSeconds: 60 },
  /** General API: 60 requests per minute */
  GENERAL: { maxRequests: 60, windowSeconds: 60 },
  /** Strict: 3 requests per minute (for sensitive operations) */
  STRICT: { maxRequests: 3, windowSeconds: 60 },
} as const;

/**
 * Extract client identifier from request
 * Prefers user ID from auth header, falls back to IP or generates random
 */
export function getClientIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from headers (Supabase Edge Functions)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    return `ip:${ip}`;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return `ip:${realIp}`;
  }

  // Fallback to a combination of user-agent and random suffix
  const userAgent = req.headers.get("user-agent") || "unknown";
  return `ua:${userAgent.substring(0, 50)}`;
}
