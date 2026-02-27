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

interface CreateOrderResult {
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

  // ── STEP 3: Re-fetch authoritative prices from DB ─────────────────────────
  // This is the core security fix. Client prices are DISCARDED.
  const menuItemIds = input.items.map(i => i.menu_item_id);

  const { data: dbItems, error: itemsError } = await supabase
    .from('menu_items')
    .select('id, price, is_available, restaurant_id, name')
    .in('id', menuItemIds);

  if (itemsError || !dbItems || dbItems.length === 0) {
    return { success: false, error: 'Could not verify menu items. Please try again.' };
  }

  // ── STEP 4: Validate every item belongs to the stated restaurant ──────────
  for (const item of input.items) {
    const dbItem = dbItems.find(d => d.id === item.menu_item_id);

    if (!dbItem) {
      return { success: false, error: `Item "${item.name}" no longer exists` };
    }
    if (!dbItem.is_available) {
      return { success: false, error: `"${dbItem.name}" is currently unavailable` };
    }
    if (dbItem.restaurant_id !== input.restaurant_id) {
      // This should never happen via UI — catches Postman attacks
      return { success: false, error: 'Cart contains items from multiple restaurants' };
    }
  }

  // ── STEP 5: Calculate subtotal from DB prices ─────────────────────────────
  // The client's price field is NEVER used. Only DB prices count.
  const subtotal = input.items.reduce((sum, item) => {
    const dbItem = dbItems.find(d => d.id === item.menu_item_id)!;
    return sum + dbItem.price * item.quantity;
  }, 0);

  // ── STEP 6: Fetch authoritative delivery fee + commission rate ────────────
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('delivery_fee, commission_rate, is_active, is_open')
    .eq('id', input.restaurant_id)
    .single();

  if (restaurantError || !restaurant) {
    return { success: false, error: 'Restaurant not found' };
  }
  if (!restaurant.is_active || !restaurant.is_open) {
    return { success: false, error: 'This restaurant is currently closed' };
  }

  // ── STEP 7: Insert the order with DB-verified values ─────────────────────
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: user.id,
      restaurant_id: input.restaurant_id,
      subtotal,                               // ← DB-calculated, not client
      delivery_fee: restaurant.delivery_fee,  // ← DB-authoritative
      commission_rate: restaurant.commission_rate, // ← DB-authoritative
      delivery_address: input.delivery_address,
      delivery_landmark: input.delivery_landmark ?? null,
      customer_phone: input.customer_phone,
      customer_name: input.customer_name,
      notes: input.notes ?? null,
      payment_method: 'opay_transfer',
    })
    .select('id, order_number, total')
    .single();

  if (orderError || !order) {
    return { success: false, error: 'Failed to place order. Please try again.' };
  }

  // ── STEP 8: Insert order items with DB prices (snapshot) ─────────────────
  const orderItems = input.items.map(item => {
    const dbItem = dbItems.find(d => d.id === item.menu_item_id)!;
    return {
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      name: dbItem.name,          // use DB name, not client name
      price: dbItem.price,        // DB price — the snapshot that matters legally
      quantity: item.quantity,
      subtotal: dbItem.price * item.quantity,
      notes: item.notes ?? null,
    };
  });

  const { error: itemsInsertError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsInsertError) {
    // Order was created but items failed — this needs cleanup
    // In production: add a cleanup trigger or transaction rollback
    await supabase.from('orders').delete().eq('id', order.id);
    return { success: false, error: 'Failed to save order items. Please try again.' };
  }

  // ── STEP 9: Log the order creation to audit trail ─────────────────────────
  await supabase.rpc('log_audit', {
    p_action: 'order_created',
    p_actor_id: user.id,
    p_target_type: 'orders',
    p_target_id: order.id,
    p_metadata: {
      order_number: order.order_number,
      restaurant_id: input.restaurant_id,
      subtotal,
      total: order.total,
      item_count: input.items.length,
    },
  });

  return {
    success: true,
    order_id: order.id,
    order_number: order.order_number,
    total: order.total,
  };
}