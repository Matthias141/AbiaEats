/**
 * Rate-limited login endpoint.
 *
 * Wraps Supabase auth so we can enforce rate limiting before the credential
 * check hits Supabase. The client calls POST /api/auth/login instead of
 * calling supabase.auth.signInWithPassword() directly.
 *
 * Rate limit: 5 attempts per 15 minutes per IP (loginRateLimit in rate-limit.ts).
 * Uses a per-instance memory fallback in production if Upstash is not configured.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations';
import { loginRateLimit, applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  try {
    const blocked = await applyRateLimit(loginRateLimit, request);
    if (blocked) return blocked;
  } catch {
    // Preserve availability on Redis service errors; missing config uses memory.
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
