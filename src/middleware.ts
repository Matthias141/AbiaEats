import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// TODO [PRE-PRODUCTION]: Add rate limiting (60 req/min per user on write endpoints).
// Requires Upstash Redis or similar edge-compatible store.
// See CYBERSEC_BLUE.md and CLAUDE.md §8 for requirements.

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
