/**
 * Rate-limited signup endpoint.
 *
 * Wraps Supabase auth so we can enforce rate limiting before account creation.
 * Rate limit: 3 signups per hour per IP (signupRateLimit in rate-limit.ts).
 * Fails open if Upstash is not configured.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signupSchema } from '@/lib/validations';
import { signupRateLimit, applyRateLimit } from '@/lib/rate-limit';
import { isPasswordBreached } from '@/lib/hibp';
import { getAppUrl } from '@/lib/get-app-url';

export async function POST(request: Request) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  try {
    const blocked = await applyRateLimit(signupRateLimit, request);
    if (blocked) return blocked;
  } catch {
    // Upstash not configured — fail open
  }

  // ── Parse + validate body ──────────────────────────────────────────────────
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // ── HaveIBeenPwned check ───────────────────────────────────────────────────
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
    // HIBP unreachable — fail open, don't block signup
  }

  // ── Create account ─────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Without this, the confirmation email links back to whatever "Site
      // URL" is configured in the Supabase dashboard regardless of which
      // environment (prod, preview, localhost) the signup came from.
      emailRedirectTo: `${getAppUrl()}/auth/callback`,
      data: {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        role: 'customer', // hard-coded — never trust a client-provided role
      },
    },
  });

  if (error) {
    // Log the actual error server-side for debugging — never sent to the client
    console.error('[signup] Supabase error:', error.message, error.status);

    // Expose safe, non-enumeration errors to help the user
    if (
      error.message?.toLowerCase().includes('password') ||
      error.message?.toLowerCase().includes('weak')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Generic message for all other errors — never reveal whether the email exists
    return NextResponse.json(
      { error: 'Unable to create account. Please try again later.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
