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
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
