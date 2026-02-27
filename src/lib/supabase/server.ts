import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  // Fallback placeholders keep the server client constructible when env vars are
  // not yet set (local dev, CI preview builds). Real Supabase calls will return
  // auth errors — that is the correct behaviour when no project is wired up.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL     || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

// createAdminClient() has been removed from this file (P3 security fix).
// Accidental use in customer-facing routes bypasses ALL RLS policies.
// For webhooks/crons, use: import { createAdminClient_WEBHOOKS_AND_CRONS_ONLY } from '@/lib/auth-guard'
