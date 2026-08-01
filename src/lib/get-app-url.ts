/**
 * Resolves the base URL of the currently running deployment.
 *
 * NEXT_PUBLIC_APP_URL is a fixed value set per-environment in Vercel, so it
 * works for Production but can't be set once for Preview — every PR/branch
 * gets its own random *.vercel.app URL. VERCEL_URL is injected automatically
 * by Vercel with that exact deployment's URL, so it's the right fallback for
 * Preview without any manual configuration.
 */
export function getAppUrl(): string {
  // Strip trailing slashes — callers append a path (e.g. `${getAppUrl()}/auth/callback`),
  // and a doubled slash fails Supabase's exact-match redirect allowlist.
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
