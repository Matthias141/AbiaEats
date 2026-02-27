import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Validate the post-auth redirect target.
 *
 * Only allow relative paths that start with '/' and not '//'.
 * Blocks:  https://evil.com  //evil.com  javascript:alert(1)  /path\nevil
 * Allows:  /home  /restaurants  /checkout
 */
function getSafeRedirectPath(next: string | null): string {
  if (!next) return '/home';
  if (
    next.startsWith('/') &&
    !next.startsWith('//') && // block protocol-relative URLs
    !/[\r\n]/.test(next)      // block header-injection attempts
  ) {
    return next;
  }
  return '/home';
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
