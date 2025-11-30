/**
 * Rate Limiting
 *
 * Protects against abuse and DoS attacks (OWASP #9)
 * Implements token bucket algorithm for rate limiting
 *
 * In production, this should use Redis for distributed rate limiting.
 * This implementation uses in-memory storage for development.
 *
 * Security benefits:
 * - Prevent brute force attacks
 * - Protect against DoS
 * - Limit API abuse
 * - Enforce fair usage
 */

import { RATE_LIMITS } from '@/config/constants';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  points: number; // Number of requests allowed
  duration: number; // Time window in seconds
  blockDuration?: number; // How long to block after exceeding limit (seconds)
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  points: number; // Remaining points
  resetTime: number; // When points reset (timestamp)
  blockedUntil?: number; // When block expires (timestamp)
}

/**
 * In-memory store for rate limits
 * In production, replace with Redis for distributed systems
 */
const store = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 * Prevents memory leaks in long-running processes
 */
setInterval(
  () => {
    const now = Date.now();

    for (const [key, entry] of store.entries()) {
      // Remove expired entries (5 minutes after reset)
      if (entry.resetTime < now - 5 * 60 * 1000) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000
); // Run every 5 minutes

/**
 * Check rate limit for a key
 *
 * @param key - Unique identifier (e.g., "auth:login:192.168.1.1" or "api:wallet:user123")
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining points
 *
 * @example
 * const result = await checkRateLimit(
 *   `auth:login:${ipAddress}`,
 *   RATE_LIMITS.AUTH_LOGIN
 * );
 *
 * if (!result.allowed) {
 *   throw new Error('Too many requests. Please try again later.');
 * }
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blockedUntil?: number;
}> {
  const now = Date.now();
  const entry = store.get(key);

  // Check if currently blocked
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      blockedUntil: entry.blockedUntil,
    };
  }

  // Initialize or reset if window expired
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      points: config.points - 1,
      resetTime: now + config.duration * 1000,
    };

    store.set(key, newEntry);

    return {
      allowed: true,
      remaining: newEntry.points,
      resetTime: newEntry.resetTime,
    };
  }

  // Consume a point
  entry.points -= 1;

  // Check if limit exceeded
  if (entry.points < 0) {
    // Apply block if configured
    if (config.blockDuration) {
      entry.blockedUntil = now + config.blockDuration * 1000;
    }

    store.set(key, entry);

    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      blockedUntil: entry.blockedUntil,
    };
  }

  store.set(key, entry);

  return {
    allowed: true,
    remaining: entry.points,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limit middleware for API routes
 *
 * @param key - Rate limit key (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @throws Error if rate limit exceeded
 *
 * @example
 * // In API route:
 * await requireRateLimit(
 *   `api:wallet:${userId}`,
 *   RATE_LIMITS.API_WALLET_CREATE
 * );
 */
export async function requireRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<void> {
  const result = await checkRateLimit(key, config);

  if (!result.allowed) {
    const resetDate = new Date(result.resetTime);
    const blockedDate = result.blockedUntil ? new Date(result.blockedUntil) : null;

    let message = 'Too many requests. ';

    if (blockedDate) {
      message += `You are blocked until ${blockedDate.toLocaleTimeString()}.`;
    } else {
      message += `Please try again after ${resetDate.toLocaleTimeString()}.`;
    }

    throw new Error(message);
  }
}

/**
 * Rate limit by IP address
 *
 * Convenience function for IP-based rate limiting
 *
 * @param ipAddress - Client IP address
 * @param action - Action identifier (e.g., "login", "signup")
 * @param config - Rate limit configuration
 * @throws Error if rate limit exceeded
 */
export async function rateLimitByIP(
  ipAddress: string,
  action: string,
  config: RateLimitConfig
): Promise<void> {
  const key = `ip:${action}:${ipAddress}`;
  await requireRateLimit(key, config);
}

/**
 * Rate limit by user ID
 *
 * Convenience function for user-based rate limiting
 *
 * @param userId - User ID
 * @param action - Action identifier (e.g., "wallet:create")
 * @param config - Rate limit configuration
 * @throws Error if rate limit exceeded
 */
export async function rateLimitByUser(
  userId: string,
  action: string,
  config: RateLimitConfig
): Promise<void> {
  const key = `user:${action}:${userId}`;
  await requireRateLimit(key, config);
}

/**
 * Reset rate limit for a key
 *
 * Useful for testing or manual intervention
 *
 * @param key - Rate limit key to reset
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Get rate limit status without consuming a point
 *
 * @param key - Rate limit key
 * @returns Current rate limit status
 */
export function getRateLimitStatus(key: string): {
  remaining: number;
  resetTime: number | null;
  isBlocked: boolean;
} {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    return {
      remaining: 0,
      resetTime: null,
      isBlocked: false,
    };
  }

  const isBlocked = !!(entry.blockedUntil && entry.blockedUntil > now);

  return {
    remaining: Math.max(0, entry.points),
    resetTime: entry.resetTime,
    isBlocked,
  };
}

/**
 * Clear all rate limit data
 *
 * WARNING: Only use in development/testing
 */
export function clearAllRateLimits(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot clear rate limits in production');
  }

  store.clear();
}

// Export rate limit configurations for convenience
export { RATE_LIMITS };
