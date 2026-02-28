import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { updateOrderStatusSchema } from '@/lib/validations';
import { canTransition } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const guard = await requireRole('admin');
  if (guard.response) return guard.response;

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`*, profiles!orders_customer_id_fkey(full_name, email, phone), restaurants(name, phone, address), order_items(*)`)
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireRole('admin');
  if (guard.response) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createClient();

  // Fetch current order
  const { data: order } = await supabase.from('orders').select('status').eq('id', id).single();
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // Validate transition
  if (!canTransition(order.status as OrderStatus, parsed.data.status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${order.status} to ${parsed.data.status}` },
      { status: 422 }
    );
  }

  // Build update payload with timestamp
  const timestampField: Record<string, string> = {
    confirmed: 'confirmed_at',
    preparing: 'preparing_at',
    out_for_delivery: 'out_for_delivery_at',
    delivered: 'delivered_at',
    cancelled: 'cancelled_at',
  };
  const updatePayload: Record<string, unknown> = { status: parsed.data.status };
  if (timestampField[parsed.data.status]) {
    updatePayload[timestampField[parsed.data.status]] = new Date().toISOString();
  }
  if (parsed.data.status === 'cancelled' && parsed.data.cancellation_reason) {
    updatePayload.cancellation_reason = parsed.data.cancellation_reason;
  }

  const { error } = await supabase.from('orders').update(updatePayload).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  await supabase.rpc('log_audit', {
    p_action: 'order_status_updated',
    p_actor_id: guard.user.id,
    p_target_type: 'orders',
    p_target_id: id,
    p_ip_address: ip,
    p_metadata: { from: order.status, to: parsed.data.status },
  });

  return NextResponse.json({ ok: true });
}
