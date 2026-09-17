import { createClient as createSupabaseClient } from '@supabase/supabase-js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

function checkMemoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = memoryStore.get(key);
  if (!existing || now > existing.resetTime) {
    const resetTime = now + windowMs;
    memoryStore.set(key, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }
  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetTime: existing.resetTime };
  }
  existing.count += 1;
  return { success: true, remaining: limit - existing.count, resetTime: existing.resetTime };
}

/**
 * Checks if a given identifier (e.g., client IP) has exceeded rate limits.
 * Uses atomic PostgreSQL check_rate_limit_rpc across distributed serverless instances,
 * with optional Upstash Redis REST support and graceful memory fallback.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 10 * 60 * 1000
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const windowSeconds = Math.ceil(windowMs / 1000);

  // 1. Optional Upstash Redis check if configured via environment
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) {
    try {
      const resp = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}` },
        body: JSON.stringify([
          ['INCR', `rl:${key}`],
          ['EXPIRE', `rl:${key}`, windowSeconds, 'NX'],
          ['PTTL', `rl:${key}`],
        ]),
      });
      if (resp.ok) {
        const results = await resp.json();
        const currentCount = Number(results?.[0]?.result || 1);
        const pttl = Number(results?.[2]?.result || windowMs);
        const resetTime = Date.now() + (pttl > 0 ? pttl : windowMs);
        return {
          success: currentCount <= limit,
          remaining: Math.max(0, limit - currentCount),
          resetTime,
        };
      }
    } catch (upstashErr) {
      console.warn('Upstash rate limit failed, falling back to PostgreSQL:', upstashErr);
    }
  }

  // 2. Centralized PostgreSQL atomic RPC check
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    try {
      const supabase = createSupabaseClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase.rpc('check_rate_limit_rpc', {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });

      if (!error && data && typeof data.success === 'boolean') {
        return {
          success: data.success,
          remaining: Number(data.remaining ?? 0),
          resetTime: Number(data.reset_time ?? (Date.now() + windowMs)),
        };
      }
    } catch (dbErr) {
      console.warn('Postgres rate limit check error, falling back to memory:', dbErr);
    }
  }

  // 3. In-memory fallback
  return checkMemoryRateLimit(key, limit, windowMs);
}
