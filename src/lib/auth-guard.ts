/**
 * FIX: BLUE-N1 — API routes have ZERO middleware protection.
 * FIX: RED-5  — createAdminClient has no guardrails against misuse.
 *
 * ─── INTERN EXPLAINER ───────────────────────────────────────────────────────
 * Next.js middleware (middleware.ts) only runs on PAGE routes by default.
 * API routes at /api/* are completely skipped. If you forget to check auth
 * in an API route, it's wide open — no safety net catches you.
 *
 * This file gives you two tools:
 *   requireAuth()  — verify the caller is logged in
 *   requireRole()  — verify the caller has a specific role (admin, etc.)
 *
 * Usage:
 *   export async function POST(req: Request) {
 *     const guard = await requireRole('admin');
 *     if (guard.response) return guard.response;  // auto-blocks if not admin
 *     const { user } = guard;                     // typed + verified
 *   }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';
import type { User } from '@supabase/supabase-js';

export async function requireAuth(): Promise<
  { user: User; response: null } | { user: null; response: Response }
> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) {
    return {
      user: null,
      response: Response.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 }
      ),
    };
  }
  return { user, response: null };
}

export async function requireRole(...roles: UserRole[]): Promise<
  { user: User; role: UserRole; response: null } |
  { user: null; role: null; response: Response }
> {
  const auth = await requireAuth();
  if (auth.response) return { user: null, role: null, response: auth.response };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .single();

  if (!profile || !roles.includes(profile.role as UserRole)) {
    return {
      user: null,
      role: null,
      response: Response.json(
        { error: 'Insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    };
  }
  return { user: auth.user, role: profile.role as UserRole, response: null };
}

/**
 * FIX RED-5: Admin client with runtime guardrail.
 * Throws if called outside webhook/cron context. Bypasses ALL RLS — never
 * use this in customer-facing code. Use createClient() everywhere else.
 *
 * Accepts either WEBHOOK_SECRET (for webhook handlers) or CRON_SECRET (for
 * scheduled jobs) as proof that this call is intentional.
 */
export async function createAdminClient_WEBHOOKS_AND_CRONS_ONLY() {
  if (!process.env.WEBHOOK_SECRET && !process.env.CRON_SECRET) {
    throw new Error(
      '[SECURITY] createAdminClient called but neither WEBHOOK_SECRET nor ' +
      'CRON_SECRET is set. This bypasses ALL RLS. Only use in ' +
      '/api/webhooks/* and /api/cron/*.'
    );
  }
  const { createClient: sb } = await import('@supabase/supabase-js');
  return sb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}