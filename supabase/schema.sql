-- ============================================================================
-- AbiaEats Database Schema
-- Complete PostgreSQL schema for Supabase
-- Run this entire file in the Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CUSTOM ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('customer', 'restaurant_owner', 'rider', 'admin');
CREATE TYPE order_status AS ENUM ('awaiting_payment', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');
CREATE TYPE payment_method AS ENUM ('opay_transfer', 'paystack');
CREATE TYPE settlement_status AS ENUM ('pending', 'paid');
CREATE TYPE city_enum AS ENUM ('aba', 'umuahia');

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- --------------------------------------------------------------------------
-- profiles: extends auth.users with app-specific data
-- --------------------------------------------------------------------------
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        user_role NOT NULL DEFAULT 'customer',
  full_name   text,
  phone       text,
  default_address text,
  avatar_url  text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'Extends Supabase auth.users with role, contact info, and app preferences';

-- --------------------------------------------------------------------------
-- restaurants: restaurant profiles with delivery and commission settings
-- --------------------------------------------------------------------------
CREATE TABLE restaurants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                text NOT NULL,
  slug                text NOT NULL UNIQUE,
  description         text,
  phone               text NOT NULL,
  address             text NOT NULL,
  city                city_enum NOT NULL,
  image_url           text,
  cover_image_url     text,
  cuisine_tags        text[] NOT NULL DEFAULT '{}',
  delivery_fee        integer NOT NULL DEFAULT 0,
  min_delivery_time   integer NOT NULL DEFAULT 30,
  max_delivery_time   integer NOT NULL DEFAULT 60,
  commission_rate     numeric(5,2) NOT NULL DEFAULT 6.00,
  bank_name           text,
  bank_account_number text,
  bank_account_name   text,
  is_open             boolean NOT NULL DEFAULT true,
  is_active           boolean NOT NULL DEFAULT true,
  total_orders        integer NOT NULL DEFAULT 0,
  total_revenue       integer NOT NULL DEFAULT 0,
  average_rating      numeric(3,2) NOT NULL DEFAULT 0,
  rating_count        integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE restaurants IS 'Restaurant listings with delivery config, commission tiers, and aggregate stats';

-- --------------------------------------------------------------------------
-- menu_items: food/drink items belonging to a restaurant
-- --------------------------------------------------------------------------
CREATE TABLE menu_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  price           integer NOT NULL CHECK (price >= 0),
  image_url       text,
  category        text NOT NULL,
  is_available    boolean NOT NULL DEFAULT true,
  is_popular      boolean NOT NULL DEFAULT false,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE menu_items IS 'Individual food/drink items with pricing and availability';

-- --------------------------------------------------------------------------
-- riders: delivery riders attached to restaurants
-- --------------------------------------------------------------------------
CREATE TABLE riders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  profile_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name            text NOT NULL,
  phone           text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE riders IS 'Restaurant-employed delivery riders (Phase 1: no standalone rider app)';

-- --------------------------------------------------------------------------
-- orders: core order table with full lifecycle tracking
-- --------------------------------------------------------------------------
CREATE TABLE orders (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number            text UNIQUE,
  customer_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id           uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rider_id                uuid REFERENCES riders(id) ON DELETE SET NULL,
  status                  order_status NOT NULL DEFAULT 'awaiting_payment',
  subtotal                integer NOT NULL CHECK (subtotal >= 0),
  delivery_fee            integer NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  commission_rate         numeric(5,2) NOT NULL,
  commission_amount       integer NOT NULL DEFAULT 0,
  total                   integer NOT NULL DEFAULT 0,
  delivery_address        text NOT NULL,
  delivery_landmark       text,
  customer_phone          text NOT NULL,
  customer_name           text NOT NULL,
  payment_method          payment_method NOT NULL DEFAULT 'opay_transfer',
  payment_reference       text,
  payment_confirmed_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  payment_confirmed_at    timestamptz,
  notes                   text,
  rating                  smallint CHECK (rating >= 1 AND rating <= 5),
  rating_comment          text,
  confirmed_at            timestamptz,
  preparing_at            timestamptz,
  out_for_delivery_at     timestamptz,
  delivered_at            timestamptz,
  cancelled_at            timestamptz,
  cancellation_reason     text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE orders IS 'Core order table tracking full lifecycle from payment to delivery';

-- --------------------------------------------------------------------------
-- order_items: individual line items within an order (snapshot at order time)
-- --------------------------------------------------------------------------
CREATE TABLE order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    uuid NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  name            text NOT NULL,
  price           integer NOT NULL CHECK (price >= 0),
  quantity        integer NOT NULL CHECK (quantity >= 1),
  subtotal        integer NOT NULL CHECK (subtotal >= 0),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE order_items IS 'Snapshotted line items for each order (prices frozen at order time)';

-- --------------------------------------------------------------------------
-- settlements: weekly commission settlement records per restaurant
-- --------------------------------------------------------------------------
CREATE TABLE settlements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  period_start        date NOT NULL,
  period_end          date NOT NULL,
  order_count         integer NOT NULL DEFAULT 0,
  total_gmv           integer NOT NULL DEFAULT 0,
  total_commission    integer NOT NULL DEFAULT 0,
  total_delivery_fees integer NOT NULL DEFAULT 0,
  net_payout          integer NOT NULL DEFAULT 0,
  status              settlement_status NOT NULL DEFAULT 'pending',
  paid_at             timestamptz,
  payment_reference   text,
  paid_by             uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE settlements IS 'Weekly commission settlement ledger per restaurant';

-- --------------------------------------------------------------------------
-- audit_log: immutable log of all critical actions
-- --------------------------------------------------------------------------
CREATE TABLE audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action        text NOT NULL,
  actor_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_type   text,
  target_id     text,
  metadata      jsonb NOT NULL DEFAULT '{}',
  ip_address    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_log IS 'Immutable audit trail for payment confirmations, settlements, and admin actions';

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- restaurants
CREATE INDEX idx_restaurants_owner_id ON restaurants(owner_id);
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_restaurants_is_active ON restaurants(is_active);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);

-- menu_items
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_is_available ON menu_items(is_available);

-- riders
CREATE INDEX idx_riders_restaurant_id ON riders(restaurant_id);

-- orders
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- order_items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);

-- settlements
CREATE INDEX idx_settlements_restaurant_id ON settlements(restaurant_id);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_settlements_period ON settlements(period_start, period_end);

-- audit_log
CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- --------------------------------------------------------------------------
-- get_user_role: returns the role of the currently authenticated user
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- --------------------------------------------------------------------------
-- is_admin: convenience check for admin role
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- --------------------------------------------------------------------------
-- owns_restaurant: check if user owns a given restaurant
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION owns_restaurant(restaurant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurants WHERE id = restaurant_uuid AND owner_id = auth.uid()
  );
$$;

-- --------------------------------------------------------------------------
-- log_audit: SECURITY DEFINER function for inserting audit records
-- Called from application code; bypasses RLS on audit_log
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

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- --------------------------------------------------------------------------
-- Trigger 1: on_auth_user_created
-- Auto-creates a profile row when a new user signs up via Supabase Auth
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, role, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    'customer',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NULL)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- --------------------------------------------------------------------------
-- Trigger 2: set_order_number
-- Generates ABIA-YYYYMMDD-NNN format order numbers on INSERT
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_str text;
  v_count integer;
  v_order_number text;
BEGIN
  v_date_str := to_char(now() AT TIME ZONE 'Africa/Lagos', 'YYYYMMDD');

  -- Count orders created today (WAT timezone) and increment
  SELECT COUNT(*) + 1 INTO v_count
  FROM orders
  WHERE order_number LIKE 'ABIA-' || v_date_str || '-%';

  v_order_number := 'ABIA-' || v_date_str || '-' || lpad(v_count::text, 3, '0');

  NEW.order_number := v_order_number;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- --------------------------------------------------------------------------
-- Trigger 3: validate_order_transition
-- Enforces valid status transitions; rejects invalid ones
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only validate if status is actually changing
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Terminal states: delivered and cancelled cannot transition to anything
  IF OLD.status = 'delivered' THEN
    RAISE EXCEPTION 'Cannot change status of a delivered order (order: %)', OLD.order_number;
  END IF;

  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot change status of a cancelled order (order: %)', OLD.order_number;
  END IF;

  -- Valid forward transitions + cancellation from any active state
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

CREATE TRIGGER validate_order_transition
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_status_transition();

-- --------------------------------------------------------------------------
-- Trigger 4: handle_order_status_change
-- Sets timestamp fields when status changes
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_order_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act if status actually changed
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
      -- awaiting_payment has no separate timestamp (it uses created_at)
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER handle_order_status_change
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_status_timestamps();

-- --------------------------------------------------------------------------
-- Trigger 5: calculate_order_amounts
-- On INSERT, calculates commission_amount and total from subtotal,
-- delivery_fee, and commission_rate. Never trust client-side calculations.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_order_amounts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.commission_amount := ROUND(NEW.subtotal * NEW.commission_rate / 100);
  NEW.total := NEW.subtotal + NEW.delivery_fee;
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_order_amounts
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_amounts();

-- --------------------------------------------------------------------------
-- Trigger 6: update_restaurant_stats
-- When order status changes to 'delivered', increment restaurant stats
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_restaurant_stats_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act when status changes to delivered
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

CREATE TRIGGER update_restaurant_stats
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_stats_on_delivery();

-- --------------------------------------------------------------------------
-- Trigger 7: update_updated_at
-- Generic trigger to auto-set updated_at on all tables that have it
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_updated_at BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_updated_at BEFORE UPDATE ON riders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_updated_at BEFORE UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- profiles RLS (4 policies)
-- --------------------------------------------------------------------------

-- 1. Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- 2. Users can update their own profile (but cannot change their role)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- 3. Admins can read all profiles
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (is_admin());

-- 4. Admins can update all profiles
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (is_admin());

-- --------------------------------------------------------------------------
-- restaurants RLS (3 policies)
-- --------------------------------------------------------------------------

-- 5. Anyone (including anonymous) can read active restaurants
CREATE POLICY "restaurants_select_public"
  ON restaurants FOR SELECT
  USING (is_active = true);

-- 6. Restaurant owners can update their own restaurant
CREATE POLICY "restaurants_update_owner"
  ON restaurants FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 7. Admins have full access to all restaurants (select, insert, update, delete)
CREATE POLICY "restaurants_all_admin"
  ON restaurants FOR ALL
  USING (is_admin());

-- --------------------------------------------------------------------------
-- menu_items RLS (3 policies)
-- --------------------------------------------------------------------------

-- 8. Public can read available items at active restaurants
CREATE POLICY "menu_items_select_public"
  ON menu_items FOR SELECT
  USING (
    is_available = true
    AND EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = menu_items.restaurant_id
        AND restaurants.is_active = true
    )
  );

-- 9. Restaurant owners can manage their own menu items (select, insert, update, delete)
CREATE POLICY "menu_items_all_owner"
  ON menu_items FOR ALL
  USING (owns_restaurant(restaurant_id));

-- 10. Admins have full access to all menu items
CREATE POLICY "menu_items_all_admin"
  ON menu_items FOR ALL
  USING (is_admin());

-- --------------------------------------------------------------------------
-- riders RLS (2 policies)
-- --------------------------------------------------------------------------

-- 11. Restaurant owners can see riders belonging to their restaurants
CREATE POLICY "riders_select_owner"
  ON riders FOR SELECT
  USING (owns_restaurant(restaurant_id));

-- 12. Admins have full access to all riders
CREATE POLICY "riders_all_admin"
  ON riders FOR ALL
  USING (is_admin());

-- --------------------------------------------------------------------------
-- orders RLS (3 policies)
-- --------------------------------------------------------------------------

-- 13. Customers can see their own orders
CREATE POLICY "orders_select_customer"
  ON orders FOR SELECT
  USING (customer_id = auth.uid());

-- 14. Restaurant owners can see orders for their restaurants
CREATE POLICY "orders_select_restaurant"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = orders.restaurant_id
        AND restaurants.owner_id = auth.uid()
    )
  );

-- 15. Admins have full access to all orders
CREATE POLICY "orders_all_admin"
  ON orders FOR ALL
  USING (is_admin());

-- Allow customers to insert their own orders
CREATE POLICY "orders_insert_customer"
  ON orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Allow restaurant owners to update orders for their restaurants
CREATE POLICY "orders_update_restaurant"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = orders.restaurant_id
        AND restaurants.owner_id = auth.uid()
    )
  );

-- Allow customers to update their own orders (e.g., add rating)
CREATE POLICY "orders_update_customer"
  ON orders FOR UPDATE
  USING (customer_id = auth.uid());

-- --------------------------------------------------------------------------
-- order_items RLS (follows parent order access)
-- --------------------------------------------------------------------------

-- 16. Access mirrors the parent order: customers see their order items
CREATE POLICY "order_items_select_customer"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- Restaurant owners see order items for their restaurant's orders
CREATE POLICY "order_items_select_restaurant"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN restaurants ON restaurants.id = orders.restaurant_id
      WHERE orders.id = order_items.order_id
        AND restaurants.owner_id = auth.uid()
    )
  );

-- Admins have full access to all order items
CREATE POLICY "order_items_all_admin"
  ON order_items FOR ALL
  USING (is_admin());

-- Customers can insert order items for their own orders
CREATE POLICY "order_items_insert_customer"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- settlements RLS (2 policies)
-- --------------------------------------------------------------------------

-- Restaurants can see their own settlement records
CREATE POLICY "settlements_select_restaurant"
  ON settlements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = settlements.restaurant_id
        AND restaurants.owner_id = auth.uid()
    )
  );

-- Admins have full access to all settlements
CREATE POLICY "settlements_all_admin"
  ON settlements FOR ALL
  USING (is_admin());

-- --------------------------------------------------------------------------
-- audit_log RLS (1 policy + inserts via SECURITY DEFINER function)
-- --------------------------------------------------------------------------

-- Only admins can read audit logs; inserts go through log_audit() function
CREATE POLICY "audit_log_select_admin"
  ON audit_log FOR SELECT
  USING (is_admin());

-- ============================================================================
-- 7. ENABLE REALTIME
-- ============================================================================

-- Enable Supabase Realtime on tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- ============================================================================
-- 8. INITIAL SEED NOTE
-- ============================================================================
-- To create your first admin user:
-- 1. Sign up normally through the app (creates a 'customer' profile)
-- 2. Run this SQL in the Supabase SQL Editor:
--
--    UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
--
-- NEVER build an admin signup page. This is an intentional security constraint.
-- ============================================================================
