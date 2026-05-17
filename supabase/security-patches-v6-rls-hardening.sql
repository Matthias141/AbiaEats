-- =============================================================================
-- AbiaEats — Security Patch v6
-- RLS hardening for customer order creation and restaurant owner mutations
-- Date: 2026-05-13
-- =============================================================================
--
-- Fixes:
-- 1. Customers could insert forged orders directly through the Supabase API.
-- 2. Restaurant owners could update payment/status-sensitive order fields.
-- 3. Restaurant owners could directly edit platform-controlled restaurant fields.
-- 4. Public restaurant reads still targeted the raw restaurants table.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: active restaurant check for public menu item reads
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restaurant_is_public(restaurant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = restaurant_uuid
      AND is_active = true
  );
$$;

-- -----------------------------------------------------------------------------
-- Helper: restaurant-owned order check without relying on caller SELECT policies
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owns_order_restaurant(order_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders
    JOIN public.restaurants ON restaurants.id = orders.restaurant_id
    WHERE orders.id = order_uuid
      AND restaurants.owner_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Secure customer order creation RPC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_restaurant_id uuid,
  p_items jsonb,
  p_delivery_address text,
  p_delivery_landmark text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_notes text DEFAULT NULL
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
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
  FROM public.restaurants
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
    FROM public.menu_items
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

  INSERT INTO public.orders (
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
    payment_method
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
    'opay_transfer'
  )
  RETURNING id, orders.order_number, orders.total
  INTO v_order_id, v_order_number, v_total;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order_items)
  LOOP
    INSERT INTO public.order_items (
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

  INSERT INTO public.audit_log (action, actor_id, target_type, target_id, metadata)
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
      'item_count', jsonb_array_length(v_order_items)
    )
  );

  RETURN QUERY SELECT v_order_id, v_order_number, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_secure(uuid, jsonb, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_secure(uuid, jsonb, text, text, text, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- Narrow owner-controlled restaurant status toggle
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_restaurant_open_status(
  p_restaurant_id uuid,
  p_is_open boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_open boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = p_restaurant_id
      AND (owner_id = v_user_id OR is_admin())
  ) THEN
    RAISE EXCEPTION 'Restaurant not found or not yours';
  END IF;

  UPDATE public.restaurants
  SET is_open = p_is_open
  WHERE id = p_restaurant_id
  RETURNING is_open INTO v_is_open;

  INSERT INTO public.audit_log (action, actor_id, target_type, target_id, metadata)
  VALUES (
    'restaurant_open_status_updated',
    v_user_id,
    'restaurants',
    p_restaurant_id::text,
    jsonb_build_object('is_open', v_is_open)
  );

  RETURN v_is_open;
END;
$$;

REVOKE ALL ON FUNCTION public.set_restaurant_open_status(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_restaurant_open_status(uuid, boolean) TO authenticated;

-- -----------------------------------------------------------------------------
-- Safe read views
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.restaurants_public AS
SELECT
  id, name, slug, description, phone, address, city,
  image_url, cover_image_url, cuisine_tags,
  delivery_fee, min_delivery_time, max_delivery_time,
  is_open, is_active, total_orders, average_rating, rating_count,
  created_at
FROM public.restaurants
WHERE is_active = true;

GRANT SELECT ON public.restaurants_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.orders_for_restaurants AS
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
  CASE
    WHEN o.status IN ('confirmed', 'preparing', 'out_for_delivery')
    THEN o.customer_phone
    ELSE NULL
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
FROM public.orders o
WHERE is_admin()
  OR EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = o.restaurant_id
      AND r.owner_id = auth.uid()
  );

GRANT SELECT ON public.orders_for_restaurants TO authenticated;

-- -----------------------------------------------------------------------------
-- Replace broad RLS policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "restaurants_select_public" ON public.restaurants;
DROP POLICY IF EXISTS "restaurants_select_public_limited" ON public.restaurants;
DROP POLICY IF EXISTS "restaurants_select_owner_banking" ON public.restaurants;
DROP POLICY IF EXISTS "restaurants_update_owner" ON public.restaurants;
DROP POLICY IF EXISTS "restaurants_select_owner" ON public.restaurants;

CREATE POLICY "restaurants_select_owner"
  ON public.restaurants FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "orders_select_restaurant" ON public.orders;
DROP POLICY IF EXISTS "orders_select_restaurant_via_view" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_customer" ON public.orders;
DROP POLICY IF EXISTS "orders_update_restaurant" ON public.orders;
DROP POLICY IF EXISTS "orders_update_customer" ON public.orders;
DROP POLICY IF EXISTS "orders_rate_delivered" ON public.orders;

DROP POLICY IF EXISTS "order_items_insert_customer" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_restaurant" ON public.order_items;
DROP POLICY IF EXISTS "menu_items_select_public" ON public.menu_items;

CREATE POLICY "menu_items_select_public"
  ON public.menu_items FOR SELECT
  USING (is_available = true AND restaurant_is_public(restaurant_id));

CREATE POLICY "order_items_select_restaurant"
  ON public.order_items FOR SELECT
  USING (owns_order_restaurant(order_id));

CREATE TABLE IF NOT EXISTS public.schema_version (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL
);

INSERT INTO public.schema_version (version, description)
VALUES (6, 'RLS hardening: secure order creation RPC and narrow restaurant owner mutations')
ON CONFLICT (version) DO NOTHING;
