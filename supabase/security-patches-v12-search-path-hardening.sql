-- ============================================================================
-- AbiaEats — Security Patch v12: Function Search Path Hardening
-- Run in Supabase SQL Editor. Single transaction, non-destructive.
--
-- WHAT WAS BROKEN (Supabase Security Advisor: "Function Search Path Mutable"):
-- These 8 functions were created without a fixed `search_path`. Postgres
-- resolves every unqualified identifier inside a function (table names,
-- other function calls) by walking the caller's search_path at call time.
-- For SECURITY DEFINER functions (log_audit, prevent_role_self_escalation,
-- update_restaurant_stats_on_delivery) this is a real privilege-escalation
-- vector: a role with CREATE on some schema earlier in the search_path
-- could shadow `audit_log`, `restaurants`, etc. and have the function
-- silently operate on the attacker's object instead. For the plain trigger
-- functions it's lower severity but still best practice to pin it.
--
-- THE FIX:
-- CREATE OR REPLACE each function, unchanged logic, adding
-- `SET search_path = public`. This is the same pattern already applied to
-- get_user_role/is_admin/owns_restaurant in security-patches-v3.sql —
-- just extended to the 8 functions that patch missed.
--
-- PRE-CHECK — run this first to confirm the current (broken) state:
--
--   SELECT p.proname, p.proconfig
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.proname IN (
--       'log_audit', 'validate_order_status_transition',
--       'handle_order_status_timestamps', 'calculate_order_amounts',
--       'update_restaurant_stats_on_delivery', 'set_updated_at',
--       'prevent_role_self_escalation', 'generate_order_number'
--     );
--
-- Expect `proconfig` to be NULL (or missing search_path) for all 8 rows
-- before this patch, and to include {search_path=public} after.
-- No table data is touched by this migration — safe to run regardless of
-- current row counts.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- log_audit — SECURITY DEFINER, writes to audit_log
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_audit(
  p_action text,
  p_actor_id uuid DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO audit_log (action, actor_id, target_type, target_id, metadata, ip_address)
  VALUES (p_action, p_actor_id, p_target_type, p_target_id, p_metadata, p_ip_address)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- --------------------------------------------------------------------------
-- validate_order_status_transition — BEFORE UPDATE trigger on orders
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'delivered' THEN
    RAISE EXCEPTION 'Cannot change status of a delivered order (order: %)', OLD.order_number;
  END IF;

  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot change status of a cancelled order (order: %)', OLD.order_number;
  END IF;

  CASE OLD.status
    WHEN 'awaiting_payment' THEN
      IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
        RAISE EXCEPTION 'Order % cannot transition from awaiting_payment to %', OLD.order_number, NEW.status;
      END IF;

    WHEN 'confirmed' THEN
      IF NEW.status NOT IN ('preparing', 'cancelled') THEN
        RAISE EXCEPTION 'Order % cannot transition from confirmed to %', OLD.order_number, NEW.status;
      END IF;

    WHEN 'preparing' THEN
      IF NEW.status NOT IN ('out_for_delivery', 'cancelled') THEN
        RAISE EXCEPTION 'Order % cannot transition from preparing to %', OLD.order_number, NEW.status;
      END IF;

    WHEN 'out_for_delivery' THEN
      IF NEW.status NOT IN ('delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Order % cannot transition from out_for_delivery to %', OLD.order_number, NEW.status;
      END IF;

    ELSE
      RAISE EXCEPTION 'Unknown order status: %', OLD.status;
  END CASE;

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- handle_order_status_timestamps — BEFORE UPDATE trigger on orders
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_order_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'confirmed' THEN
      NEW.confirmed_at := now();
    WHEN 'preparing' THEN
      NEW.preparing_at := now();
    WHEN 'out_for_delivery' THEN
      NEW.out_for_delivery_at := now();
    WHEN 'delivered' THEN
      NEW.delivered_at := now();
    WHEN 'cancelled' THEN
      NEW.cancelled_at := now();
    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- calculate_order_amounts — BEFORE INSERT trigger on orders
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_order_amounts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.commission_amount := ROUND(NEW.subtotal * NEW.commission_rate / 100);
  NEW.total := NEW.subtotal + NEW.delivery_fee;
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- update_restaurant_stats_on_delivery — SECURITY DEFINER, AFTER UPDATE trigger
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_restaurant_stats_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE restaurants
    SET
      total_orders = total_orders + 1,
      total_revenue = total_revenue + NEW.subtotal
    WHERE id = NEW.restaurant_id;
  END IF;

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- set_updated_at — BEFORE UPDATE trigger, shared across all tables
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- prevent_role_self_escalation — SECURITY DEFINER, BEFORE UPDATE trigger on profiles
-- (live definition is in security-patches.sql, which supersedes schema.sql)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role cannot be changed through user profile updates. Contact admin.';
  END IF;
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- generate_order_number — BEFORE INSERT trigger on orders
-- (live definition is the atomic-sequence version from security-patches.sql,
-- which supersedes the earlier COUNT(*)-based version in schema.sql)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_date_str text;
  v_seq_val  integer;
BEGIN
  v_date_str := to_char(now() AT TIME ZONE 'Africa/Lagos', 'YYYYMMDD');

  INSERT INTO order_number_seq (date_str, last_value)
  VALUES (v_date_str, 1)
  ON CONFLICT (date_str)
  DO UPDATE SET last_value = order_number_seq.last_value + 1
  RETURNING last_value INTO v_seq_val;

  NEW.order_number := 'ABIA-' || v_date_str || '-' || lpad(v_seq_val::text, 4, '0');
  RETURN NEW;
END;
$$;

COMMIT;

-- ============================================================================
-- POST-CHECK — confirm all 8 are now pinned:
--
--   SELECT p.proname, p.proconfig
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.proname IN (
--       'log_audit', 'validate_order_status_transition',
--       'handle_order_status_timestamps', 'calculate_order_amounts',
--       'update_restaurant_stats_on_delivery', 'set_updated_at',
--       'prevent_role_self_escalation', 'generate_order_number'
--     );
--
-- Every row should now show proconfig containing search_path=public.
-- Re-run the Security Advisor afterward — all 8 "Function Search Path
-- Mutable" warnings should clear (leaving your remaining 50 unrelated
-- warnings + the 2 info suggestions untouched).
-- ============================================================================
-- END PATCH SQL
-- ============================================================================
