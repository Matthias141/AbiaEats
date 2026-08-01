-- =============================================================================
-- AbiaEats — Security Patch v9
-- Fix Supabase Advisor "Security Definer View" findings
-- Date: 2026-08-01
-- =============================================================================
--
-- PROBLEM:
-- Views in Postgres run with the privileges of the VIEW OWNER by default
-- (typically the `postgres` superuser in Supabase), not the querying user.
-- This means RLS policies on underlying tables (orders, audit_log,
-- restaurants) are silently bypassed for anyone who can query the view.
--
-- Supabase Advisor flagged 5 views for this:
--   - restaurants_public
--   - orders_for_restaurants
--   - detect_rapid_payment_confirmations
--   - detect_low_subtotal_orders
--   - detect_rapid_multi_restaurant_orders
--
-- CONCRETE RISK FOUND DURING AUDIT:
-- The three detect_* monitoring views (created in security-patches.sql for
-- fraud/anomaly detection cron jobs) had ZERO explicit GRANT/REVOKE
-- statements. Combined with the view-owner-bypasses-RLS behavior, this
-- meant any authenticated user could potentially query
-- `detect_low_subtotal_orders` or `detect_rapid_multi_restaurant_orders`
-- and see EVERY customer's order data — a full RLS bypass, not just a
-- theoretical lint finding.
--
-- Also found (not in the Advisor's 5, but same root cause):
-- `restaurants_with_banking` (schema-patch-v5-vault.sql) is granted SELECT
-- to ALL authenticated users with a comment claiming "RLS enforces admin
-- check" — but the view has no admin filter at all. Every logged-in
-- customer could read every restaurant's decrypted bank account details.
--
-- FIX:
-- 1. security_invoker = true on all views — makes them run as the
--    QUERYING user, so underlying table RLS applies as defense-in-depth.
-- 2. Explicit REVOKE + narrow GRANT on every view (never rely on defaults).
-- 3. Add an actual is_admin() filter to restaurants_with_banking.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fix 1: restaurants_public — already scoped to is_active=true, intended
-- for public browsing. security_invoker adds defense-in-depth; grants
-- were already correct (anon + authenticated), kept as-is.
-- -----------------------------------------------------------------------------
ALTER VIEW public.restaurants_public SET (security_invoker = on);

REVOKE ALL ON public.restaurants_public FROM PUBLIC;
GRANT SELECT ON public.restaurants_public TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Fix 2: orders_for_restaurants — already scoped via is_admin() /
-- owns_restaurant() in its WHERE clause. security_invoker makes the
-- underlying orders RLS apply too, so a bug in the view's own logic isn't
-- the only thing standing between a caller and other restaurants' orders.
-- -----------------------------------------------------------------------------
ALTER VIEW public.orders_for_restaurants SET (security_invoker = on);

REVOKE ALL ON public.orders_for_restaurants FROM PUBLIC, anon;
GRANT SELECT ON public.orders_for_restaurants TO authenticated;

-- -----------------------------------------------------------------------------
-- Fix 3: Fraud-detection monitoring views — these are for admin/cron use
-- ONLY, never for app users. They had no explicit grants before this patch,
-- which — combined with view-owner-bypasses-RLS — could have let any
-- authenticated user see every customer's order and payment-confirmation
-- activity. Lock these down to service_role only.
-- -----------------------------------------------------------------------------
ALTER VIEW public.detect_rapid_payment_confirmations SET (security_invoker = on);
ALTER VIEW public.detect_low_subtotal_orders SET (security_invoker = on);
ALTER VIEW public.detect_rapid_multi_restaurant_orders SET (security_invoker = on);

REVOKE ALL ON public.detect_rapid_payment_confirmations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.detect_low_subtotal_orders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.detect_rapid_multi_restaurant_orders FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.detect_rapid_payment_confirmations TO service_role;
GRANT SELECT ON public.detect_low_subtotal_orders TO service_role;
GRANT SELECT ON public.detect_rapid_multi_restaurant_orders TO service_role;

-- -----------------------------------------------------------------------------
-- Fix 4: restaurants_with_banking — CRITICAL. Previously granted to ALL
-- authenticated users (every customer) with no row-level admin filter.
-- Add an explicit is_admin() check and restrict grants.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.restaurants_with_banking AS
SELECT
  r.*,
  CASE WHEN r.bank_name_enc IS NOT NULL THEN
    convert_from(pgsodium.crypto_aead_det_decrypt(
      decode(r.bank_name_enc, 'base64'),
      r.id::text::bytea,
      (SELECT id FROM vault.secrets WHERE name = 'bank_account_key'),
      NULL
    ), 'UTF8')
  ELSE NULL END AS bank_name,
  CASE WHEN r.bank_account_number_enc IS NOT NULL THEN
    convert_from(pgsodium.crypto_aead_det_decrypt(
      decode(r.bank_account_number_enc, 'base64'),
      r.id::text::bytea,
      (SELECT id FROM vault.secrets WHERE name = 'bank_account_key'),
      NULL
    ), 'UTF8')
  ELSE NULL END AS bank_account_number,
  CASE WHEN r.bank_account_name_enc IS NOT NULL THEN
    convert_from(pgsodium.crypto_aead_det_decrypt(
      decode(r.bank_account_name_enc, 'base64'),
      r.id::text::bytea,
      (SELECT id FROM vault.secrets WHERE name = 'bank_account_key'),
      NULL
    ), 'UTF8')
  ELSE NULL END AS bank_account_name
FROM public.restaurants r
WHERE is_admin() OR r.owner_id = auth.uid();

ALTER VIEW public.restaurants_with_banking SET (security_invoker = on);
ALTER VIEW public.restaurants_with_banking OWNER TO postgres;

REVOKE ALL ON public.restaurants_with_banking FROM PUBLIC, anon;
GRANT SELECT ON public.restaurants_with_banking TO authenticated;

-- -----------------------------------------------------------------------------
-- Schema version
-- -----------------------------------------------------------------------------
INSERT INTO schema_version (version, description)
VALUES (9, 'security_invoker on all views + lock down monitoring/banking view grants (Advisor Security Definer View fix)')
ON CONFLICT (version) DO NOTHING;
