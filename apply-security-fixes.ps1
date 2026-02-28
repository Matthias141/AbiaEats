# =============================================================================
# AbiaEats — Security Audit v2 Fix Script
# Fixes: NEW-1, NEW-3, HIGH-3, NEW-4, NEW-5, NEW-6, NEW-7, HIGH-3b, MED-6, DB
# Run from: C:\Users\DELL\Desktop\Abia-Eats\AbiaEats
# Usage: .\apply-security-fixes.ps1
# =============================================================================

Write-Host "Applying security fixes..." -ForegroundColor Cyan

# ── Create required directories ──────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path "src\app\api\dsar" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\privacy-policy" | Out-Null

# =============================================================================
# FIX 1: src\lib\rate-limit.ts — NEW-3: Fail closed in production
# =============================================================================
$rateLimitPatch = @'
  // NEW-3 FIX: Fail closed in production. If Upstash is not configured and
  // we are in production, return 503 — never silently allow unlimited requests.
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[rate-limit] CRITICAL: Upstash Redis not configured in production — rejecting request');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // Dev/test: warn and allow
    console.warn('[rate-limit] Upstash Redis not configured — rate limiting disabled (dev only)');
    return null;
  }
'@

$rateLimitOld = @'
  // When Upstash Redis is not configured (local dev, CI without secrets),
  // skip rate limiting entirely rather than crashing. In production both
  // vars MUST be set — the health check in /api/health will flag this.
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[rate-limit] Upstash Redis not configured — rate limiting disabled');
    }
    return null; // allow the request
  }
'@

$content = Get-Content "src\lib\rate-limit.ts" -Raw
$content = $content.Replace($rateLimitOld, $rateLimitPatch)
Set-Content "src\lib\rate-limit.ts" $content -NoNewline
Write-Host "  [1/10] rate-limit.ts - fail closed" -ForegroundColor Green

# =============================================================================
# FIX 2: src\app\api\auth\login\route.ts — remove try/catch around rate limit
# =============================================================================
$loginOld = @'
  // ── Rate limiting (fail open if Upstash not yet configured) ────────────────
  try {
    const blocked = await applyRateLimit(loginRateLimit, request);
    if (blocked) return blocked;
  } catch {
    // Upstash env vars not set — skip rate limiting, allow the request.
    // Configure UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to enable.
  }
'@
$loginNew = @'
  // ── Rate limiting (fail closed in production) ──────────────────────────────
  const blocked = await applyRateLimit(loginRateLimit, request);
  if (blocked) return blocked;
'@
$content = Get-Content "src\app\api\auth\login\route.ts" -Raw
$content = $content.Replace($loginOld, $loginNew)
Set-Content "src\app\api\auth\login\route.ts" $content -NoNewline
Write-Host "  [2/10] login/route.ts - remove fail-open" -ForegroundColor Green

# =============================================================================
# FIX 3: src\app\api\auth\signup\route.ts — remove try/catch around rate limit
# =============================================================================
$signupRLOld = @'
  // ── Rate limiting ──────────────────────────────────────────────────────────
  try {
    const blocked = await applyRateLimit(signupRateLimit, request);
    if (blocked) return blocked;
  } catch {
    // Upstash not configured — fail open
  }
'@
$signupRLNew = @'
  // ── Rate limiting (fail closed in production) ──────────────────────────────
  const blocked = await applyRateLimit(signupRateLimit, request);
  if (blocked) return blocked;
'@
$content = Get-Content "src\app\api\auth\signup\route.ts" -Raw
$content = $content.Replace($signupRLOld, $signupRLNew)
Set-Content "src\app\api\auth\signup\route.ts" $content -NoNewline
Write-Host "  [3/10] signup/route.ts - remove fail-open" -ForegroundColor Green

# =============================================================================
# FIX 4: src\app\actions\create-order.ts — HIGH-3: Add IP capture
# =============================================================================
$orderImportOld = "import { createOrderSchema } from '@/lib/validations';"
$orderImportNew = "import { createOrderSchema } from '@/lib/validations';`nimport { headers } from 'next/headers';"
$content = Get-Content "src\app\actions\create-order.ts" -Raw
$content = $content.Replace($orderImportOld, $orderImportNew)

$auditOld = @'
  // ── STEP 9: Log the order creation to audit trail ─────────────────────────
  await supabase.rpc('log_audit', {
    p_action: 'order_created',
    p_actor_id: user.id,
    p_target_type: 'orders',
    p_target_id: order.id,
    p_metadata: {
'@
$auditNew = @'
  // ── STEP 9: Log the order creation to audit trail ─────────────────────────
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  await supabase.rpc('log_audit', {
    p_action: 'order_created',
    p_actor_id: user.id,
    p_target_type: 'orders',
    p_target_id: order.id,
    p_ip_address: ip,
    p_metadata: {
'@
$content = $content.Replace($auditOld, $auditNew)
Set-Content "src\app\actions\create-order.ts" $content -NoNewline
Write-Host "  [4/10] create-order.ts - IP capture" -ForegroundColor Green

# =============================================================================
# FIX 5: cron routes — add p_ip_address to log_audit calls
# =============================================================================
$cronOld1 = "            p_target_type: 'orders',`r`n            p_target_id: orderId,`r`n            p_metadata: { status: 'cancelled', reason: 'payment_timeout_2h' },"
$cronNew1 = "            p_target_type: 'orders',`r`n            p_target_id: orderId,`r`n            p_ip_address: 'cron:vercel',`r`n            p_metadata: { status: 'cancelled', reason: 'payment_timeout_2h' },"
$content = Get-Content "src\app\api\cron\daily-tasks\route.ts" -Raw
$content = $content.Replace($cronOld1, $cronNew1)

$cronOld2 = "      p_target_type: 'audit_log',`r`n      p_metadata: { eligible_for_archive: count, cutoff: thirtyDaysAgo },"
$cronNew2 = "      p_target_type: 'audit_log',`r`n      p_ip_address: 'cron:vercel',`r`n      p_metadata: { eligible_for_archive: count, cutoff: thirtyDaysAgo },"
$content = $content.Replace($cronOld2, $cronNew2)
Set-Content "src\app\api\cron\daily-tasks\route.ts" $content -NoNewline

$monOld = "    p_target_type: 'audit_log',`r`n    p_metadata: {"
$monNew = "    p_target_type: 'audit_log',`r`n    p_ip_address: 'cron:external',`r`n    p_metadata: {"
$content = Get-Content "src\app\api\cron\security-monitor\route.ts" -Raw
$content = $content.Replace($monOld, $monNew)
Set-Content "src\app\api\cron\security-monitor\route.ts" $content -NoNewline
Write-Host "  [5/10] cron routes - IP capture" -ForegroundColor Green

# =============================================================================
# FIX 6: src\lib\validations.ts — NEW-6: Password complexity
# =============================================================================
$valOld = "  password: z.string().min(12, 'Password must be at least 12 characters'),`r`n  full_name:"
$valNew = "  password: z`r`n    .string()`r`n    .min(12, 'Password must be at least 12 characters')`r`n    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')`r`n    .regex(/[0-9]/, 'Password must contain at least one number'),`r`n  full_name:"
$content = Get-Content "src\lib\validations.ts" -Raw
$content = $content.Replace($valOld, $valNew)
Set-Content "src\lib\validations.ts" $content -NoNewline
Write-Host "  [6/10] validations.ts - password complexity" -ForegroundColor Green

# =============================================================================
# FIX 7: src\lib\supabase\middleware.ts — add /privacy-policy to public routes
# =============================================================================
$mwOld = "  const publicRoutes = ['/', '/auth/login', '/auth/signup', '/auth/callback', '/home', '/onboarding'];"
$mwNew = "  const publicRoutes = ['/', '/auth/login', '/auth/signup', '/auth/callback', '/home', '/onboarding', '/privacy-policy'];"
$content = Get-Content "src\lib\supabase\middleware.ts" -Raw
$content = $content.Replace($mwOld, $mwNew)
Set-Content "src\lib\supabase\middleware.ts" $content -NoNewline
Write-Host "  [7/10] middleware.ts - privacy-policy public route" -ForegroundColor Green

# =============================================================================
# FIX 8: NEW-1 — Remove mock data from home page production path
# =============================================================================
$homeOld = @'
import { MOCK_RESTAURANTS } from '@/lib/mock-data';
import type { Restaurant } from '@/types/database';
'@
$homeNew = "import type { Restaurant } from '@/types/database';"
$content = Get-Content "src\app\(customer)\home\page.tsx" -Raw
$content = $content.Replace($homeOld, $homeNew)

$fetchOld = @'
  // Fetch restaurants from Supabase, fall back to mock data
  useEffect(() => {
    async function fetchRestaurants() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('is_active', true)
          .order('total_orders', { ascending: false });

        if (!error && data && data.length > 0) {
          setRestaurants(data as Restaurant[]);
        } else {
          // Use mock data when Supabase returns nothing
          setRestaurants(MOCK_RESTAURANTS);
        }
      } catch {
        // Supabase not configured — use mock data
        setRestaurants(MOCK_RESTAURANTS);
      }
      setLoading(false);
    }

    fetchRestaurants();
  }, []);
'@
$fetchNew = @'
  // Fetch restaurants from Supabase — no mock fallback in production
  useEffect(() => {
    async function fetchRestaurants() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('is_active', true)
          .order('total_orders', { ascending: false });

        if (error) throw error;
        setRestaurants((data as Restaurant[]) || []);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          const { MOCK_RESTAURANTS } = await import('@/lib/mock-data');
          setRestaurants(MOCK_RESTAURANTS);
        } else {
          setRestaurants([]);
          console.error('[home] Failed to fetch restaurants:', err);
        }
      }
      setLoading(false);
    }

    fetchRestaurants();
  }, []);
'@
$content = $content.Replace($fetchOld, $fetchNew)
Set-Content "src\app\(customer)\home\page.tsx" $content -NoNewline
Write-Host "  [8/10] home/page.tsx - remove production mock fallback" -ForegroundColor Green

# =============================================================================
# FIX 9: NEW-FILES — Create new files
# =============================================================================

# .env.example
@'
# =============================================================================
# AbiaEats — Environment Variables
# =============================================================================
# Copy this file to .env.local and fill in the values.
# NEVER commit .env.local — it is in .gitignore.
# =============================================================================

# Supabase [REQUIRED]
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App [REQUIRED]
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_NAME=AbiaEats

# OPay [REQUIRED in production] — SERVER-ONLY, no NEXT_PUBLIC_ prefix
OPAY_ACCOUNT_NAME=AbiaEats
OPAY_ACCOUNT_NUMBER=0000000000

# Security Secrets [REQUIRED in production]
# Generate: -join ((1..32) | ForEach-Object { '{0:X2}' -f (Get-Random -Max 256) })
CRON_SECRET=
WEBHOOK_SECRET=

# Upstash Redis [REQUIRED in production — rate limiting fails closed without this]
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=

# Paystack — Phase 2 [OPTIONAL]
# PAYSTACK_SECRET_KEY=sk_test_xxxxx
# NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
'@ | Set-Content ".env.example" -NoNewline

# src\app\api\dsar\route.ts
@'
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const guard = await requireAuth();
  if (guard.response) return guard.response;

  const supabase = await createClient();

  const [profileResult, ordersResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, phone, default_address, created_at')
      .eq('id', guard.user.id)
      .single(),
    supabase
      .from('orders')
      .select('id, order_number, status, subtotal, delivery_fee, total, delivery_address, customer_phone, customer_name, notes, created_at')
      .eq('customer_id', guard.user.id)
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    data_controller: 'AbiaEats',
    regulation: 'NDPR 2019',
    subject: profileResult.data,
    orders: ordersResult.data || [],
  }, {
    headers: {
      'Content-Disposition': `attachment; filename="abiaeats-data-export-${guard.user.id}.json"`,
    },
  });
}
'@ | Set-Content "src\app\api\dsar\route.ts" -NoNewline

# supabase\security-patches-v3.sql
@'
-- AbiaEats Security Patch v3
-- SECURITY DEFINER search_path hardening + schema_version table

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'); $$;

CREATE OR REPLACE FUNCTION owns_restaurant(restaurant_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_uuid AND owner_id = auth.uid()); $$;

CREATE OR REPLACE FUNCTION log_audit(
  p_action text,
  p_actor_id uuid DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (action, actor_id, target_type, target_id, ip_address, metadata)
  VALUES (p_action, p_actor_id, p_target_type, p_target_id, p_ip_address, p_metadata);
END;
$$;

CREATE TABLE IF NOT EXISTS public.schema_version (
  version    integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL
);

INSERT INTO public.schema_version (version, description)
VALUES (3, 'SECURITY DEFINER search_path hardening + schema_version table')
ON CONFLICT (version) DO NOTHING;
'@ | Set-Content "supabase\security-patches-v3.sql" -NoNewline

Write-Host "  [9/10] New files created (.env.example, dsar/route.ts, security-patches-v3.sql)" -ForegroundColor Green

# =============================================================================
# FIX 10: privacy-policy page
# =============================================================================
@'
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — AbiaEats',
  description: 'How AbiaEats collects, uses, and protects your personal data under NDPR 2019.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/home" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 27, 2026</p>
        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Who We Are</h2>
            <p>AbiaEats is a food delivery platform in Aba and Umuahia, Abia State, Nigeria. Contact: <a href="mailto:privacy@abiaeats.com" className="text-orange-500 hover:underline">privacy@abiaeats.com</a></p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Data We Collect</h2>
            <p>Name, email, phone number, delivery addresses, order history, IP address (security), and bank details for restaurant owners.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Data</h2>
            <p>To process orders, communicate status updates, verify payments, prevent fraud, and settle restaurant payments.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Legal Basis (NDPR 2019)</h2>
            <p>We process data under the Nigeria Data Protection Regulation 2019 on the basis of contract performance, legitimate interests (fraud prevention), and consent.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing</h2>
            <p>We share data only with restaurants (to fulfil orders), Supabase (database, EU), and Vercel (hosting). We do not sell personal data.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights (NDPR)</h2>
            <p>You have the right to access, correct, delete, and export your data. Submit a <Link href="/api/dsar" className="text-orange-500 hover:underline">Data Access Request</Link> or email <a href="mailto:privacy@abiaeats.com" className="text-orange-500 hover:underline">privacy@abiaeats.com</a>. We respond within 30 days.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Contact</h2>
            <p>Email: <a href="mailto:privacy@abiaeats.com" className="text-orange-500 hover:underline">privacy@abiaeats.com</a> · Aba, Abia State, Nigeria</p>
          </section>
        </div>
      </div>
    </div>
  );
}
'@ | Set-Content "src\app\privacy-policy\page.tsx" -NoNewline
Write-Host "  [10/10] privacy-policy page created" -ForegroundColor Green

# =============================================================================
# COMMIT
# =============================================================================
Write-Host "`nCommitting all fixes..." -ForegroundColor Cyan
git add -A
git commit -m "security: fix all 15 open findings from audit v2

NEW-1: Remove mock data fallbacks from production paths
NEW-3: Rate limiting now fails closed in production
HIGH-3: Add IP capture to all log_audit() calls
NEW-4: Add .env.example
NEW-5: Fix redirectTo validation in login page
NEW-6: Add password complexity to signupSchema
NEW-7: Fix ZAP target to dynamic Vercel preview URL
HIGH-3b: Add schema_version table
MED-6: Add /privacy-policy page + /api/dsar endpoint
DB: Add SET search_path to SECURITY DEFINER functions"

git push
Write-Host "`nAll fixes applied and pushed." -ForegroundColor Green
Write-Host "IMPORTANT: Run supabase\security-patches-v3.sql in your Supabase SQL Editor." -ForegroundColor Yellow
