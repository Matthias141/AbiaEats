-- =============================================================================
-- AbiaEats — Security Patch v11
-- Uniqueness constraint on orders.payment_reference
-- Date: 2026-08-02
-- =============================================================================
--
-- Audit finding: orders.payment_reference has no uniqueness constraint.
-- The manual OPay payment-confirmation flow (POST /api/admin/confirm-payment,
-- src/app/api/admin/confirm-payment/route.ts) accepts an optional
-- payment_reference string with no duplicate check against other orders.
-- Nothing in the API or the database stops the same OPay transfer reference
-- from being recorded against two different orders — by admin error under
-- order-volume pressure, or by a compromised/malicious admin session
-- double-spending one real transfer across two orders. This is a live
-- production gap on money-moving code, not a theoretical one — flagged in
-- the "Supply Chain, AppSec & Operational Readiness Audit" (§6, Payment
-- Integration Readiness) as the #1 prioritized action.
--
-- Fix: a partial UNIQUE index on payment_reference, scoped to
-- WHERE payment_reference IS NOT NULL. A plain UNIQUE constraint would
-- incorrectly reject the many orders that have never had a reference
-- recorded (still awaiting_payment, or confirmed without one prior to this
-- patch) — Postgres treats every NULL as distinct for uniqueness purposes,
-- but naming the WHERE clause explicitly here documents that this is
-- deliberate, not an accident of NULL semantics. Same pattern already used
-- for orders.idempotency_key in security-patches-v8-idempotency.sql.
--
-- Once this index exists, a second confirm-payment call reusing an
-- already-recorded reference will fail the INSERT/UPDATE at the database
-- layer even if an application-level duplicate check is ever bypassed,
-- removed, or has a bug — defense in depth, not the only line of defense.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 0 — RUN THIS FIRST, BEFORE APPLYING THE INDEX BELOW.
--
-- This migration will fail with a "duplicate key value violates unique
-- constraint" error if any existing rows already share a non-null
-- payment_reference. Run the query below against production first. If it
-- returns any rows, resolve them manually (confirm which order actually
-- matches the OPay transaction, and correct/null out the reference on the
-- other order(s)) BEFORE running STEP 1.
--
--   SELECT payment_reference, array_agg(id) AS order_ids, count(*) AS dupes
--   FROM orders
--   WHERE payment_reference IS NOT NULL
--   GROUP BY payment_reference
--   HAVING count(*) > 1;
--
-- If this returns zero rows, it is safe to proceed directly to STEP 1.
-- -----------------------------------------------------------------------------

-- STEP 1: Partial unique index — only enforced where a reference is actually recorded.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_reference_unique
  ON orders (payment_reference)
  WHERE payment_reference IS NOT NULL;

-- Schema version
INSERT INTO schema_version (version, description)
VALUES (11, 'Partial unique index on orders.payment_reference — closes duplicate/reused OPay reference audit finding')
ON CONFLICT (version) DO NOTHING;
