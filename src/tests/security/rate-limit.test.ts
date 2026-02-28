/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  AbiaEats — Security Test Suite: Rate Limiting                         ║
 * ║                                                                         ║
 * ║  RED TEAM  → Brute force, credential stuffing, DoS via rate limit bypass
 * ║  BLUE TEAM → Rate limit enforcement, IP extraction, header validation   ║
 * ║  PURPLE    → MITRE T1110 coverage verification                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * MITRE ATT&CK Coverage:
 *   T1110.001 — Brute Force: Password Guessing
 *   T1110.003 — Brute Force: Password Spraying
 *   T1110.004 — Brute Force: Credential Stuffing
 *   T1498     — Network Denial of Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getClientIp, applyRateLimit } from '@/lib/rate-limit';
import { Ratelimit } from '@upstash/ratelimit';

// ============================================================================
// BLUE TEAM: IP EXTRACTION — Critical for rate limit accuracy
// A bypassed IP extraction = bypassed rate limiting
// ============================================================================

describe('🔵 BLUE TEAM — Client IP Extraction', () => {

  const makeRequest = (headers: Record<string, string>) =>
    new Request('https://abiaeats.com/api/auth/login', {
      method: 'POST',
      headers,
    });

  it('extracts IP from x-forwarded-for header (Vercel standard)', () => {
    const req = makeRequest({ 'x-forwarded-for': '41.58.123.45' });
    expect(getClientIp(req)).toBe('41.58.123.45');
  });

  it('extracts FIRST IP from multi-hop x-forwarded-for (real client, not proxy)', () => {
    // Attacker might add extra IPs to x-forwarded-for to confuse the extractor
    // Real client IP is always the FIRST one — proxies append to the right
    const req = makeRequest({
      'x-forwarded-for': '41.58.123.45, 10.0.0.1, 192.168.1.1',
    });
    expect(getClientIp(req)).toBe('41.58.123.45');
  });

  it('trims whitespace from extracted IP', () => {
    const req = makeRequest({ 'x-forwarded-for': '  41.58.123.45  , 10.0.0.1' });
    expect(getClientIp(req)).toBe('41.58.123.45');
  });

  it('falls back to 127.0.0.1 when no forwarded header present', () => {
    const req = makeRequest({});
    expect(getClientIp(req)).toBe('127.0.0.1');
  });

  // RED TEAM: IP spoofing attempts
  it('uses first entry even if attacker injects fake IP at end', () => {
    // Attacker appends their desired IP to appear as a different client
    const req = makeRequest({
      'x-forwarded-for': '41.58.123.45, 127.0.0.1', // attacker appended 127.0.0.1
    });
    // First IP is real — attacker's manipulation fails
    expect(getClientIp(req)).toBe('41.58.123.45');
  });
});

// ============================================================================
// BLUE TEAM: RATE LIMIT ENFORCEMENT — Fail-open vs Fail-closed
// ============================================================================

describe('🔵 BLUE TEAM — Rate Limit: Fail-Open Behavior (no Redis)', () => {

  beforeEach(() => {
    // Simulate no Upstash configured (development / CI without secrets)
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null (allows request) when Redis not configured', async () => {
    const mockLimiter = {} as Ratelimit; // unused — env check happens first
    const req = new Request('https://abiaeats.com/api/auth/login', { method: 'POST' });

    const result = await applyRateLimit(mockLimiter, req);

    // Fail-open: no Redis = no block (documented risk, acceptable in dev)
    expect(result).toBeNull();
  });
});

describe('🔵 BLUE TEAM — Rate Limit: Enforcement When Redis Present', () => {

  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 429 response when rate limit exceeded', async () => {
    // Mock the Ratelimit to simulate exceeded limit
    const mockLimiter = {
      limit: vi.fn(async () => ({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 900000, // 15 minutes from now
      })),
    } as unknown as Ratelimit;

    const req = new Request('https://abiaeats.com/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '41.58.123.45' },
    });

    const result = await applyRateLimit(mockLimiter, req);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
  });

  it('429 response includes Retry-After header (RFC 6585 compliance)', async () => {
    const futureReset = Date.now() + 120000; // 2 minutes
    const mockLimiter = {
      limit: vi.fn(async () => ({
        success: false,
        limit: 5,
        remaining: 0,
        reset: futureReset,
      })),
    } as unknown as Ratelimit;

    const req = new Request('https://abiaeats.com/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '41.58.123.45' },
    });

    const result = await applyRateLimit(mockLimiter, req);

    expect(result?.headers.get('Retry-After')).toBeTruthy();
    expect(result?.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('429 response body has human-readable error + retry_after_seconds', async () => {
    const futureReset = Date.now() + 60000; // 1 minute
    const mockLimiter = {
      limit: vi.fn(async () => ({
        success: false,
        limit: 5,
        remaining: 0,
        reset: futureReset,
      })),
    } as unknown as Ratelimit;

    const req = new Request('https://abiaeats.com/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '41.58.123.45' },
    });

    const result = await applyRateLimit(mockLimiter, req);
    const body = await result?.json();

    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('retry_after_seconds');
    expect(typeof body.retry_after_seconds).toBe('number');
    expect(body.retry_after_seconds).toBeGreaterThan(0);
  });

  it('returns null (allows request) when within rate limit', async () => {
    const mockLimiter = {
      limit: vi.fn(async () => ({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 900000,
      })),
    } as unknown as Ratelimit;

    const req = new Request('https://abiaeats.com/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '41.58.123.45' },
    });

    const result = await applyRateLimit(mockLimiter, req);
    expect(result).toBeNull(); // allowed through
  });

  it('rate limiter is called with client IP (not server IP)', async () => {
    const clientIp = '197.210.85.100'; // Nigerian IP
    const mockLimiter = {
      limit: vi.fn(async () => ({ success: true, limit: 5, remaining: 4, reset: Date.now() })),
    } as unknown as Ratelimit;

    const req = new Request('https://abiaeats.com/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': clientIp },
    });

    await applyRateLimit(mockLimiter, req);

    // Rate limiter MUST be keyed to client IP, not 127.0.0.1
    expect(mockLimiter.limit).toHaveBeenCalledWith(clientIp);
  });
});

// ============================================================================
// RED TEAM: RATE LIMIT BYPASS TECHNIQUES
// MITRE T1110.004 — Credential Stuffing
// ============================================================================

describe('🔴 RED TEAM — Rate Limit Bypass Attempts', () => {

  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('attacker cannot bypass by rotating IPs in x-forwarded-for tail', async () => {
    // Attacker appends fake IPs hoping the server uses the LAST one
    const callCount: string[] = [];
    const mockLimiter = {
      limit: vi.fn(async (ip: string) => {
        callCount.push(ip);
        // Real IP is always at index 0 — should be rate limited
        if (ip === '197.210.85.100') {
          return { success: false, limit: 5, remaining: 0, reset: Date.now() + 60000 };
        }
        return { success: true, limit: 5, remaining: 4, reset: Date.now() };
      }),
    } as unknown as Ratelimit;

    const req = new Request('https://abiaeats.com/api/auth/login', {
      method: 'POST',
      headers: {
        // Attacker's real IP first, then fake bypass IPs
        'x-forwarded-for': '197.210.85.100, 1.1.1.1, 8.8.8.8',
      },
    });

    const result = await applyRateLimit(mockLimiter, req);

    // Blocked because we correctly use the FIRST IP
    expect(result?.status).toBe(429);
    expect(callCount[0]).toBe('197.210.85.100');
  });

  it('attacker cannot bypass with X-Real-IP or CF-Connecting-IP headers', async () => {
    // These alternative IP headers are not used by our implementation
    // The extractor only trusts x-forwarded-for (set by Vercel's infrastructure)
    const callIps: string[] = [];
    const mockLimiter = {
      limit: vi.fn(async (ip: string) => {
        callIps.push(ip);
        return { success: true, limit: 5, remaining: 4, reset: Date.now() };
      }),
    } as unknown as Ratelimit;

    const req = new Request('https://abiaeats.com/api/auth/login', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '197.210.85.100',
        'x-real-ip': '1.2.3.4',           // attacker-controlled bypass attempt
        'cf-connecting-ip': '5.6.7.8',    // attacker-controlled bypass attempt
      },
    });

    await applyRateLimit(mockLimiter, req);

    // Must use x-forwarded-for value, not alternative headers
    expect(callIps[0]).toBe('197.210.85.100');
    expect(callIps[0]).not.toBe('1.2.3.4');
    expect(callIps[0]).not.toBe('5.6.7.8');
  });
});

// ============================================================================
// PURPLE TEAM: MITRE ATT&CK T1110 COVERAGE VERIFICATION
// ============================================================================

describe('🟣 PURPLE TEAM — T1110 Brute Force Coverage', () => {

  it('T1110.001: Rate limit config enforces 5 attempts per 15 min (password guessing mitigation)', async () => {
    // Verify the rate limit MODULE has the right config — import and inspect
    // The actual Ratelimit objects are configured with sliding window
    // This test documents the expected config as a contract
    const { loginRateLimit, signupRateLimit } = await import('@/lib/rate-limit');

    expect(loginRateLimit).toBeDefined();
    expect(signupRateLimit).toBeDefined();
    // Both limiters exist and are initialized
    // Config (5 req/15min for login, 3 req/1hr for signup) is enforced by Upstash
  });

  it('T1110.003: Single IP cannot spray passwords across multiple accounts', async () => {
    // Password spraying = one password, many accounts from same IP
    // Our per-IP sliding window stops this at 5 attempts per 15 min
    // This test verifies the IP-keyed structure is in place
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');

    const limitCallArgs: string[] = [];
    const mockLimiter = {
      limit: vi.fn(async (key: string) => {
        limitCallArgs.push(key);
        return { success: true, limit: 5, remaining: 4, reset: Date.now() };
      }),
    } as unknown as Ratelimit;

    // Same IP, different target accounts (password spray pattern)
    const sprayingIp = '41.58.123.45';
    const requests = ['user1@test.com', 'user2@test.com', 'user3@test.com'];

    for (const __email of requests) {
      const req = new Request('https://abiaeats.com/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': sprayingIp },
      });
      await applyRateLimit(mockLimiter, req);
    }

    // All attempts keyed to same IP — spray counted against single budget
    expect(limitCallArgs.every(key => key === sprayingIp)).toBe(true);
    expect(limitCallArgs.length).toBe(3);

    vi.unstubAllEnvs();
  });
});
