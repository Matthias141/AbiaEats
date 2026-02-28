import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const guard = await requireAuth();
  if (guard.response) return guard.response;

  const supabase = await createClient();

  const [profileResult, ordersResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, phone, default_address, created_at')
      .eq('id', guard.user.id)
      .single(),
    supabase
      .from('orders')
      .select('id, order_number, status, subtotal, delivery_fee, total, delivery_address, customer_phone, customer_name, notes, created_at')
      .eq('customer_id', guard.user.id)
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    data_controller: 'AbiaEats',
    regulation: 'NDPR 2019',
    subject: profileResult.data,
    orders: ordersResult.data || [],
  }, {
    headers: {
      'Content-Disposition': `attachment; filename="abiaeats-data-export-${guard.user.id}.json"`,
    },
  });
}