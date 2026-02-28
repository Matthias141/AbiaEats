import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { createMenuItemSchema } from '@/lib/validations';

// GET /api/restaurant/menu — list menu items for the owner's restaurant
export async function GET() {
  const guard = await requireRole('restaurant_owner', 'admin');
  if (guard.response) return guard.response;

  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', guard.user.id)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

// POST /api/restaurant/menu — create menu item
export async function POST(request: Request) {
  const guard = await requireRole('restaurant_owner', 'admin');
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = createMenuItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createClient();

  // Verify the restaurant belongs to this owner
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', parsed.data.restaurant_id)
    .eq('owner_id', guard.user.id)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found or not yours' }, { status: 403 });

  const { data, error } = await supabase
    .from('menu_items')
    .insert(parsed.data)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
