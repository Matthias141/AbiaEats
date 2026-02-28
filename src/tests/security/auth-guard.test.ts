/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  AbiaEats — Security Test Suite: Auth Guard                            ║
 * ║                                                                         ║
 * ║  RED TEAM  → Privilege escalation, unauthenticated access attempts     ║
 * ║  BLUE TEAM → Role enforcement, authentication gate assertions          ║
 * ║  DFIR      → Audit trail completeness for access control failures      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * MITRE ATT&CK Coverage:
 *   T1078     — Valid Accounts (role escalation)
 *   T1548     — Abuse Elevation Control Mechanism
 *   T1550     — Use Alternate Authentication Material
 *   T1190     — Exploit Public-Facing Application (unauthenticated access)
 */

import { describe, it, expect, vi } from 'vitest';
import { requireAuth, requireRole } from '@/lib/auth-guard';

// ============================================================================
// TEST FIXTURES — Reusable mock user profiles
// ============================================================================

const mockUsers = {
  admin: {
    id: 'admin-uuid-0000-0000-0000-000000000001',
    email: 'admin@abiaeats.com',
    role: 'admin' as const,
  },
  customer: {
    id: 'customer-uuid-0000-0000-0000-000000000002',
    email: 'customer@test.com',
    role: 'customer' as const,
  },
  restaurantOwner: {
    id: 'owner-uuid-0000-0000-0000-000000000003',
    email: 'owner@restaurant.com',
    role: 'restaurant_owner' as const,
  },
  rider: {
    id: 'rider-uuid-0000-0000-0000-000000000004',
    email: 'rider@test.com',
    role: 'rider' as const,
  },
};

// ============================================================================
// BLUE TEAM: AUTHENTICATION GATE
// MITRE T1190 — Exploit Public-Facing Application
// ============================================================================

describe('🔵 BLUE TEAM — requireAuth: Authentication Gate', () => {

  it('blocks unauthenticated requests with 401', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      },
    } as never);

    const result = await requireAuth();

    expect(result.user).toBeNull();
    expect(result.response).not.toBeNull();
    expect(result.response?.status).toBe(401);
  });

  it('blocks requests with auth error with 401', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: null },
          error: { message: 'JWT expired' },
        })),
      },
    } as never);

    const result = await requireAuth();

    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(401);
  });

  it('returns user object for authenticated request', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: mockUsers.customer },
          error: null,
        })),
      },
    } as never);

    const result = await requireAuth();

    expect(result.response).toBeNull();
    expect(result.user?.id).toBe(mockUsers.customer.id);
    expect(result.user?.email).toBe(mockUsers.customer.email);
  });

  it('401 response body contains UNAUTHENTICATED error code', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      },
    } as never);

    const result = await requireAuth();
    const body = await result.response?.json();

    expect(body?.code).toBe('UNAUTHENTICATED');
  });
});

// ============================================================================
// RED TEAM: PRIVILEGE ESCALATION ATTEMPTS
// MITRE T1078 — Valid Accounts, T1548 — Abuse Elevation Control
// ============================================================================

describe('🔴 RED TEAM — requireRole: Privilege Escalation Attacks', () => {

  // Helper: mock a logged-in user with a specific role
  async function mockUserWithRole(role: string) {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'test-user-id', email: 'test@test.com' } },
          error: null,
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: { role }, error: null })),
      })),
    } as never);
  }

  // T1078: Customer tries to access admin endpoint
  it('blocks customer from admin-only endpoint (403)', async () => {
    await mockUserWithRole('customer');
    const result = await requireRole('admin');

    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  // T1078: Restaurant owner tries to access admin endpoint
  it('blocks restaurant_owner from admin-only endpoint (403)', async () => {
    await mockUserWithRole('restaurant_owner');
    const result = await requireRole('admin');

    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  // T1078: Rider tries to access restaurant owner endpoint
  it('blocks rider from restaurant_owner endpoint (403)', async () => {
    await mockUserWithRole('rider');
    const result = await requireRole('restaurant_owner');

    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  // T1548: Admin can access all role-gated endpoints
  it('allows admin to access admin endpoint', async () => {
    await mockUserWithRole('admin');
    const result = await requireRole('admin');

    expect(result.response).toBeNull();
    expect(result.role).toBe('admin');
  });

  // Multi-role: restaurant_owner OR admin can manage menu
  it('allows restaurant_owner to access restaurant endpoints', async () => {
    await mockUserWithRole('restaurant_owner');
    const result = await requireRole('restaurant_owner', 'admin');

    expect(result.response).toBeNull();
    expect(result.role).toBe('restaurant_owner');
  });

  it('allows admin to access restaurant endpoints (admin is superrole)', async () => {
    await mockUserWithRole('admin');
    const result = await requireRole('restaurant_owner', 'admin');

    expect(result.response).toBeNull();
    expect(result.role).toBe('admin');
  });

  // T1078: Unknown/forged role — DB returns unexpected role
  it('blocks unknown role string (forged role attack)', async () => {
    await mockUserWithRole('superadmin'); // not a valid UserRole
    const result = await requireRole('admin');

    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  it('blocks empty role string', async () => {
    await mockUserWithRole('');
    const result = await requireRole('admin');

    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  // 403 response body contains FORBIDDEN code — for audit log correlation
  it('403 response body contains FORBIDDEN error code', async () => {
    await mockUserWithRole('customer');
    const result = await requireRole('admin');
    const body = await result.response?.json();

    expect(body?.code).toBe('FORBIDDEN');
  });

  // T1190: Unauthenticated access to role-gated endpoint
  it('blocks unauthenticated request to role-gated endpoint', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      },
    } as never);

    const result = await requireRole('admin');

    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(401); // 401 not 403 — not authenticated at all
  });
});

// ============================================================================
// BLUE TEAM: RESPONSE SECURITY HEADERS
// Ensures error responses don't leak sensitive information
// ============================================================================

describe('🔵 BLUE TEAM — Error Response Information Disclosure', () => {

  it('401 response does not leak Supabase internals', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: null },
          error: { message: 'Invalid JWT: token is expired. Details: sub=admin-123' },
        })),
      },
    } as never);

    const result = await requireAuth();
    const body = await result.response?.json();

    // Should NOT leak JWT internals, sub claims, or internal error details
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain('JWT');
    expect(bodyStr).not.toContain('sub=');
    expect(bodyStr).not.toContain('admin-123');
    expect(bodyStr).not.toContain('expired');
  });

  it('403 response does not expose which roles are valid', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'test', email: 'test@test.com' } },
          error: null,
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: { role: 'customer' }, error: null })),
      })),
    } as never);

    const result = await requireRole('admin');
    const body = await result.response?.json();
    const bodyStr = JSON.stringify(body);

    // Must not leak valid role names or what roles exist
    expect(bodyStr).not.toContain('admin');
    expect(bodyStr).not.toContain('restaurant_owner');
    expect(bodyStr).not.toContain('rider');
  });
});

// ============================================================================
// DFIR: AUDIT TRAIL — Access control failure reconstruction
// ============================================================================

describe('🔍 DFIR — Access Control Failure Forensics', () => {

  it('requireAuth returns structured error for log correlation', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      },
    } as never);

    const result = await requireAuth();
    const body = await result.response?.json();

    // DFIR: Structured error codes enable SIEM correlation
    // A spike in UNAUTHENTICATED errors = credential stuffing indicator
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('code');
    expect(typeof body.error).toBe('string');
    expect(typeof body.code).toBe('string');
  });

  it('requireRole returns structured error for privilege escalation detection', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'attacker-id', email: 'attacker@test.com' } },
          error: null,
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: { role: 'customer' }, error: null })),
      })),
    } as never);

    const result = await requireRole('admin');
    const body = await result.response?.json();

    // DFIR: FORBIDDEN events should be logged with user context
    // for privilege escalation incident reconstruction
    expect(body.code).toBe('FORBIDDEN');
    expect(result.response?.status).toBe(403);
  });
});
