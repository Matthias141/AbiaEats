import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { confirmPaymentSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const guard = await requireRole('admin');
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = confirmPaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('status, customer_id, total')
    .eq('id', parsed.data.order_id)
    .single();

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'awaiting_payment') {
    return NextResponse.json({ error: `Order is ${order.status}, not awaiting payment` }, { status: 422 });
  }

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      payment_reference: parsed.data.payment_reference ?? null,
      payment_confirmed_by: guard.user.id,
      payment_confirmed_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.order_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  await supabase.rpc('log_audit', {
    p_action: 'payment_confirmed',
    p_actor_id: guard.user.id,
    p_target_type: 'orders',
    p_target_id: parsed.data.order_id,
    p_ip_address: ip,
    p_metadata: { total: order.total, payment_reference: parsed.data.payment_reference },
  });

  return NextResponse.json({ ok: true });
}
