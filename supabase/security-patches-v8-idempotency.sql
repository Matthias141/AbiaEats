-- =============================================================================
-- AbiaEats — Security Patch v8
-- Server-side order creation idempotency
-- Date: 2026-08-01
-- =============================================================================
--
-- Problem: A network retry or browser double-submit can create duplicate orders.
-- The client-side useRef guard helps but doesn't cover true network retries
-- (e.g., browser auto-retrying a timed-out POST).
--
-- Fix: Add idempotency_key column with UNIQUE constraint. The client generates
-- a UUID before submitting; if the same key is sent twice, the DB rejects the
-- duplicate INSERT. The RPC returns the existing order instead of creating a new one.
-- =============================================================================

-- Step 1: Add column (nullable for backwards compatibility with existing orders)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key uuid UNIQUE;

CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Step 2: Update create_order_secure to accept and enforce the key
CREATE OR REPLACE FUNCTION create_order_secure(
  p_restaurant_id uuid,
  p_items jsonb,
  p_delivery_address text,
  p_delivery_landmark text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL
)
RETURNS TABLE(order_id uuid, order_number text, total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_restaurant record;
  v_item jsonb;
  v_item_id uuid;
  v_quantity integer;
  v_item_notes text;
  v_db_item record;
  v_subtotal integer := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_order_id uuid;
  v_order_number text;
  v_total integer;
  v_existing record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Idempotency check: if this key was already used, return the existing order
  IF p_idempotency_key IS NOT NULL THEN
    SELECT o.id, o.order_number, o.total
    INTO v_existing
    FROM orders o
    WHERE o.idempotency_key = p_idempotency_key
      AND o.customer_id = v_user_id;

    IF FOUND THEN
      RETURN QUERY SELECT v_existing.id, v_existing.order_number, v_existing.total;
      RETURN;
    END IF;
  END IF;

  IF p_delivery_address IS NULL OR length(trim(p_delivery_address)) < 5 THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF p_customer_phone IS NULL OR p_customer_phone !~ '^(\+234|0)[789][01][0-9]{8}$' THEN
    RAISE EXCEPTION 'Valid customer phone is required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Order items must be an array';
  END IF;

  IF jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 20 THEN
    RAISE EXCEPTION 'Order must contain between 1 and 20 items';
  END IF;

  SELECT delivery_fee, commission_rate, is_active, is_open
  INTO v_restaurant
  FROM restaurants
  WHERE id = p_restaurant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Restaurant not found';
  END IF;

  IF NOT v_restaurant.is_active OR NOT v_restaurant.is_open THEN
    RAISE EXCEPTION 'This restaurant is currently closed';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item ->> 'menu_item_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    v_item_notes := NULLIF(v_item ->> 'notes', '');

    IF v_quantity < 1 OR v_quantity > 20 THEN
      RAISE EXCEPTION 'Invalid item quantity';
    END IF;

    SELECT id, price, is_available, restaurant_id, name
    INTO v_db_item
    FROM menu_items
    WHERE id = v_item_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item no longer exists';
    END IF;

    IF NOT v_db_item.is_available THEN
      RAISE EXCEPTION 'Menu item is currently unavailable';
    END IF;

    IF v_db_item.restaurant_id <> p_restaurant_id THEN
      RAISE EXCEPTION 'Cart contains items from multiple restaurants';
    END IF;

    v_subtotal := v_subtotal + (v_db_item.price * v_quantity);
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_db_item.id,
      'name', v_db_item.name,
      'price', v_db_item.price,
      'quantity', v_quantity,
      'subtotal', v_db_item.price * v_quantity,
      'notes', v_item_notes
    ));
  END LOOP;

  INSERT INTO orders (
    customer_id,
    restaurant_id,
    subtotal,
    delivery_fee,
    commission_rate,
    delivery_address,
    delivery_landmark,
    customer_phone,
    customer_name,
    notes,
    payment_method,
    idempotency_key
  )
  VALUES (
    v_user_id,
    p_restaurant_id,
    v_subtotal,
    v_restaurant.delivery_fee,
    v_restaurant.commission_rate,
    trim(p_delivery_address),
    NULLIF(trim(COALESCE(p_delivery_landmark, '')), ''),
    p_customer_phone,
    trim(p_customer_name),
    NULLIF(trim(COALESCE(p_notes, '')), ''),
    'opay_transfer',
    p_idempotency_key
  )
  RETURNING id, orders.order_number, orders.total
  INTO v_order_id, v_order_number, v_total;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order_items)
  LOOP
    INSERT INTO order_items (
      order_id,
      menu_item_id,
      name,
      price,
      quantity,
      subtotal,
      notes
    )
    VALUES (
      v_order_id,
      (v_item ->> 'menu_item_id')::uuid,
      v_item ->> 'name',
      (v_item ->> 'price')::integer,
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'subtotal')::integer,
      NULLIF(v_item ->> 'notes', '')
    );
  END LOOP;

  INSERT INTO audit_log (action, actor_id, target_type, target_id, metadata)
  VALUES (
    'order_created',
    v_user_id,
    'orders',
    v_order_id::text,
    jsonb_build_object(
      'order_number', v_order_number,
      'restaurant_id', p_restaurant_id,
      'subtotal', v_subtotal,
      'total', v_total,
      'item_count', jsonb_array_length(v_order_items),
      'idempotency_key', p_idempotency_key
    )
  );

  RETURN QUERY SELECT v_order_id, v_order_number, v_total;
END;
$$;

-- Update grants for the new function signature (8 params now)
REVOKE ALL ON FUNCTION create_order_secure(uuid, jsonb, text, text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_order_secure(uuid, jsonb, text, text, text, text, text, uuid) TO authenticated;

-- Schema version
INSERT INTO schema_version (version, description)
VALUES (8, 'Server-side order idempotency via idempotency_key column + UNIQUE constraint')
ON CONFLICT (version) DO NOTHING;
