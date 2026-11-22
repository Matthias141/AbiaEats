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

// 5 set-password attempts per hour per IP (post-invite / post-recovery)
export const setPasswordRateLimit = new Ratelimit({
  redis: {
    evalsha: (...args) => getRedis().evalsha(...args),
    set: (...args) => getRedis().set(...args),
    get: (...args) => getRedis().get(...args),
  } as Redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: true,
  prefix: 'abiaeats:set-password',
});

const memoryPolicies = new Map([
  [loginRateLimit, { limit: 5, windowMs: 15 * 60 * 1000 }],
  [signupRateLimit, { limit: 3, windowMs: 60 * 60 * 1000 }],
  [setPasswordRateLimit, { limit: 5, windowMs: 60 * 60 * 1000 }],
]);
const memoryWindows = new Map<Ratelimit, Map<string, number[]>>();
let warnedAboutMemory = false;

function limitInMemory(limiter: Ratelimit, ip: string) {
  const policy = memoryPolicies.get(limiter) ?? { limit: 3, windowMs: 60 * 60 * 1000 };
  let windows = memoryWindows.get(limiter);
  if (!windows) {
    windows = new Map();
    memoryWindows.set(limiter, windows);
  }
  const now = Date.now();
  for (const [key, attempts] of windows) {
    if (attempts[attempts.length - 1] <= now - policy.windowMs) windows.delete(key);
  }
  const attempts = (windows.get(ip) ?? []).filter(time => time > now - policy.windowMs);
  const reset = (attempts[0] ?? now) + policy.windowMs;
  // Fail closed for new IPs at capacity rather than evicting active limits.
  if (!windows.has(ip) && windows.size >= 10_000) {
    return { success: false, limit: policy.limit, remaining: 0, reset };
  }
  const success = attempts.length < policy.limit;
  if (success) attempts.push(now);
  windows.set(ip, attempts);
  return { success, limit: policy.limit, remaining: policy.limit - attempts.length, reset };
}

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
  const missingRedis = !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN;
  if (missingRedis) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[rate-limit] Upstash Redis not configured — rate limiting disabled');
      return null;
    }
    if (!warnedAboutMemory) {
      console.error('[SECURITY] Upstash Redis not configured — using IN-MEMORY per-instance rate limiting. Limits reset on restart and are NOT shared across instances. Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
      warnedAboutMemory = true;
    }
  }

  const ip = getClientIp(request);
  const { success, limit, remaining, reset } = missingRedis
    ? limitInMemory(limiter, ip)
    : await limiter.limit(ip);

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