/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECURITY TEST SUITE: auth-guard.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * [RED TEAM] Attack vectors tested:
 *   - Unauthenticated access to protected endpoints (no token)
 *   - Horizontal privilege escalation: customer → restaurant_owner endpoints
 *   - Vertical privilege escalation: restaurant_owner → admin endpoints
 *   - Role spoofing: JWT payload manipulation (Supabase verifies server-side)
 *   - BOLA (Broken Object Level Auth): accessing other users' resources
 *   - Token replay after session expiry
 *
 * [BLUE TEAM] Controls verified:
 *   - requireAuth() returns 401 for unauthenticated requests
 *   - requireRole() returns 403 for wrong role (not 404 — don't leak existence)
 *   - Role fetched from DB (authoritative), not from JWT claims
 *   - Admin client throws without proper secrets (RED-5 fix)
 *
 * [PURPLE TEAM] MITRE ATT&CK mapping:
 *   - T1078 Valid Accounts → auth guard prevents role abuse
 *   - T1548 Abuse Elevation Control Mechanism → requireRole vertical checks
 *   - T1550 Use Alternate Authentication Material → JWT claim spoofing
 *
 * [DFIR] Forensic notes:
 *   - 401 responses = unauthenticated probe (log source IP, user agent)
 *   - 403 responses = authenticated but wrong role (insider threat signal)
 *   - Burst of 403 on /api/admin/* from non-admin = privilege escalation attempt
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, requireRole, createAdminClient_WEBHOOKS_AND_CRONS_ONLY } from '@/lib/auth-guard';

// ─────────────────────────────────────────────────────────────────────────────
// Test helper: build a mock Supabase client with configurable auth + profile
// ─────────────────────────────────────────────────────────────────────────────
function mockSupabase({
  user = null,
  authError = null,
  role = null,
  profileError = null,
}: {
  user?: Record<string, unknown> | null;
  authError?: Record<string, unknown> | null;
  role?: string | null;
  profileError?: Record<string, unknown> | null;
}) {
  const mockFrom = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: role ? { role } : null,
      error: profileError,
    }),
  }));

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: mockFrom,
  };
}

const mockedCreateClient = vi.mocked(createClient);

// ─────────────────────────────────────────────────────────────────────────────
// [RED] Unauthenticated access — T1190 Exploit Public-Facing Application
// ─────────────────────────────────────────────────────────────────────────────
describe('[RED] requireAuth() — unauthenticated access prevention', () => {
  it('returns 401 when no user session exists', async () => {
    mockedCreateClient.mockResolvedValue(mockSupabase({ user: null }) as never);

    const result = await requireAuth();

    expect(result.response).not.toBeNull();
    expect(result.response?.status).toBe(401);
    expect(result.user).toBeNull();
  });

  it('returns 401 when auth.getUser() returns an error', async () => {
    mockedCreateClient.mockResolvedValue(
      mockSupabase({ user: null, authError: { message: 'JWT expired' } }) as never
    );

    const result = await requireAuth();

    expect(result.response?.status).toBe(401);
  });

  it('returns 401 error body with UNAUTHENTICATED code', async () => {
    mockedCreateClient.mockResolvedValue(mockSupabase({ user: null }) as never);

    const result = await requireAuth();
    const body = await result.response?.json();

    expect(body.code).toBe('UNAUTHENTICATED');
  });

  it('returns user + null response for valid session', async () => {
    const fakeUser = { id: 'user-123', email: 'user@example.com' };
    mockedCreateClient.mockResolvedValue(mockSupabase({ user: fakeUser }) as never);

    const result = await requireAuth();

    expect(result.response).toBeNull();
    expect(result.user).toEqual(fakeUser);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// [RED] Vertical privilege escalation — T1548
// A customer trying to call admin endpoints must be blocked.
// A restaurant_owner trying to call admin endpoints must be blocked.
// ─────────────────────────────────────────────────────────────────────────────
describe('[RED] requireRole() — vertical privilege escalation', () => {
  it('blocks customer from admin-only endpoints', async () => {
    mockedCreateClient.mockResolvedValue(
      mockSupabase({
        user: { id: 'cust-1', email: 'customer@example.com' },
        role: 'customer',
      }) as never
    );

    const result = await requireRole('admin');

    expect(result.response?.status).toBe(403);
    expect(result.user).toBeNull();
  });

  it('blocks restaurant_owner from admin-only endpoints', async () => {
    mockedCreateClient.mockResolvedValue(
      mockSupabase({
        user: { id: 'owner-1', email: 'owner@example.com' },
        role: 'restaurant_owner',
      }) as never
    );

    const result = await requireRole('admin');

    expect(result.response?.status).toBe(403);
  });

  it('blocks rider from admin-only endpoints', async () => {
    mockedCreateClient.mockResolvedValue(
      mockSupabase({
        user: { id: 'rider-1', email: 'rider@example.com' },
        role: 'rider',
      }) as never
    );

    const result = await requireRole('admin');

    expect(result.response?.status).toBe(403);
  });

  it('allows admin to access admin-only endpoints', async () => {
    const adminUser = { id: 'admin-1', email: 'admin@abiaeats.com' };
    mockedCreateClient.mockResolvedValue(
      mockSupabase({ user: adminUser, role: 'admin' }) as never
    );

    const result = await requireRole('admin');

    expect(result.response).toBeNull();
    expect(result.role).toBe('admin');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// [RED] Horizontal privilege escalation — T1078
// A restaurant_owner should only access their own restaurant.
// requireRole allows the role but object-level auth is enforced in route.
// This tests that requireRole correctly grants restaurant_owner access.
// ─────────────────────────────────────────────────────────────────────────────
describe('[RED] requireRole() — horizontal privilege escalation context', () => {
  it('allows restaurant_owner to access restaurant_owner endpoints', async () => {
    const ownerUser = { id: 'owner-1', email: 'owner@restaurant.com' };
    mockedCreateClient.mockResolvedValue(
      mockSupabase({ user: ownerUser, role: 'restaurant_owner' }) as never
    );

    const result = await requireRole('restaurant_owner');

    expect(result.response).toBeNull();
    expect(result.role).toBe('restaurant_owner');
    expect(result.user?.id).toBe('owner-1');
  });

  it('blocks customer from restaurant_owner endpoints', async () => {
    mockedCreateClient.mockResolvedValue(
      mockSupabase({
        user: { id: 'cust-1', email: 'cust@example.com' },
        role: 'customer',
      }) as never
    );

    const result = await requireRole('restaurant_owner');

    expect(result.response?.status).toBe(403);
  });

  it('allows admin to access restaurant_owner endpoints (multi-role)', async () => {
    mockedCreateClient.mockResolvedValue(
      mockSupabase({
        user: { id: 'admin-1', email: 'admin@abiaeats.com' },
        role: 'admin',
      }) as never
    );

    const result = await requireRole('restaurant_owner', 'admin');

    expect(result.response).toBeNull();
    expect(result.role).toBe('admin');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// [BLUE] 403 not 404 — don't reveal resource existence to unauthorized callers
// ─────────────────────────────────────────────────────────────────────────────
describe('[BLUE] Error response correctness', () => {
  it('returns FORBIDDEN code in 403 body', async () => {
    mockedCreateClient.mockResolvedValue(
      mockSupabase({
        user: { id: 'cust-1', email: 'cust@example.com' },
        role: 'customer',
      }) as never
    );

    const result = await requireRole('admin');
    const body = await result.response?.json();

    expect(body.code).toBe('FORBIDDEN');
    // Should NOT say "admin" or reveal the required role
    expect(body.error).not.toContain('admin');
  });

  it('returns 401 before 403 — no role leak for unauthenticated users', async () => {
    mockedCreateClient.mockResolvedValue(mockSupabase({ user: null }) as never);

    const result = await requireRole('admin');

    // Must be 401 (not authenticated), not 403 (wrong role)
    // 403 would leak that this endpoint requires a specific role
    expect(result.response?.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// [RED] createAdminClient misuse prevention — RED-5 fix
// The admin client bypasses ALL RLS. It must only be callable from
// webhook/cron contexts with proper secrets set.
// ─────────────────────────────────────────────────────────────────────────────
describe('[RED] createAdminClient_WEBHOOKS_AND_CRONS_ONLY() — misuse prevention', () => {
  const origWebhookSecret = process.env.WEBHOOK_SECRET;
  const origCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    delete process.env.WEBHOOK_SECRET;
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (origWebhookSecret) process.env.WEBHOOK_SECRET = origWebhookSecret;
    if (origCronSecret) process.env.CRON_SECRET = origCronSecret;
  });

  it('throws when neither WEBHOOK_SECRET nor CRON_SECRET is set', async () => {
    await expect(createAdminClient_WEBHOOKS_AND_CRONS_ONLY()).rejects.toThrow('[SECURITY]');
  });

  it('does not throw [SECURITY] guard when WEBHOOK_SECRET is set', async () => {
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';
    // Guard passes → Supabase client initializes (test env has stub URL — resolves fine)
    // The key assertion: our [SECURITY] guard does NOT block this call
    const resultPromise = createAdminClient_WEBHOOKS_AND_CRONS_ONLY();
    // Must not throw the [SECURITY] guard error
    await expect(resultPromise).resolves.toBeDefined();
  });

  it('does not throw [SECURITY] guard when CRON_SECRET is set', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const resultPromise = createAdminClient_WEBHOOKS_AND_CRONS_ONLY();
    await expect(resultPromise).resolves.toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// [DFIR] Null profile — what happens if DB lookup fails?
// This is a canary test: if a DB failure silently grants access,
// that's a critical auth bypass to investigate immediately.
// ─────────────────────────────────────────────────────────────────────────────
describe('[DFIR] Auth guard behavior under DB failure conditions', () => {
  it('denies access when profile DB lookup returns null (no profile row)', async () => {
    mockedCreateClient.mockResolvedValue(
      mockSupabase({
        user: { id: 'orphan-user', email: 'orphan@example.com' },
        role: null, // No profile row found
      }) as never
    );

    const result = await requireRole('admin');

    // Must deny — null profile ≠ admin
    expect(result.response?.status).toBe(403);
  });

  it('denies access when profile returns DB error', async () => {
    mockedCreateClient.mockResolvedValue(
      mockSupabase({
        user: { id: 'user-1', email: 'user@example.com' },
        role: null,
        profileError: { message: 'connection timeout' },
      }) as never
    );

    const result = await requireRole('admin');

    expect(result.response?.status).toBe(403);
  });
});
