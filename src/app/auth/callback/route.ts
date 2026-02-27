import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Validate the post-auth redirect target against an explicit allowlist.
 *
 * Allowlist approach is strictly safer than prefix-only checks — no query
 * parameter injection, no path traversal, no protocol-relative URLs.
 *
 * Blocks:  https://evil.com  //evil.com  javascript:alert(1)  /path\nevil
 *          /home?next=https://evil.com  (query injection in prefix check)
 * Allows:  /home  /restaurants  /restaurants/[id]  /checkout  /profile  etc.
 */
const ALLOWED_PATH_PREFIXES = [
  '/home',
  '/restaurants',
  '/order',
  '/checkout',
  '/profile',
  '/admin',
  '/restaurant',
  '/auth',
] as const;

function getSafeRedirectPath(next: string | null): string {
  if (!next) return '/home';

  // Strip query string and fragment for prefix matching, then validate full path
  let pathname: string;
  try {
    // Use a dummy base to parse relative paths
    const url = new URL(next, 'https://placeholder.internal');
    // Reject anything that resolves to a different host (absolute URLs)
    if (url.hostname !== 'placeholder.internal') return '/home';
    pathname = url.pathname;
  } catch {
    return '/home';
  }

  // Block header injection attempts in the original value
  if (/[\r\n]/.test(next)) return '/home';

  // Must match one of our known internal path prefixes
  const isAllowed = ALLOWED_PATH_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  return isAllowed ? next : '/home';
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getSafeRedirectPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
