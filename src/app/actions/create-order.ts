/**
 * FIX: CRIT-1 — Client-side price injection vulnerability.
 *
 * WHAT WAS BROKEN:
 * The old flow sent cart prices (stored in localStorage) directly to Supabase
 * via the anon key. An attacker with Postman could send { subtotal: 1 } and
 * get ₦50,000 of food for ₦1.
 *
 * HOW THIS FIXES IT:
 * This Server Action runs on the SERVER — the user's browser never executes
 * this code. We re-fetch every price from the database ourselves. The client
 * sends us WHAT the customer wants (item IDs, quantities, delivery address).
 * We decide HOW MUCH it costs by looking it up in our own DB.
 *
 * INTERN EXPLAINER — "Why can't I trust the browser?"
 * Your browser is like a phone call from a stranger. They can say anything.
 * "I paid ₦50,000" — did they? You have to check your own records.
 * The server is YOUR building. Only YOUR code runs there. Trust it.
 * Never trust what arrived through the network.
 *
 * HOW TO CALL THIS from a checkout page:
 *   import { createOrderAction } from '@/app/actions/create-order';
 *   const result = await createOrderAction(cartData);
 */
'use server';

import { createClient } from '@/lib/supabase/server';
import { createOrderSchema } from '@/lib/validations';

interface CreateOrderInput {
  restaurant_id: string;
  items: {
    menu_item_id: string;
    name: string;
    quantity: number;
    notes?: string;
  }[];
  delivery_address: string;
  delivery_landmark?: string;
  customer_phone: string;
  customer_name: string;
  notes?: string;
}

type CreateOrderResult = {
  success: true;
  order_id: string;
  order_number: string;
  total: number;
} | {
  success: false;
  error: string;
}

export async function createOrderAction(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const supabase = await createClient();

  // ── STEP 1: Verify the caller is authenticated ────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return { success: false, error: 'You must be logged in to place an order' };
  }

  // ── STEP 2: Validate the shape of the request with Zod ───────────────────
  // Note: we validate shape only — prices come from DB, not from this input
  const parsed = createOrderSchema.safeParse({
    ...input,
    // Add placeholder prices — they'll be overwritten by DB values below
    items: input.items.map(i => ({ ...i, price: 0 })),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // ── STEP 3: Create order via hardened DB RPC ──────────────────────────────
  // The RPC runs in one DB transaction, refetches authoritative menu prices,
  // and is the only path allowed to insert customer orders through RLS.
  const { data, error } = await supabase.rpc('create_order_secure', {
    p_restaurant_id: parsed.data.restaurant_id,
    p_items: parsed.data.items.map((item) => ({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      notes: item.notes ?? null,
    })),
    p_delivery_address: parsed.data.delivery_address,
    p_delivery_landmark: parsed.data.delivery_landmark ?? null,
    p_customer_phone: parsed.data.customer_phone,
    p_customer_name: parsed.data.customer_name,
    p_notes: parsed.data.notes ?? null,
  });

  const order = Array.isArray(data) ? data[0] : data;

  if (error || !order) {
    console.error('[create-order] RPC error:', error?.code, error?.message);
    // RPC exceptions are our own user-friendly messages (e.g. "Menu item no longer exists").
    // Generic Supabase errors get a safe fallback.
    const isCustomException = error?.code === 'P0001';
    return {
      success: false,
      error: isCustomException
        ? (error.message ?? 'Failed to place order.')
        : 'Failed to place order. Please try again.',
    };
  }

  return {
    success: true,
    order_id: order.order_id,
    order_number: order.order_number,
    total: order.total,
  };
}
