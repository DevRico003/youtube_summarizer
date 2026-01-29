/**
 * Simple in-memory rate limiting for API routes
 * Limits requests per user to prevent brute-force attacks
 *
 * NOTE: This in-memory store resets on server restart and doesn't sync
 * across multiple instances. For horizontal scaling, consider Redis or Vercel KV.
 * Current approach is acceptable for single-instance deployments and as
 * defense-in-depth (not the sole security measure).
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 10; // 10 requests per minute

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the client (typically IP address)
 * @param maxRequests - Maximum requests allowed in the window (default: 10)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Object with allowed status and optional retry-after time
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS
): { allowed: boolean; retryAfterMs?: number; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    cleanupExpiredEntries();
  }

  if (!entry || now > entry.resetTime) {
    // First request or window expired - create new entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      retryAfterMs: entry.resetTime - now,
      remaining: 0,
    };
  }

  // Increment counter
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Clean up expired entries to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

/**
 * Reset rate limit for a specific identifier (useful for testing)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Clear all rate limit entries (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
