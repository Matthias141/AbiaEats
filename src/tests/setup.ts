/**
 * Global test setup
 * Mocks external dependencies so tests run without live services.
 * 
 * BLUE TEAM NOTE: Tests must run in CI without real credentials.
 * Never let test suites require production secrets — that's a supply chain risk.
 */

import { vi } from 'vitest';

// ── Environment stubs ────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.UPSTASH_REDIS_REST_URL = '';   // empty → rate limiting disabled in tests
process.env.UPSTASH_REDIS_REST_TOKEN = ''; // empty → rate limiting disabled in tests
// NODE_ENV is read-only in Next.js 15 / TypeScript strict mode — set via vitest.config.ts instead

// ── Next.js server stubs ─────────────────────────────────────────────────────
vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Map()),
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
}));

// ── Supabase server client stub ───────────────────────────────────────────────
// Tests that need specific Supabase responses override this in their own vi.mock()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      signInWithPassword: vi.fn(async () => ({ error: null })),
      signUp: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: null, error: null })),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(async () => ({ data: [], error: null, count: 0 })),
    })),
    rpc: vi.fn(async () => ({ data: null, error: null })),
    storage: {
      from: vi.fn(() => ({
        createSignedUploadUrl: vi.fn(async () => ({ data: { signedUrl: 'https://test.com/upload' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/image.jpg' } })),
      })),
    },
  })),
}));
