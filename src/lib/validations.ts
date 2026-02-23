import { z } from 'zod';

// ============================================================================
// Auth Schemas
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, 'Enter a valid Nigerian phone number'),
});

export const phoneOtpSchema = z.object({
  phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, 'Enter a valid Nigerian phone number'),
});

// ============================================================================
// Restaurant Schemas
// ============================================================================

export const createRestaurantSchema = z.object({
  name: z.string().min(2, 'Restaurant name is required'),
  description: z.string().optional(),
  phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, 'Enter a valid phone number'),
  address: z.string().min(5, 'Address is required'),
  city: z.enum(['aba', 'umuahia']),
  cuisine_tags: z.array(z.string()).min(1, 'Select at least one cuisine tag'),
  delivery_fee: z.number().min(0, 'Delivery fee cannot be negative'),
  min_delivery_time: z.number().min(5, 'Minimum 5 minutes'),
  max_delivery_time: z.number().min(10, 'Minimum 10 minutes'),
  commission_rate: z.number().min(0).max(100),
});

export const updateRestaurantSchema = createRestaurantSchema.partial();

// ============================================================================
// Menu Item Schemas
// ============================================================================

export const createMenuItemSchema = z.object({
  restaurant_id: z.string().uuid(),
  name: z.string().min(2, 'Item name is required'),
  description: z.string().optional(),
  price: z.number().min(50, 'Minimum price is ₦50'),
  category: z.string().min(1, 'Category is required'),
  is_available: z.boolean().default(true),
  is_popular: z.boolean().default(false),
  sort_order: z.number().default(0),
});

export const updateMenuItemSchema = createMenuItemSchema.partial().omit({ restaurant_id: true });

// ============================================================================
// Order Schemas
// ============================================================================

export const createOrderSchema = z.object({
  restaurant_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        menu_item_id: z.string().uuid(),
        name: z.string(),
        price: z.number().min(0),
        quantity: z.number().min(1).max(20),
        notes: z.string().optional(),
      })
    )
    .min(1, 'Order must have at least 1 item')
    .max(20, 'Maximum 20 items per order'),
  delivery_address: z.string().min(5, 'Delivery address is required'),
  delivery_landmark: z.string().optional(),
  customer_phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, 'Enter a valid phone number'),
  customer_name: z.string().min(2, 'Name is required'),
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'awaiting_payment',
    'confirmed',
    'preparing',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ]),
  cancellation_reason: z.string().optional(),
});

export const confirmPaymentSchema = z.object({
  order_id: z.string().uuid(),
  payment_reference: z.string().optional(),
});

// ============================================================================
// Settlement Schemas
// ============================================================================

export const createSettlementSchema = z.object({
  restaurant_id: z.string().uuid(),
  period_start: z.string(),
  period_end: z.string(),
});

export const markSettlementPaidSchema = z.object({
  settlement_id: z.string().uuid(),
  payment_reference: z.string().min(1, 'Payment reference is required'),
});

// ============================================================================
// Rating Schema
// ============================================================================

export const rateOrderSchema = z.object({
  rating: z.number().min(1).max(5),
  rating_comment: z.string().optional(),
});

// ============================================================================
// Export types
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type RateOrderInput = z.infer<typeof rateOrderSchema>;
