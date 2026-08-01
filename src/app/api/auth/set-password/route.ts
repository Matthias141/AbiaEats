/**
 * Rate-limited set-password endpoint, used after an invite or recovery link
 * (the caller already has a session at this point — /auth/callback exchanged
 * the invite/recovery code for one — but no password has ever been set).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { setPasswordSchema } from '@/lib/validations';
import { setPasswordRateLimit, applyRateLimit } from '@/lib/rate-limit';
import { isPasswordBreached } from '@/lib/hibp';

// Riders don't have a dedicated dashboard yet (CLAUDE.md §2: they use the
// restaurant dashboard at launch, but /restaurant itself is gated to
// restaurant_owner/admin) — send them to /home rather than a route the
// middleware will immediately bounce them out of.
const REDIRECT_BY_ROLE: Record<string, string> = {
  admin: '/dashboard/ops',
  restaurant_owner: '/restaurant',
  rider: '/home',
  customer: '/home',
};

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const blocked = await applyRateLimit(setPasswordRateLimit, request);
    if (blocked) return blocked;
  } catch {
    // Upstash not configured — fail open
  }

  const body = await request.json().catch(() => null);
  const parsed = setPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0].message,
        details: z.flattenError(parsed.error).fieldErrors,
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    );
  }

  try {
    const { breached, count } = await isPasswordBreached(parsed.data.password);
    if (breached) {
      return NextResponse.json(
        {
          error: `This password has appeared in ${count.toLocaleString()} data breaches. Please choose a different password.`,
          details: {},
          code: 'PASSWORD_BREACHED',
        },
        { status: 400 }
      );
    }
  } catch {
    // HIBP unreachable — fail open
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    console.error('[set-password] Supabase error:', error.message, error.status);
    return NextResponse.json(
      {
        error: 'Unable to set password. Please request a new invite link and try again.',
        details: {},
        code: 'PASSWORD_UPDATE_FAILED',
      },
      { status: 500 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .single();

  const redirectTo = REDIRECT_BY_ROLE[profile?.role ?? 'customer'] ?? '/home';

  return NextResponse.json({ ok: true, redirectTo });
}
