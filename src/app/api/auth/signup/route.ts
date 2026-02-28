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
    console.error('[signup] Supabase auth error:', error.message);

    // Map known Supabase errors to user-friendly messages
    const msg = error.message.toLowerCase();

    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try signing in instead.' },
        { status: 409 }
      );
    }

    if (msg.includes('password') && (msg.includes('least') || msg.includes('weak') || msg.includes('short'))) {
      return NextResponse.json(
        { error: 'Password is too weak. Use at least 12 characters with an uppercase letter and a number.' },
        { status: 400 }
      );
    }

    if (msg.includes('email') && (msg.includes('invalid') || msg.includes('format'))) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (msg.includes('rate') || msg.includes('too many')) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    // Fallback — generic message for unexpected errors
    return NextResponse.json(
      { error: 'Unable to create account. Please try again later.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
