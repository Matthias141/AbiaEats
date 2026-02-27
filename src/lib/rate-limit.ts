/**
 * FIX: HIGH-3 — No rate limiting on auth endpoints.
 *
 * WHY THIS MATTERS (intern explainer):
 * Without rate limiting, an attacker can try millions of passwords per second
 * against your login endpoint. This is called "brute force" or "credential stuffing"
 * (using leaked passwords from OTHER sites to try on YOUR site).
 *
 * This fix uses Upstash Redis — a fast, serverless Redis database — to count
 * how many requests came from each IP address. If too many arrive in a short
 * window, we reject with HTTP 429 (Too Many Requests).
 *
 * SETUP STEPS (follow these BEFORE this code works):
 * 1. Go to https://upstash.com → Create a Redis database → Copy REST URL + Token
 * 2. Add to .env:
 *      UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *      UPSTASH_REDIS_REST_TOKEN=AXxx...
 * 3. Install: npm install @upstash/ratelimit @upstash/redis
 *
 * RATE LIMIT LOGIC:
 * - Login: 5 attempts per 15 minutes per IP
 * - Signup: 3 accounts per hour per IP
 * Both limits are "sliding window" — the window follows you, not a fixed clock.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Lazy-initialize so the module loads even without env vars during build
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv(); // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  }
  return redis;
}

// 5 login attempts per 15 minutes per IP
export const loginRateLimit = new Ratelimit({
  redis: {
    // Proxy pattern — only instantiate redis when first called
    evalsha: (...args) => getRedis().evalsha(...args),
    set: (...args) => getRedis().set(...args),
    get: (...args) => getRedis().get(...args),
  } as Redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: 'abiaeats:login',
});

// 3 signup attempts per hour per IP (prevents account farming)
export const signupRateLimit = new Ratelimit({
  redis: {
    evalsha: (...args) => getRedis().evalsha(...args),
    set: (...args) => getRedis().set(...args),
    get: (...args) => getRedis().get(...args),
  } as Redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  analytics: true,
  prefix: 'abiaeats:signup',
});

/**
 * Helper: get the real client IP from a Next.js request.
 * Vercel sets x-forwarded-for. Never trust user-provided headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; first entry is the client
    return forwarded.split(',')[0].trim();
  }
  // Fallback — should not happen on Vercel
  return '127.0.0.1';
}

/**
 * Apply rate limit. Returns a rate-limit-exceeded Response if over limit,
 * or null if the request is allowed.
 *
 * Usage:
 *   const blocked = await applyRateLimit(loginRateLimit, request);
 *   if (blocked) return blocked;
 */
export async function applyRateLimit(
  limiter: Ratelimit,
  request: Request
): Promise<Response | null> {
  // When Upstash Redis is not configured (local dev, CI without secrets),
  // skip rate limiting entirely rather than crashing. In production both
  // vars MUST be set — the health check in /api/health will flag this.
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[rate-limit] Upstash Redis not configured — rate limiting disabled');
    }
    return null; // allow the request
  }

  const ip = getClientIp(request);
  const { success, limit, remaining, reset } = await limiter.limit(ip);

  if (!success) {
    const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: 'Too many attempts. Please wait before trying again.',
        retry_after_seconds: retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': String(retryAfterSeconds),
        },
      }
    );
  }

  return null; // request is allowed
}