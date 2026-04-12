import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * FIX: MED-3 — CSP unsafe-inline on script-src
 *
 * How nonce-based CSP works:
 * 1. Middleware generates a cryptographically random nonce per request
 * 2. The nonce is embedded in the CSP header: script-src 'nonce-<value>'
 * 3. Next.js reads the nonce from the response header and attaches it
 *    to every inline <script> it generates during SSR
 * 4. The browser only executes scripts whose nonce attribute matches the header
 * 5. An attacker who injects <script>evil()</script> has no nonce → blocked
 *
 * INTERN EXPLAINER:
 * Think of it as a wristband at a party. Only guests with the right wristband
 * get in. The party host (Next.js) hands out wristbands. If someone sneaks in
 * without one, the bouncer (browser) throws them out.
 *
 * Next.js 15 reads the nonce from the `x-nonce` response header automatically
 * when you set it in middleware — no layout changes needed.
 */

function generateNonce(): string {
  // 16 bytes = 128 bits of entropy — well above NIST SP 800-90A minimum
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

export async function updateSession(request: NextRequest) {
  // ── Step 1: Generate nonce for this request ──────────────────────────────
  const nonce = generateNonce();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
  const supabaseWss = supabaseUrl.replace(/^https?:\/\//, 'wss://');

  // ── Step 2: Build CSP with nonce — NO unsafe-inline on script-src ────────
  const csp = [
    "default-src 'self'",
    // nonce-based: only scripts Next.js stamps with this nonce are allowed
    `script-src 'self' 'nonce-${nonce}'`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com`,
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' https://fonts.gstatic.com",
    // style-src still needs unsafe-inline (CSS-in-JS, Tailwind) — acceptable trade-off
    // Style injection attacks are far less dangerous than script injection
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  // ── Step 3: Build the response, inject CSP + nonce headers ───────────────
  let supabaseResponse = NextResponse.next({ request });
  supabaseResponse.headers.set('Content-Security-Policy', csp);
  // Next.js 15 reads x-nonce and stamps it on all SSR-generated inline scripts
  supabaseResponse.headers.set('x-nonce', nonce);

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          // Re-apply security headers after response rebuild
          supabaseResponse.headers.set('Content-Security-Policy', csp);
          supabaseResponse.headers.set('x-nonce', nonce);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth/login', '/auth/signup', '/auth/callback', '/home', '/onboarding', '/privacy-policy'];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isApiRoute = pathname.startsWith('/api/');
  const isStaticAsset = pathname.startsWith('/_next/') || pathname.includes('.');

  // Allow public routes, API routes, and static assets
  if (isPublicRoute || isApiRoute || isStaticAsset) {
    return supabaseResponse;
  }

  // Customer-facing restaurant browsing is public
  if (pathname.startsWith('/restaurants')) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Role-based route protection
  if (pathname.startsWith('/admin') || pathname.startsWith('/restaurant')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (pathname.startsWith('/admin') && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (
      pathname.startsWith('/restaurant') &&
      profile?.role !== 'restaurant_owner' &&
      profile?.role !== 'admin'
    ) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return supabaseResponse;
}
