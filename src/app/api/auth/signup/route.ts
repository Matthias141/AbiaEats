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

  // ── Create account ─────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        role: 'customer', // hard-coded — never trust a client-provided role
      },
    },
  });

  if (error) {
    // Generic message — never expose whether the email already exists
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
