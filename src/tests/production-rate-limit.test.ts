import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('production without Redis', () => {
  it.each([
    ['', ''],
    ['https://example.upstash.io', ''],
    ['', 'token'],
  ])('limits login attempts with URL=%s and token=%s', async (url, token) => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', url);
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', token);
    vi.useFakeTimers();
    const warning = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { applyRateLimit, loginRateLimit, signupRateLimit } = await import('@/lib/rate-limit');
    const redis = vi.spyOn(loginRateLimit, 'limit');
    const request = (ip?: string) => new Request('https://test.com/api/auth/login', { headers: ip ? { 'x-forwarded-for': ip } : {} });
    for (let i = 0; i < 5; i++) expect(await applyRateLimit(loginRateLimit, request())).toBeNull();
    const blocked = await applyRateLimit(loginRateLimit, request());
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get('Retry-After')).toBe('900');
    expect(blocked?.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(await applyRateLimit(loginRateLimit, request('1.2.3.4'))).toBeNull();
    expect(await applyRateLimit(signupRateLimit, request())).toBeNull();
    expect(redis).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('IN-MEMORY per-instance'));
    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(await applyRateLimit(loginRateLimit, request())).toBeNull();
  });
});
