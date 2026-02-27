/**
 * Rate-limited login endpoint.
 *
 * Wraps Supabase auth so we can enforce rate limiting before the credential
 * check hits Supabase. The client calls POST /api/auth/login instead of
 * calling supabase.auth.signInWithPassword() directly.
 *
 * Rate limit: 5 attempts per 15 minutes per IP (loginRateLimit in rate-limit.ts).
 * Fails open if Upstash is not configured — add UPSTASH_REDIS_REST_URL +
 * UPSTASH_REDIS_REST_TOKEN to Vercel env to enable.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations';
import { loginRateLimit, applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // ── Rate limiting (fail open if Upstash not yet configured) ────────────────
  try {
    const blocked = await applyRateLimit(loginRateLimit, request);
    if (blocked) return blocked;
  } catch {
    // Upstash env vars not set — skip rate limiting, allow the request.
    // Configure UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to enable.
  }

  // ── Parse + validate body ──────────────────────────────────────────────────
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // ── Attempt login (sets session cookies server-side via SSR client) ─────────
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Never expose the specific Supabase error — prevents account enumeration
    return NextResponse.json(
      { error: 'Invalid email or password. Please try again.' },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
