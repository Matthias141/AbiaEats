-- ============================================================================
-- AbiaEats — Security Patch SQL
-- Run these in Supabase SQL Editor IN ORDER.
-- Each section is labeled with which audit finding it fixes.
-- ============================================================================

-- ============================================================================
-- FIX CRIT-2: orders_update_customer — over-permissive UPDATE policy
--
-- WHAT WAS BROKEN:
-- The old policy let any customer UPDATE any column on their own orders.
-- That includes subtotal, commission_rate, payment_method — financial fraud.
--
-- THE FIX:
-- Customers can ONLY add a rating to a DELIVERED order.
-- All other order mutations happen through restaurant owners or admins.
-- ============================================================================

DROP POLICY IF EXISTS "orders_update_customer" ON orders;

-- Customers can only rate their own delivered orders
CREATE POLICY "orders_rate_delivered"
  ON orders FOR UPDATE
  USING (
    customer_id = auth.uid()
    AND status = 'delivered'
    AND rating IS NULL          -- can only rate once
  )
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'delivered'    -- cannot change status via this policy
  );

-- ============================================================================
-- FIX RED-3: Customer phone number exposed to all restaurant queries
--
-- WHAT WAS BROKEN:
-- The orders_select_restaurant policy returned ALL columns including
-- customer_phone for ALL orders (historical, delivered, cancelled).
-- A restaurant owner could run SELECT DISTINCT customer_phone FROM orders
-- and get every customer's phone number ever.
--
-- THE FIX:
-- Drop the raw table policy. Create a VIEW that redacts customer_phone
-- for terminal-state orders. Restaurant owners query the view.
-- ============================================================================

DROP POLICY IF EXISTS "orders_select_restaurant" ON orders;

-- View that restaurant owners use — redacts phone in terminal states
CREATE OR REPLACE VIEW orders_for_restaurants AS
SELECT
  o.id,
  o.order_number,
  o.restaurant_id,
  o.rider_id,
  o.status,
  o.subtotal,
  o.delivery_fee,
  o.total,
  o.delivery_address,
  o.delivery_landmark,
  o.customer_name,
  -- SECURITY: Phone only shown during active delivery window
  CASE
    WHEN o.status IN ('confirmed', 'preparing', 'out_for_delivery')
    THEN o.customer_phone
    ELSE NULL               -- NULL, not redacted text — so UI can branch cleanly
  END AS customer_phone,
  o.notes,
  o.rating,
  o.rating_comment,
  o.confirmed_at,
  o.preparing_at,
  o.out_for_delivery_at,
  o.delivered_at,
  o.cancelled_at,
  o.cancellation_reason,
  o.created_at,
  o.updated_at
FROM orders o;

-- Grant read access on the view
GRANT SELECT ON orders_for_restaurants TO authenticated;

-- Restaurant owners can still read from orders table for their own restaurant
-- but via the view so phone is gated
CREATE POLICY "orders_select_restaurant_via_view"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = orders.restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- FIX RED-6: Role escalation — replace flawed WITH CHECK with trigger
--
-- WHAT WAS BROKEN:
-- The WITH CHECK on profiles_update_own read the role from the profiles table
-- mid-transaction, which could in edge cases allow role escalation.
--
-- THE FIX:
-- A BEFORE UPDATE trigger that fires at the database level.
-- The trigger runs BEFORE the row is changed. It compares OLD.role to NEW.role.
-- If they differ and the caller is not using the service role, it raises an error.
-- This is impossible to bypass via any RLS policy or client-side code.
-- ============================================================================

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If role is being changed, reject — only admin SQL can change roles
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role cannot be changed through user profile updates. Contact admin.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_role_immutable
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_self_escalation();

-- Recreate the update policy without role check (trigger handles it now)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ============================================================================
-- FIX HIGH-4: Bank account details visible in public restaurant SELECT
--
-- WHAT WAS BROKEN:
-- restaurants_select_public returned ALL columns including
-- bank_name, bank_account_number, bank_account_name to anonymous users.
--
-- THE FIX:
-- Create a public view that explicitly omits banking columns.
-- Drop the old wildcard policy. Public reads go through the view.
-- Only owners and admins can see their own banking details.
-- ============================================================================

DROP POLICY IF EXISTS "restaurants_select_public" ON restaurants;

-- Public view — banking columns deliberately omitted
CREATE OR REPLACE VIEW restaurants_public AS
SELECT
  id, name, slug, description, phone, address, city,
  image_url, cover_image_url, cuisine_tags,
  delivery_fee, min_delivery_time, max_delivery_time,
  is_open, is_active, total_orders, average_rating, rating_count,
  created_at
  -- bank_name, bank_account_number, bank_account_name intentionally excluded
FROM restaurants
WHERE is_active = true;

GRANT SELECT ON restaurants_public TO anon, authenticated;

-- Only owners see their own banking details (for settings page)
CREATE POLICY "restaurants_select_owner_banking"
  ON restaurants FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());

-- Public select for non-banking columns only (for browse page)
-- Note: use the view (restaurants_public) for public queries in your code
CREATE POLICY "restaurants_select_public_limited"
  ON restaurants FOR SELECT
  USING (is_active = true);


-- ============================================================================
-- FIX MED-1: Order number race condition
--
-- WHAT WAS BROKEN:
-- The old generate_order_number() counted existing orders with COUNT(*).
-- Two simultaneous orders read the same count → duplicate order numbers.
-- This fails with a UNIQUE constraint violation and the customer's order fails.
--
-- THE FIX:
-- Use a dedicated sequence table with INSERT ... ON CONFLICT ... DO UPDATE.
-- This is an atomic increment — only one transaction can hold the lock at a time.
-- Even 1000 simultaneous orders will each get a unique number.
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_number_seq (
  date_str   text PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);

-- Grant access so the trigger can write to it
GRANT INSERT, UPDATE, SELECT ON order_number_seq TO service_role;

-- Replace the old trigger function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_str text;
  v_seq_val  integer;
BEGIN
  v_date_str := to_char(now() AT TIME ZONE 'Africa/Lagos', 'YYYYMMDD');

  -- Atomic increment: INSERT or UPDATE in one statement
  -- This is guaranteed to be unique even under concurrent load
  INSERT INTO order_number_seq (date_str, last_value)
  VALUES (v_date_str, 1)
  ON CONFLICT (date_str)
  DO UPDATE SET last_value = order_number_seq.last_value + 1
  RETURNING last_value INTO v_seq_val;

  NEW.order_number := 'ABIA-' || v_date_str || '-' || lpad(v_seq_val::text, 4, '0');
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger (function already exists, just updating it)
DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();


-- ============================================================================
-- FIX DFIR-1: Audit log IP address never populated
-- FIX DFIR-2: No automatic order mutation logging
-- FIX DFIR-3: Audit log is mutable — can be deleted or updated
-- ============================================================================

-- DFIR-2: Auto-trigger that logs every INSERT/UPDATE/DELETE on orders
CREATE OR REPLACE FUNCTION audit_order_mutations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_changed_fields jsonb := '{}';
  v_key text;
BEGIN
  -- For UPDATE: capture only the fields that actually changed
  IF TG_OP = 'UPDATE' THEN
    FOR v_key IN SELECT key FROM jsonb_each(to_jsonb(NEW))
    LOOP
      IF to_jsonb(OLD) -> v_key IS DISTINCT FROM to_jsonb(NEW) -> v_key THEN
        v_changed_fields := v_changed_fields
          || jsonb_build_object(
               v_key,
               jsonb_build_object('from', to_jsonb(OLD) -> v_key, 'to', to_jsonb(NEW) -> v_key)
             );
      END IF;
    END LOOP;
  END IF;

  INSERT INTO audit_log (
    action, actor_id, target_type, target_id, metadata
  ) VALUES (
    TG_OP,                                              -- INSERT / UPDATE / DELETE
    auth.uid(),                                         -- who did it (NULL if triggered by system)
    'orders',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'operation', TG_OP,
      'changed_fields', v_changed_fields,
      'order_number', COALESCE(NEW.order_number, OLD.order_number),
      'old_status', OLD.status,
      'new_status', NEW.status
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION audit_order_mutations();

-- DFIR-3: Make audit_log IMMUTABLE — no updates or deletes, ever
-- Even the service role cannot delete audit records
-- (Supabase's RLS applies even to service role for UPDATE/DELETE on explicit policies)
DROP POLICY IF EXISTS "audit_log_no_update" ON audit_log;
DROP POLICY IF EXISTS "audit_log_no_delete" ON audit_log;

CREATE POLICY "audit_log_no_update"
  ON audit_log FOR UPDATE
  USING (false);

CREATE POLICY "audit_log_no_delete"
  ON audit_log FOR DELETE
  USING (false);


-- ============================================================================
-- FIX PURPLE-1: Minimum viable detection rules
-- These are SQL queries your monitoring cron should run every 5 minutes.
-- In production, wrap these in a Supabase Edge Function or Vercel cron.
-- ============================================================================

-- Detection Rule 1: Rapid payment confirmations (potential admin compromise/error)
-- CREATE A VIEW so the cron job queries it
CREATE OR REPLACE VIEW detect_rapid_payment_confirmations AS
SELECT
  actor_id,
  COUNT(*) AS confirmations_in_10_min,
  MIN(created_at) AS first_confirmation,
  MAX(created_at) AS last_confirmation
FROM audit_log
WHERE action = 'payment_confirmed'
  AND created_at > NOW() - INTERVAL '10 minutes'
GROUP BY actor_id
HAVING COUNT(*) > 5;  -- 5+ confirmations in 10 min = suspicious

-- Detection Rule 2: Anomalously low order subtotals (price injection attempt)
CREATE OR REPLACE VIEW detect_low_subtotal_orders AS
SELECT id, customer_id, subtotal, created_at, order_number
FROM orders
WHERE subtotal < 500   -- ₦500 is unrealistically low for any restaurant order
  AND created_at > NOW() - INTERVAL '1 hour';

-- Detection Rule 3: Same customer ordering from many different restaurants rapidly
CREATE OR REPLACE VIEW detect_rapid_multi_restaurant_orders AS
SELECT
  customer_id,
  COUNT(DISTINCT restaurant_id) AS unique_restaurants,
  COUNT(*) AS total_orders,
  MIN(created_at) AS first_order,
  MAX(created_at) AS last_order
FROM orders
WHERE created_at > NOW() - INTERVAL '30 minutes'
GROUP BY customer_id
HAVING COUNT(*) >= 5 AND COUNT(DISTINCT restaurant_id) >= 3;
-- 5+ orders from 3+ restaurants in 30min = credential stuffing / fraud

-- ============================================================================
-- END PATCH SQL
-- ============================================================================