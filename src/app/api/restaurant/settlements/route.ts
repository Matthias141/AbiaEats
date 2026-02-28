/**
 * GET /api/restaurant/settlements — Restaurant's own settlement history
 *
 * Restaurants see ONLY their own settlements (enforced by RLS + this route's
 * object-level auth check). They cannot see other restaurants' payouts.
 *
 * Response format is slightly different from admin view:
 * - No paid_by field (internal admin info)
 * - Shows pending settlements to set expectations on upcoming payout
 *
 * INTERN EXPLAINER — Why not just use RLS alone?
 * RLS enforces "restaurant can only see their own rows" at the DB level.
 * But we also need to restrict which RESTAURANT this authenticated user owns.
 * A restaurant_owner with two restaurants should only see the one they manage.
 * This route fetches their restaurant_id from the DB and enforces it.
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const guard = await requireRole('restaurant_owner');
  if (guard.response) return guard.response;

  const supabase = await createClient();

  // ── Resolve which restaurant this owner manages ───────────────────────────
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('owner_id', guard.user.id)
    .single();

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: 'No restaurant found for this account' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'pending' | 'paid'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(20, parseInt(searchParams.get('limit') ?? '10'));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('settlements')
    .select(
      'id, period_start, period_end, order_count, total_gmv, total_commission, net_payout, status, paid_at, payment_reference',
      { count: 'exact' }
    )
    .eq('restaurant_id', restaurant.id)   // ← object-level auth: only their restaurant
    .order('period_end', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Compute summary stats ─────────────────────────────────────────────────
  const { data: summary } = await supabase
    .from('settlements')
    .select('status, net_payout')
    .eq('restaurant_id', restaurant.id);

  const stats = (summary ?? []).reduce(
    (acc, s) => {
      if (s.status === 'pending') acc.pending_payout += s.net_payout;
      if (s.status === 'paid')    acc.total_paid += s.net_payout;
      return acc;
    },
    { pending_payout: 0, total_paid: 0 }
  );

  return NextResponse.json({
    restaurant: { id: restaurant.id, name: restaurant.name },
    summary: stats,
    settlements: data,
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}
