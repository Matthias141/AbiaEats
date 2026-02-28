import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
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
