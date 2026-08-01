import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

/**
 * CSP script-src: 'unsafe-inline', NOT nonce-based. Read this before "fixing" it.
 *
 * A prior version of this file implemented textbook nonce-based CSP
 * (script-src 'self' 'nonce-<random>', no unsafe-inline) generated fresh per
 * request, with the nonce threaded through both the request headers (via
 * NextResponse.next({ request: { headers } })) and the response headers —
 * exactly matching Next.js's documented pattern.
 *
 * It broke the entire site. Every page's inline hydration/RSC-payload
 * scripts (self.__next_f.push(...)) rendered with no nonce attribute at
 * all, the browser blocked them as CSP violations, React never hydrated,
 * and every onClick handler everywhere silently did nothing — reproduced
 * with a headless-browser console capture showing six blocked-script CSP
 * violations on a completely static page (no auth, no data fetching).
 *
 * Root-caused via direct patching of node_modules/next internals:
 *   - Confirmed the CSP header WAS correctly forwarded through the full
 *     middleware → x-middleware-override-headers → resolve-routes.js →
 *     req.headers pipeline (verified with debug logging at each stage).
 *   - Next's own nonce-extraction code (get-script-nonce-from-header.js,
 *     called from app-render.js's parseRequestHeaders) never executed for
 *     the request — neither the CJS nor ESM build of that function ever
 *     logged, despite the correct CSP arriving at req.headers one layer
 *     up. No experimental config flag was found to opt into different
 *     behavior.
 *   - Separately: several of the affected routes (/, /onboarding,
 *     /auth/login, /auth/signup, /cart, /checkout, /home,
 *     /privacy-policy) were statically prerendered at build time, which is
 *     independently fatal to nonce-based CSP — a nonce baked into HTML at
 *     build time can never match a nonce generated fresh per request.
 *     (Confirmed: identical HTML byte-for-byte across separate requests,
 *     differing only in the CSP response header's nonce value.) Forcing
 *     dynamic rendering everywhere does NOT fix this on its own either —
 *     tested that combination directly and the nonce-extraction code still
 *     never fired.
 *
 * Net effect: in this exact Next.js 16.2.12 + Turbopack + self-hosted
 * `next start` combination, Next.js does not reliably nonce-stamp its own
 * inline scripts, and static rendering makes correct per-request nonces
 * structurally impossible anyway. Shipping a CSP that silently disables
 * the entire app is strictly worse than the XSS risk it was meant to
 * reduce. Reverted to 'unsafe-inline', matching the working configuration
 * that shipped before this fix was introduced.
 *
 * NOTE: a second attempt at nonce-based CSP (request-header threading +
 * force-dynamic rendering, functionally identical to what's described
 * above) was independently pushed to main and merged into this branch.
 * It was verified only against `npm run dev`, not a production build —
 * dev mode does not reproduce this bug (no static prerendering, different
 * bundling path), which is almost certainly why it looked fixed there.
 * Confirmed via `next build && next start` + headless-browser testing that
 * it does not fix the issue. Reverted again here.
 *
 * FOLLOW-UP (not done here — needs dedicated investigation time):
 * A hash-based CSP (sha256-<hash> per distinct inline script, computed at
 * build time and injected into next.config headers()) would restore a
 * strict script-src without the request/build-time nonce mismatch, since
 * hashes match by content rather than a per-request token. This needs a
 * build step to enumerate and hash Next's generated inline scripts —
 * out of scope for this fix, which prioritizes restoring site
 * functionality immediately.
 */

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
  const supabaseWss = supabaseUrl.replace(/^https?:\/\//, 'wss://');

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${supabaseUrl} ${supabaseWss} https://api.anthropic.com`,
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  let supabaseResponse = NextResponse.next({ request });
  supabaseResponse.headers.set('Content-Security-Policy', csp);

  const supabase = createServerClient<Database>(
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
          supabaseResponse.headers.set('Content-Security-Policy', csp);
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
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/restaurant') ||
    pathname.startsWith('/dashboard/ops')
  ) {
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

    // /dashboard/ops is a second, minimal admin surface for restaurant/vendor
    // onboarding. Same role gate as /admin, kept separate per product request.
    if (pathname.startsWith('/dashboard/ops') && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return supabaseResponse;
}
