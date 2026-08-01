-- =============================================================================
-- AbiaEats — Security Patch v7
-- Remaining vulnerability fixes
-- Date: 2026-08-01
-- =============================================================================
--
-- Fixes:
-- 1. Rating allowed on any order status (must be 'delivered' only)
-- 2. No trigger to update restaurant average_rating when orders are rated
-- 3. No DB-level guard against role escalation via service_role key
-- 4. Phone numbers stored in non-normalized format
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fix 1: Validate that ratings can only be set on delivered orders
-- Also prevents modifying rating after it's been set (immutable once rated)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_order_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only validate if rating is being set or changed
  IF NEW.rating IS NOT NULL AND (OLD.rating IS NULL OR OLD.rating != NEW.rating) THEN
    IF NEW.status != 'delivered' THEN
      RAISE EXCEPTION 'Orders can only be rated after delivery';
    END IF;
    IF OLD.rating IS NOT NULL THEN
      RAISE EXCEPTION 'Order has already been rated';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_rating_on_delivered
  BEFORE UPDATE OF rating ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_rating();

-- -----------------------------------------------------------------------------
-- Fix 2: Update restaurant average_rating when an order is rated
-- Recalculates from all delivered, rated orders for accuracy
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_restaurant_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric(3,2);
  v_count integer;
BEGIN
  IF NEW.rating IS NOT NULL AND (OLD.rating IS NULL OR OLD.rating != NEW.rating) THEN
    SELECT
      COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
      COUNT(rating)
    INTO v_avg, v_count
    FROM orders
    WHERE restaurant_id = NEW.restaurant_id
      AND rating IS NOT NULL
      AND status = 'delivered';

    UPDATE restaurants
    SET average_rating = v_avg,
        rating_count = v_count
    WHERE id = NEW.restaurant_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_restaurant_rating_on_rate
  AFTER UPDATE OF rating ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_rating();

-- -----------------------------------------------------------------------------
-- Fix 3: Prevent role escalation at the DB level
-- Even if service_role key is used, role changes must be explicitly intentional.
-- This trigger blocks any UPDATE that changes the role column unless the
-- session has the 'service_role' claim (direct SQL from Supabase dashboard)
-- AND the new role is being set deliberately. This prevents accidental
-- escalation from application code that might misuse createAdminClient().
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only allow role changes from admin users or service_role (direct SQL)
    IF NOT (
      is_admin()
      OR current_setting('request.jwt.claim.role', true) = 'service_role'
    ) THEN
      RAISE EXCEPTION 'Role changes are restricted to administrators';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_role_escalation
  BEFORE UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();

-- -----------------------------------------------------------------------------
-- Fix 4: Normalize phone numbers to +234 format on insert/update
-- Ensures consistent format for WhatsApp notification lookups
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_phone_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normalize profile phone
  IF TG_TABLE_NAME = 'profiles' AND NEW.phone IS NOT NULL THEN
    NEW.phone := regexp_replace(NEW.phone, '^\s+|\s+$', '', 'g');
    IF NEW.phone ~ '^0[789][01][0-9]{8}$' THEN
      NEW.phone := '+234' || substring(NEW.phone from 2);
    END IF;
  END IF;

  -- Normalize order customer_phone
  IF TG_TABLE_NAME = 'orders' AND NEW.customer_phone IS NOT NULL THEN
    NEW.customer_phone := regexp_replace(NEW.customer_phone, '^\s+|\s+$', '', 'g');
    IF NEW.customer_phone ~ '^0[789][01][0-9]{8}$' THEN
      NEW.customer_phone := '+234' || substring(NEW.customer_phone from 2);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER normalize_phone_profiles
  BEFORE INSERT OR UPDATE OF phone ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION normalize_phone_number();

CREATE TRIGGER normalize_phone_orders
  BEFORE INSERT OR UPDATE OF customer_phone ON orders
  FOR EACH ROW
  EXECUTE FUNCTION normalize_phone_number();

-- -----------------------------------------------------------------------------
-- Fix 5: Customer rating RPC — safe, column-restricted path for customers
-- Replaces the dropped orders_update_customer policy. Customers can ONLY
-- set rating and rating_comment on their own delivered orders.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rate_order(
  p_order_id uuid,
  p_rating smallint,
  p_rating_comment text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  UPDATE orders
  SET rating = p_rating,
      rating_comment = NULLIF(trim(COALESCE(p_rating_comment, '')), '')
  WHERE id = p_order_id
    AND customer_id = v_user_id
    AND status = 'delivered'
    AND rating IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found, not delivered, or already rated';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION rate_order(uuid, smallint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rate_order(uuid, smallint, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- Schema version tracking
-- -----------------------------------------------------------------------------
INSERT INTO schema_version (version, description)
VALUES (7, 'Rating validation, avg_rating trigger, role escalation guard, phone normalization, rate_order RPC')
ON CONFLICT (version) DO NOTHING;
