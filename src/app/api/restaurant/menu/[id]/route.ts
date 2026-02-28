import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { updateMenuItemSchema } from '@/lib/validations';

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireRole('restaurant_owner', 'admin');
  if (guard.response) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateMenuItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createClient();

  // Ownership check via join
  const { data: item } = await supabase
    .from('menu_items')
    .select('id, restaurants!inner(owner_id)')
    .eq('id', id)
    .single();

  const owner = (item?.restaurants as unknown as { owner_id: string } | null)?.owner_id;
  if (!item || (owner !== guard.user.id && guard.role !== 'admin')) {
    return NextResponse.json({ error: 'Not found or not yours' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('menu_items')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Params) {
  const guard = await requireRole('restaurant_owner', 'admin');
  if (guard.response) return guard.response;

  const { id } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('menu_items')
    .select('id, restaurants!inner(owner_id)')
    .eq('id', id)
    .single();

  const owner = (item?.restaurants as unknown as { owner_id: string } | null)?.owner_id;
  if (!item || (owner !== guard.user.id && guard.role !== 'admin')) {
    return NextResponse.json({ error: 'Not found or not yours' }, { status: 403 });
  }

  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
