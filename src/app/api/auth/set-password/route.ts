/**
 * Rate-limited set-password endpoint, used after an invite or recovery link
 * (the caller already has a session at this point — /auth/callback exchanged
 * the invite/recovery code for one — but no password has ever been set).
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { setPasswordSchema } from '@/lib/validations';
import { setPasswordRateLimit, applyRateLimit } from '@/lib/rate-limit';
import { isPasswordBreached } from '@/lib/hibp';

const REDIRECT_BY_ROLE: Record<string, string> = {
  admin: '/dashboard/ops',
  restaurant_owner: '/restaurant',
  rider: '/restaurant',
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
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const { breached, count } = await isPasswordBreached(parsed.data.password);
    if (breached) {
      return NextResponse.json(
        {
          error: `This password has appeared in ${count.toLocaleString()} data breaches. Please choose a different password.`,
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
      { error: 'Unable to set password. Please request a new invite link and try again.' },
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
