import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createClient() {
  // Provide fallback values during SSR prerendering when env vars may not be
  // available. The client is only meaningfully used on the browser side where
  // NEXT_PUBLIC_* vars are always injected by Next.js.
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  );
}
