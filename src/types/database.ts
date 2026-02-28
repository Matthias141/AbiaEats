// ============================================================================
// AbiaEats Database Types
// Auto-generated types matching supabase/schema.sql
// ============================================================================

export type UserRole = 'customer' | 'restaurant_owner' | 'rider' | 'admin';

export type OrderStatus =
  | 'awaiting_payment'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type SettlementStatus = 'pending' | 'paid';

// ============================================================================
// Core Tables
// ============================================================================

export interface Profile {
  id: string; // UUID, references auth.users
  email: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  default_address: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string; // UUID
  owner_id: string; // UUID, references profiles
  name: string;
  slug: string;
  description: string | null;
  phone: string;
  address: string;
  city: 'aba' | 'umuahia';
  image_url: string | null;
  cover_image_url: string | null;
  cuisine_tags: string[];
  delivery_fee: number; // Whole Naira
  min_delivery_time: number; // Minutes
  max_delivery_time: number; // Minutes
  commission_rate: number; // Percentage (e.g., 6, 10, 13)
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  is_open: boolean;
  is_active: boolean;
  total_orders: number;
  total_revenue: number;
  average_rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string; // UUID
  restaurant_id: string; // UUID, references restaurants
  name: string;
  description: string | null;
  price: number; // Whole Naira
  image_url: string | null;
  category: string;
  is_available: boolean;
  is_popular: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Rider {
  id: string; // UUID
  restaurant_id: string; // UUID, references restaurants
  profile_id: string | null; // UUID, references profiles
  name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string; // UUID
  order_number: string; // ABIA-YYYYMMDD-NNN
  customer_id: string; // UUID, references profiles
  restaurant_id: string; // UUID, references restaurants
  rider_id: string | null; // UUID, references riders
  status: OrderStatus;
  subtotal: number; // Whole Naira
  delivery_fee: number;
  commission_rate: number;
  commission_amount: number; // Calculated by DB trigger
  total: number; // Calculated by DB trigger
  delivery_address: string;
  delivery_landmark: string | null;
  customer_phone: string;
  customer_name: string;
  payment_method: 'opay_transfer' | 'paystack';
  payment_reference: string | null;
  payment_confirmed_by: string | null; // UUID, references profiles (admin)
  payment_confirmed_at: string | null;
  notes: string | null;
  rating: number | null; // 1-5
  rating_comment: string | null;
  confirmed_at: string | null;
  preparing_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string; // UUID
  order_id: string; // UUID, references orders
  menu_item_id: string; // UUID, references menu_items
  name: string; // Snapshot at order time
  price: number; // Snapshot at order time
  quantity: number;
  subtotal: number; // price * quantity
  notes: string | null;
  created_at: string;
}

export interface Settlement {
  id: string; // UUID
  restaurant_id: string; // UUID, references restaurants
  period_start: string; // Date
  period_end: string; // Date
  order_count: number;
  total_gmv: number; // Gross Merchandise Value
  total_commission: number;
  total_delivery_fees: number;
  net_payout: number;
  status: SettlementStatus;
  paid_at: string | null;
  payment_reference: string | null;
  paid_by: string | null; // UUID, references profiles (admin)
  created_at: string;
  updated_at: string;
}


export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface RestaurantApplication {
  id: string;
  applicant_id: string;
  name: string;
  description: string | null;
  phone: string;
  address: string;
  city: 'aba' | 'umuahia';
  cuisine_tags: string[];
  delivery_fee: number;
  min_delivery_time: number;
  max_delivery_time: number;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  status: ApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  restaurant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string; // UUID
  action: string;
  actor_id: string | null; // UUID, references profiles
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>; // JSONB — exception to no-any rule
  ip_address: string | null;
  created_at: string;
}

// ============================================================================
// Composite Types (for queries with joins)
// ============================================================================

export interface OrderWithDetails extends Order {
  order_items: OrderItem[];
  restaurants: Pick<Restaurant, 'name' | 'phone' | 'image_url' | 'address'>;
}

export interface OrderWithCustomer extends Order {
  profiles: Pick<Profile, 'full_name' | 'email' | 'phone'>;
  restaurants: Pick<Restaurant, 'name'>;
  order_items: OrderItem[];
}

export interface RestaurantWithMenu extends Restaurant {
  menu_items: MenuItem[];
}

export interface SettlementWithRestaurant extends Settlement {
  restaurants: Pick<Restaurant, 'name' | 'bank_name' | 'bank_account_number' | 'bank_account_name'>;
}

// ============================================================================
// Insert Types (for creating new records)
// ============================================================================

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;
export type RestaurantInsert = Omit<Restaurant, 'id' | 'slug' | 'total_orders' | 'total_revenue' | 'average_rating' | 'rating_count' | 'created_at' | 'updated_at'>;
export type MenuItemInsert = Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>;
export type OrderInsert = Omit<Order, 'id' | 'order_number' | 'commission_amount' | 'total' | 'confirmed_at' | 'preparing_at' | 'out_for_delivery_at' | 'delivered_at' | 'cancelled_at' | 'created_at' | 'updated_at'>;
export type OrderItemInsert = Omit<OrderItem, 'id' | 'created_at'>;

// ============================================================================
// Cart Types (client-side only)
// ============================================================================

export interface CartItem {
  menu_item_id: string;
  restaurant_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

export interface Cart {
  restaurant_id: string | null;
  restaurant_name: string | null;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
}
