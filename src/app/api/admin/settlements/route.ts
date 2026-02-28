/**
 * POST /api/admin/settlements — Generate a settlement for a restaurant + period
 * GET  /api/admin/settlements — List all settlements (filterable by status/restaurant)
 *
 * ── Settlement Calculation ────────────────────────────────────────────────────
 * For each delivered order in the period:
 *   commission_amount = subtotal × commission_rate / 100   (already stored on order)
 *   net_payout        = SUM(subtotal) - SUM(commission_amount)
 *   delivery_fees stay with platform (not paid out to restaurant)
 *
 * ── Business Rules ────────────────────────────────────────────────────────────
 * 1. Only DELIVERED orders qualify — cancelled/awaiting_payment excluded
 * 2. Idempotent: attempting to generate a settlement for a period that already
 *    has one returns 409 with the existing settlement ID
 * 3. Zero-order periods return 422 — nothing to settle
 *
 * ── Security ──────────────────────────────────────────────────────────────────
 * Admin-only endpoint. Uses RLS client (not admin client) — double protection.
 * All generated settlements are written with the admin's user ID for audit trail.
 *
 * INTERN EXPLAINER — Why do we store commission_amount on each order?
 * Because commission_rate can change over time. If we recalculate at settlement
 * time using the current rate, restaurants get the wrong payout for old orders.
 * We snapshot the rate AND the calculated amount at order creation time.
 * Same reason accountants "lock" invoices — the numbers must not drift.
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { createSettlementSchema, markSettlementPaidSchema } from '@/lib/validations';

// ── POST /api/admin/settlements — Generate settlement ─────────────────────────
export async function POST(request: Request) {
  const guard = await requireRole('admin');
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = createSettlementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { restaurant_id, period_start, period_end } = parsed.data;
  const supabase = await createClient();

  // ── Guard: check for existing settlement for this period ──────────────────
  const { data: existing } = await supabase
    .from('settlements')
    .select('id, status, net_payout')
    .eq('restaurant_id', restaurant_id)
    .eq('period_start', period_start)
    .eq('period_end', period_end)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'Settlement already exists for this period', settlement_id: existing.id, status: existing.status },
      { status: 409 }
    );
  }

  // ── Fetch all delivered orders in the period ──────────────────────────────
  // Only delivered orders → restaurant earned the money
  // Cancelled orders → no payout (customer refunded or never charged)
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, subtotal, delivery_fee, commission_amount, total')
    .eq('restaurant_id', restaurant_id)
    .eq('status', 'delivered')
    .gte('delivered_at', `${period_start}T00:00:00.000Z`)
    .lte('delivered_at', `${period_end}T23:59:59.999Z`);

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json(
      { error: 'No delivered orders found in this period — nothing to settle' },
      { status: 422 }
    );
  }

  // ── Calculate settlement totals ────────────────────────────────────────────
  // All amounts in kobo (integer) to avoid floating point errors on money
  const totals = orders.reduce(
    (acc, order) => ({
      order_count:         acc.order_count + 1,
      total_gmv:           acc.total_gmv + order.subtotal,          // food value only
      total_commission:    acc.total_commission + order.commission_amount,
      total_delivery_fees: acc.total_delivery_fees + order.delivery_fee,
    }),
    { order_count: 0, total_gmv: 0, total_commission: 0, total_delivery_fees: 0 }
  );

  // net_payout = what we owe the restaurant
  // = GMV (food revenue) - our commission
  // Delivery fees stay with AbiaEats (we pay riders separately)
  const net_payout = totals.total_gmv - totals.total_commission;

  // ── Insert settlement record ───────────────────────────────────────────────
  const { data: settlement, error: insertError } = await supabase
    .from('settlements')
    .insert({
      restaurant_id,
      period_start,
      period_end,
      order_count:         totals.order_count,
      total_gmv:           totals.total_gmv,
      total_commission:    totals.total_commission,
      total_delivery_fees: totals.total_delivery_fees,
      net_payout,
      status: 'pending',
    })
    .select('id, net_payout, order_count, total_gmv, total_commission, status')
    .single();

  if (insertError || !settlement) {
    return NextResponse.json({ error: insertError?.message ?? 'Insert failed' }, { status: 500 });
  }

  // ── Audit trail ───────────────────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  await supabase.rpc('log_audit', {
    p_action: 'settlement_created',
    p_actor_id: guard.user.id,
    p_target_type: 'settlements',
    p_target_id: settlement.id,
    p_ip_address: ip,
    p_metadata: {
      restaurant_id,
      period_start,
      period_end,
      order_count:      totals.order_count,
      total_gmv:        totals.total_gmv,
      total_commission: totals.total_commission,
      net_payout,
    },
  });

  return NextResponse.json({ ok: true, settlement }, { status: 201 });
}

// ── GET /api/admin/settlements — List settlements ─────────────────────────────
export async function GET(request: Request) {
  const guard = await requireRole('admin');
  if (guard.response) return guard.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');           // 'pending' | 'paid'
  const restaurant_id = searchParams.get('restaurant_id');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'));
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  let query = supabase
    .from('settlements')
    .select(`
      id, period_start, period_end,
      order_count, total_gmv, total_commission, total_delivery_fees, net_payout,
      status, paid_at, payment_reference,
      restaurant:restaurants(id, name, phone)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (restaurant_id) query = query.eq('restaurant_id', restaurant_id);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    settlements: data,
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}
