import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const guard = await requireRole('restaurant_owner', 'admin');
  if (guard.response) return guard.response;

  const supabase = await createClient();

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', guard.user.id)
    .single();

  if (error || !restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  return NextResponse.json({ restaurant });
}
