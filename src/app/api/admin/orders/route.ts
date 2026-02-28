import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const guard = await requireRole('admin');
  if (guard.response) return guard.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  let query = supabase
    .from('orders')
    .select(`
      *,
      profiles!orders_customer_id_fkey(full_name, email, phone),
      restaurants(name, phone)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders: data, total: count, page, limit });
}
