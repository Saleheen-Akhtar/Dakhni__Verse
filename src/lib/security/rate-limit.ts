interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Clean up expired rate limit records periodically
 */
function cleanupExpiredRecords(now: number) {
  if (rateLimitStore.size > 1000) {
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Checks if a given identifier (e.g., client IP) has exceeded the rate limit.
 *
 * @param key Unique identifier (IP address, user ID, etc.)
 * @param limit Maximum number of requests allowed in the window (default 5)
 * @param windowMs Time window in milliseconds (default 10 minutes)
 * @returns { success: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 10 * 60 * 1000
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  cleanupExpiredRecords(now);

  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      success: true,
      remaining: limit - 1,
      resetTime,
    };
  }

  if (existing.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: existing.resetTime,
    };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: limit - existing.count,
    resetTime: existing.resetTime,
  };
}
